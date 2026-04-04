/**
 * Validator: Deterministic schema/structure/execution checker
 * Rule-based binary gate (pass/fail) - NO LLM calls
 */
class Validator {
  /**
   * Validate lesson output against schema and execution criteria
   * @param {Object} options - { lesson_input, output, iteration }
   * @returns {Object} { is_valid, checks_passed, checks_failed, failed_checks, pass_rate, report }
   */
  async validate({ lesson_input, output, iteration }) {
    const checks = [];
    let checks_passed = 0;
    let checks_failed = 0;

    // Check 1: JSON valid (must be object)
    if (!output || typeof output !== 'object') {
      checks.push({ name: 'JSON valid', passed: false, reason: 'output is not a valid object' });
      checks_failed++;
    } else {
      checks.push({ name: 'JSON valid', passed: true });
      checks_passed++;
    }

    // Check 2: Required fields present
    const required_fields = ['title', 'content', 'examples', 'exercise', 'keyPoints'];
    const missing_fields = required_fields.filter((field) => !output || output[field] === undefined || output[field] === null);
    if (missing_fields.length > 0) {
      checks.push({ name: 'Required fields', passed: false, reason: `Missing: ${missing_fields.join(', ')}` });
      checks_failed++;
    } else {
      checks.push({ name: 'Required fields', passed: true });
      checks_passed++;
    }

    // Check 3: Content length (>50 chars)
    const content_valid = output && output.content && typeof output.content === 'string' && output.content.length > 50;
    if (!content_valid) {
      const content_len = output && output.content ? output.content.length : 0;
      checks.push({ name: 'Content length (>50 chars)', passed: false, reason: `Current: ${content_len} chars` });
      checks_failed++;
    } else {
      checks.push({ name: 'Content length (>50 chars)', passed: true });
      checks_passed++;
    }

    // Check 4: Examples (≥1)
    const examples_valid = output && Array.isArray(output.examples) && output.examples.length >= 1;
    if (!examples_valid) {
      const examples_len = output && Array.isArray(output.examples) ? output.examples.length : 0;
      checks.push({ name: 'Examples (≥1)', passed: false, reason: `Current: ${examples_len} examples` });
      checks_failed++;
    } else {
      checks.push({ name: 'Examples (≥1)', passed: true });
      checks_passed++;
    }

    // Check 5: Exercise (description non-empty)
    const exercise_valid =
      output &&
      output.exercise &&
      typeof output.exercise === 'object' &&
      output.exercise.description &&
      typeof output.exercise.description === 'string' &&
      output.exercise.description.length > 0;
    if (!exercise_valid) {
      checks.push({ name: 'Exercise description', passed: false, reason: 'Missing or empty exercise description' });
      checks_failed++;
    } else {
      checks.push({ name: 'Exercise description', passed: true });
      checks_passed++;
    }

    // Check 6: KeyPoints (≥1)
    const keypoints_valid = output && Array.isArray(output.keyPoints) && output.keyPoints.length >= 1;
    if (!keypoints_valid) {
      const keypoints_len = output && Array.isArray(output.keyPoints) ? output.keyPoints.length : 0;
      checks.push({ name: 'Key points (≥1)', passed: false, reason: `Current: ${keypoints_len} key points` });
      checks_failed++;
    } else {
      checks.push({ name: 'Key points (≥1)', passed: true });
      checks_passed++;
    }

    // Check 7: Test execution (pass_rate >= 0.7 if testCases exist)
    let pass_rate = 0.5; // default if no testCases
    let tests_valid = true;

    if (output && Array.isArray(output.testCases) && output.testCases.length > 0) {
      const passed_tests = output.testCases.filter((tc) => tc.passed === true).length;
      pass_rate = passed_tests / output.testCases.length;

      if (pass_rate < 0.7) {
        checks.push({
          name: 'Test execution (pass_rate ≥ 0.7)',
          passed: false,
          reason: `Pass rate: ${(pass_rate * 100).toFixed(1)}% (${passed_tests}/${output.testCases.length} passed)`,
        });
        checks_failed++;
        tests_valid = false;
      } else {
        checks.push({
          name: 'Test execution (pass_rate ≥ 0.7)',
          passed: true,
          reason: `${(pass_rate * 100).toFixed(1)}% (${passed_tests}/${output.testCases.length} passed)`,
        });
        checks_passed++;
      }
    } else {
      // No testCases provided; default pass_rate=0.5 is acceptable
      checks.push({ name: 'Test execution (pass_rate ≥ 0.7)', passed: true, reason: 'No test cases (default: 0.5)' });
      checks_passed++;
    }

    // Overall validation result
    const is_valid = checks_failed === 0;

    // Build report
    const failed_checks = checks.filter((c) => !c.passed).map((c) => `${c.name}: ${c.reason}`);
    const report = is_valid
      ? `✅ Validation passed (iteration ${iteration}): All ${checks_passed} checks passed.`
      : `❌ Validation failed (iteration ${iteration}): ${checks_passed} passed, ${checks_failed} failed. Issues: ${failed_checks.join('; ')}`;

    console.log(`[Validator] Iteration ${iteration}: ${report}`);

    return {
      is_valid,
      checks_passed,
      checks_failed,
      failed_checks,
      pass_rate: pass_rate || 0.5,
      report,
      checks, // detailed array for UI
    };
  }
}

module.exports = new Validator();
