const axios = require('axios');
const supabaseClient = require('./supabaseClient');

const AGENT_SERVICE_URL = process.env.AGENT_SERVICE_URL || 'http://localhost:5000';

/**
 * Job executor orchestrates job execution
 * Calls agent service and stores results in Supabase
 */
class JobExecutor {
  /**
   * Execute a job asynchronously
   */
  async executeAsync(job_id, lesson_input, config) {
    try {
      // Update status to running
      await supabaseClient.updateJobStatus(job_id, 'running');
      console.log(`[${job_id}] Job started`);

      // Call agent service
      const agentResponse = await this._callAgentService({
        job_id,
        lesson_input,
        config,
      });

      // Save results to Supabase
      await supabaseClient.saveResults(
        job_id,
        agentResponse.final_output,
        agentResponse.metrics,
        agentResponse.iteration_trace
      );

      // Update job status to completed
      await supabaseClient.updateJobStatus(job_id, 'completed');
      console.log(`[${job_id}] Job completed successfully`);
    } catch (error) {
      console.error(`[${job_id}] Job failed:`, error.message);
      // Update job status with error
      await supabaseClient.updateJobStatus(job_id, 'failed', error.message);
    }
  }

  /**
   * Call agent service HTTP endpoint
   */
  async _callAgentService({ job_id, lesson_input, config }) {
    try {
      const response = await axios.post(`${AGENT_SERVICE_URL}/execute`, {
        job_id,
        lesson_input,
        config,
      });

      return response.data;
    } catch (error) {
      throw new Error(`Agent service error: ${error.message}`);
    }
  }
}

module.exports = new JobExecutor();
