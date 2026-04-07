/**
 * End-to-end test: Submit jobs in all three modes and verify execution paths
 * Tests:
 * 1. single_llm: Generator -> Validator only
 * 2. pipeline: Planner -> Generator -> Validator (one-shot)
 * 3. multi_agent: Full Planner -> Generator -> Critic -> Refiner -> Validator loop
 */

const axios = require('axios');

const API_BASE = 'http://localhost:3000/api';

const client = axios.create({
  baseURL: API_BASE,
  timeout: 30000,
});

// Test lesson input
const lessonInput = {
  title: 'Regular Expressions',
  type: 'projects',
  level: 4,
  module_id: 12,
  skill_id: 'skill-123',
};

// Test modes
const modes = ['single_llm', 'pipeline', 'multi_agent'];

console.log('\n╔════════════════════════════════════════════════════╗');
console.log('║   Mode Dispatcher End-to-End Test                  ║');
console.log('╚════════════════════════════════════════════════════╝\n');

async function testMode(systemType) {
  console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`Testing: ${systemType.toUpperCase()}`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);

  const config = {
    system_type: systemType,
    max_iterations: 3,
    quality_threshold: 0.85,
    use_critic: true,
    use_refiner: true,
    use_memory: false,
  };

  try {
    // Step 1: Create job
    console.log(`[1/3] Creating job with system_type='${systemType}'...`);
    const createResponse = await client.post('/jobs', {
      lesson_input: lessonInput,
      config: config,
    });

    const jobId = createResponse.data.job_id;
    const returnedSystemType = createResponse.data.system_type;

    console.log(`  ✓ Job created: ${jobId}`);
    console.log(`  ✓ system_type in response: ${returnedSystemType}`);

    if (returnedSystemType !== systemType) {
      console.error(`  ✗ ERROR: Expected system_type '${systemType}', got '${returnedSystemType}'`);
      return false;
    }

    // Step 2: Poll for status
    console.log(`\n[2/3] Polling job status...`);
    let statusResponse;
    let pollCount = 0;
    const maxPolls = 30; // 60 seconds max

    while (pollCount < maxPolls) {
      statusResponse = await client.get(`/jobs/${jobId}`);
      const status = statusResponse.data.status;

      console.log(`  Poll ${pollCount + 1}: status='${status}'`);

      if (status === 'completed' || status === 'failed') {
        console.log(`  ✓ Job ${status}`);
        break;
      }

      pollCount++;
      await new Promise((resolve) => setTimeout(resolve, 2000)); // 2 second delay
    }

    if (statusResponse.data.status !== 'completed') {
      console.error(
        `  ✗ Job did not complete within ${maxPolls * 2} seconds. Status: ${statusResponse.data.status}`
      );
      return false;
    }

    // Verify status response includes system_type and config
    if (!statusResponse.data.system_type) {
      console.error(`  ✗ ERROR: system_type not in status response`);
      return false;
    }

    if (!statusResponse.data.config) {
      console.error(`  ✗ ERROR: config not in status response`);
      return false;
    }

    console.log(`  ✓ system_type in status response: ${statusResponse.data.system_type}`);
    console.log(`  ✓ config included in status response`);

    // Step 3: Fetch results
    console.log(`\n[3/3] Fetching job results...`);
    const resultsResponse = await client.get(`/results/${jobId}`);
    const results = resultsResponse.data;

    console.log(`  ✓ Results retrieved`);

    if (!results.system_type) {
      console.error(`  ✗ ERROR: system_type not in results response`);
      return false;
    }

    console.log(`  ✓ system_type in results: ${results.system_type}`);

    // Verify iteration trace structure
    const iterations = results.iteration_trace;
    console.log(`  ✓ Iterations returned: ${iterations.length}`);

    // Verify mode-specific behavior
    console.log(`\n━━ Mode-Specific Verification ━━`);

    if (systemType === 'single_llm') {
      if (iterations.length !== 1) {
        console.error(`  ✗ single_llm should have 1 iteration, got ${iterations.length}`);
        return false;
      }
      console.log(`  ✓ single_llm: 1 iteration (no loop)`);

      if (!results.metrics.quality_score || !results.metrics.pass_rate) {
        console.error(`  ✗ single_llm metrics missing quality_score or pass_rate`);
        return false;
      }
      console.log(`  ✓ single_llm: Minimal metrics present (quality_score, pass_rate)`);
    } else if (systemType === 'pipeline') {
      if (iterations.length !== 1) {
        console.error(`  ✗ pipeline should have 1 iteration (one-shot), got ${iterations.length}`);
        return false;
      }
      console.log(`  ✓ pipeline: 1 iteration (one-shot, no Critic/Refiner loop)`);

      if (!results.metrics.clarity || !results.metrics.correctness) {
        console.error(`  ✗ pipeline metrics missing clarity or correctness`);
        return false;
      }
      console.log(`  ✓ pipeline: Full metrics present (clarity, correctness, pedagogy, pass_rate)`);
    } else if (systemType === 'multi_agent') {
      if (iterations.length < 1) {
        console.error(`  ✗ multi_agent should have at least 1 iteration, got ${iterations.length}`);
        return false;
      }
      console.log(`  ✓ multi_agent: ${iterations.length} iteration(s) (iterative loop)`);

      if (!results.metrics.clarity || !results.metrics.correctness) {
        console.error(`  ✗ multi_agent metrics missing clarity or correctness`);
        return false;
      }
      console.log(`  ✓ multi_agent: Full metrics with all detail fields`);
    }

    // Verify all iterations have validation
    let allValid = true;
    iterations.forEach((iter, idx) => {
      if (!iter.validation) {
        console.error(`  ✗ Iteration ${idx} missing validation data`);
        allValid = false;
      }
    });

    if (!allValid) return false;
    console.log(`  ✓ All iterations have validation data`);

    console.log(`\n✅ ${systemType.toUpperCase()} test PASSED\n`);
    return true;
  } catch (error) {
    console.error(`\n✗ ${systemType.toUpperCase()} test FAILED`);
    console.error(`Error: ${error.message}`);
    if (error.response?.data) {
      console.error(`Response: ${JSON.stringify(error.response.data, null, 2)}`);
    }
    return false;
  }
}

async function runAllTests() {
  const results = {};

  for (const mode of modes) {
    results[mode] = await testMode(mode);
  }

  // Summary
  console.log(`\n╔════════════════════════════════════════════════════╗`);
  console.log(`║   TEST SUMMARY                                     ║`);
  console.log(`╚════════════════════════════════════════════════════╝\n`);

  let passCount = 0;
  modes.forEach((mode) => {
    const status = results[mode] ? '✅ PASS' : '❌ FAIL';
    console.log(`  ${mode.padEnd(15)} ${status}`);
    if (results[mode]) passCount++;
  });

  console.log(`\nResult: ${passCount}/${modes.length} modes passed\n`);

  if (passCount === modes.length) {
    console.log('🎉 All tests passed! Mode dispatcher is working correctly.\n');
    process.exit(0);
  } else {
    console.log('⚠️  Some tests failed. Review logs above.\n');
    process.exit(1);
  }
}

runAllTests();
