const { v4: uuidv4 } = require('uuid');
const supabaseClient = require('../services/supabaseClient');
const jobExecutor = require('../services/jobExecutor');

/**
 * POST /jobs - Create and start a new job
 */
exports.createJob = async (req, res) => {
  try {
    const { lesson_input, config } = req.body;

    if (!lesson_input) {
      return res.status(400).json({ error: 'Missing lesson_input' });
    }

    // Set default config
    const defaultConfig = {
      system_type: 'multi_agent',
      max_iterations: 3,
      quality_threshold: 0.85,
      use_critic: true,
      use_refiner: true,
      use_memory: false,
    };

    const finalConfig = { ...defaultConfig, ...config };

    // Create job record in Supabase
    const job = await supabaseClient.createJob(lesson_input, finalConfig);

    // Start execution asynchronously (don't wait)
    jobExecutor.executeAsync(job.id, lesson_input, finalConfig).catch((error) => {
      console.error(`Error executing job ${job.id}:`, error);
    });

    res.json({
      job_id: job.id,
      status: 'pending',
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
      error: job.error || null,
      created_at: job.created_at,
      updated_at: job.updated_at,
    });
  } catch (error) {
    console.error('Error fetching job:', error);
    res.status(404).json({ error: 'Job not found' });
  }
};
