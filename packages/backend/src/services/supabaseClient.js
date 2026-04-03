const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing SUPABASE_URL or SUPABASE_KEY in environment');
}

const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * Supabase connection helper
 */
class SupabaseClient {
  /**
   * Create a new job record
   */
  async createJob(lesson_input, config) {
    const { data, error } = await supabase
      .from('jobs')
      .insert([
        {
          lesson_input,
          config,
          status: 'pending',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ])
      .select();

    if (error) throw error;
    return data[0];
  }

  /**
   * Get job by ID
   */
  async getJobById(job_id) {
    const { data, error } = await supabase
      .from('jobs')
      .select('*')
      .eq('id', job_id)
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Update job status
   */
  async updateJobStatus(job_id, status, error_message = null) {
    const update = {
      status,
      updated_at: new Date().toISOString(),
    };

    if (error_message) {
      update.error = error_message;
    }

    const { data, error } = await supabase
      .from('jobs')
      .update(update)
      .eq('id', job_id)
      .select();

    if (error) throw error;
    return data[0];
  }

  /**
   * Store execution results
   */
  async saveResults(job_id, final_output, metrics, iteration_trace) {
    const { data, error } = await supabase
      .from('execution_results')
      .insert([
        {
          job_id,
          final_output,
          metrics,
          iteration_trace,
          created_at: new Date().toISOString(),
        },
      ])
      .select();

    if (error) throw error;
    return data[0];
  }

  /**
   * Get execution results for a job
   */
  async getResults(job_id) {
    const { data, error } = await supabase
      .from('execution_results')
      .select('*')
      .eq('job_id', job_id)
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Save iteration metrics
   */
  async saveIterationMetrics(job_id, iteration, score, metrics) {
    const { data, error } = await supabase
      .from('iteration_metrics')
      .insert([
        {
          job_id,
          iteration,
          score,
          metrics,
          created_at: new Date().toISOString(),
        },
      ])
      .select();

    if (error) throw error;
    return data[0];
  }
}

module.exports = new SupabaseClient();
