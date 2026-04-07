const { v4: uuidv4 } = require('uuid');
const supabaseClient = require('../services/supabaseClient');
const jobExecutor = require('../services/jobExecutor');

// Valid system_type values
const VALID_SYSTEM_TYPES = ['single_llm', 'pipeline', 'multi_agent'];

/**
 * Normalize config based on system_type, stripping irrelevant ablations
 */
function normalizeConfig(baseConfig) {
  const systemType = baseConfig.system_type || 'multi_agent';

  // Validate system_type
  if (!VALID_SYSTEM_TYPES.includes(systemType)) {
    throw new Error(`Invalid system_type: ${systemType}. Must be one of: ${VALID_SYSTEM_TYPES.join(', ')}`);
  }

  const normalized = {
    system_type: systemType,
    max_iterations: baseConfig.max_iterations ?? 3,
    quality_threshold: baseConfig.quality_threshold ?? 0.85,
    use_critic: baseConfig.use_critic ?? true,
    use_refiner: baseConfig.use_refiner ?? true,
    use_memory: baseConfig.use_memory ?? false,
  };

  // Strip irrelevant ablations by mode
  if (systemType === 'single_llm') {
    // single_llm: skip Planner, run Generator once, then Validator
    // max_iterations forced to 1, ablations ignored
    normalized.max_iterations = 1;
    normalized.use_critic = false; // stripped
    normalized.use_refiner = false; // stripped
  } else if (systemType === 'pipeline') {
    // pipeline: Planner -> Generator once -> Validator, no critic iteration
    normalized.use_critic = false; // stripped
    normalized.use_refiner = true; // kept for single pass
  }
  // multi_agent: keep all ablations as-is

  return normalized;
}

/**
 * POST /jobs - Create and start a new job
 */
exports.createJob = async (req, res) => {
  try {
    const { lesson_input, config } = req.body;

    if (!lesson_input) {
      return res.status(400).json({ error: 'Missing lesson_input' });
    }

    // Set default config and normalize by system_type
    const defaultConfig = {
      system_type: 'multi_agent',
      max_iterations: 3,
      quality_threshold: 0.85,
      use_critic: true,
      use_refiner: true,
      use_memory: false,
    };

    const baseConfig = { ...defaultConfig, ...config };
    let finalConfig;

    try {
      finalConfig = normalizeConfig(baseConfig);
    } catch (error) {
      return res.status(400).json({ error: error.message });
    }

    // Create job record in Supabase
    const job = await supabaseClient.createJob(lesson_input, finalConfig);

    console.log(`[Job ${job.id}] Created with system_type='${finalConfig.system_type}'`);

    // Start execution asynchronously (don't wait)
    jobExecutor.executeAsync(job.id, lesson_input, finalConfig).catch((error) => {
      console.error(`Error executing job ${job.id}:`, error);
    });

    res.json({
      job_id: job.id,
      status: 'pending',
      system_type: finalConfig.system_type,
      message: 'Job created and queued for execution',
    });
  } catch (error) {
    console.error('Error creating job:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * GET /jobs/:id - Get job status
 */
exports.getJobStatus = async (req, res) => {
  try {
    const { id } = req.params;

    const job = await supabaseClient.getJobById(id);

    res.json({
      job_id: job.id,
      status: job.status,
      system_type: job.config?.system_type || 'multi_agent',
      config: job.config,
      error: job.error || null,
      created_at: job.created_at,
      updated_at: job.updated_at,
    });
  } catch (error) {
    console.error('Error fetching job:', error);
    res.status(404).json({ error: 'Job not found' });
  }
};
