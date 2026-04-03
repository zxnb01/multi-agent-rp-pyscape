import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api';

const apiClient = axios.create({
  baseURL: API_BASE,
});

export const jobAPI = {
  /**
   * Create a new job
   */
  createJob: async (lesson_input, config) => {
    const response = await apiClient.post('/jobs', {
      lesson_input,
      config,
    });
    return response.data;
  },

  /**
   * Get job status
   */
  getJobStatus: async (job_id) => {
    const response = await apiClient.get(`/jobs/${job_id}`);
    return response.data;
  },

  /**
   * Get job results
   */
  getResults: async (job_id) => {
    const response = await apiClient.get(`/results/${job_id}`);
    return response.data;
  },
};
