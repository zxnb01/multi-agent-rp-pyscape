const supabaseClient = require('../services/supabaseClient');

/**
 * GET /results/:job_id - Get job results
 */
exports.getResults = async (req, res) => {
  try {
    const { job_id } = req.params;

    // Get job to check status
    const job = await supabaseClient.getJobById(job_id);

    if (job.status !== 'completed') {
      return res.status(400).json({
        error: `Job not completed. Current status: ${job.status}`,
        job_id,
        status: job.status,
      });
    }

    // Get execution results
    const results = await supabaseClient.getResults(job_id);

    res.json({
      job_id,
      status: job.status,
      final_output: results.final_output,
      metrics: results.metrics,
      iteration_trace: results.iteration_trace,
      created_at: results.created_at,
    });
  } catch (error) {
    console.error('Error fetching results:', error);
    res.status(404).json({ error: 'Results not found' });
  }
};
