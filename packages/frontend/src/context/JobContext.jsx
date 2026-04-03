import { createContext, useContext, useState, useEffect } from 'react';
import { jobAPI } from '../services/api';

const JobContext = createContext();

export const JobProvider = ({ children }) => {
  const [jobId, setJobId] = useState(null);
  const [status, setStatus] = useState(null);
  const [iterations, setIterations] = useState([]);
  const [metrics, setMetrics] = useState(null);
  const [finalOutput, setFinalOutput] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  // Poll for job status and results
  useEffect(() => {
    if (!jobId || status === 'completed' || status === 'failed') {
      return;
    }

    const interval = setInterval(async () => {
      try {
        // Poll job status
        const jobStatus = await jobAPI.getJobStatus(jobId);
        setStatus(jobStatus.status);
        setError(jobStatus.error);

        // If completed, fetch results
        if (jobStatus.status === 'completed') {
          const results = await jobAPI.getResults(jobId);
          setFinalOutput(results.final_output);
          setMetrics(results.metrics);
          setIterations(results.iteration_trace);
        }
      } catch (err) {
        console.error('Polling error:', err);
        setError(err.response?.data?.error || err.message);
      }
    }, 2000); // Poll every 2 seconds

    return () => clearInterval(interval);
  }, [jobId, status]);

  const createJob = async (lesson_input, config) => {
    try {
      setLoading(true);
      setError(null);
      const result = await jobAPI.createJob(lesson_input, config);
      setJobId(result.job_id);
      setStatus('pending');
    } catch (err) {
      console.error('Error creating job:', err);
      setError(err.response?.data?.error || err.message);
    } finally {
      setLoading(false);
    }
  };

  const resetJob = () => {
    setJobId(null);
    setStatus(null);
    setIterations([]);
    setMetrics(null);
    setFinalOutput(null);
    setError(null);
  };

  return (
    <JobContext.Provider
      value={{
        jobId,
        status,
        iterations,
        metrics,
        finalOutput,
        error,
        loading,
        createJob,
        resetJob,
      }}
    >
      {children}
    </JobContext.Provider>
  );
};

export const useJob = () => {
  const context = useContext(JobContext);
  if (!context) {
    throw new Error('useJob must be used within JobProvider');
  }
  return context;
};
