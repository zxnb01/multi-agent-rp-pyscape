import { createContext, useContext, useState, useEffect } from 'react';
import { jobAPI } from '../services/api';

const JobContext = createContext();

export const JobProvider = ({ children }) => {
  const [jobId, setJobId] = useState(null);
  const [status, setStatus] = useState(null);
  const [systemType, setSystemType] = useState('multi_agent');
  const [iterations, setIterations] = useState([]);
  const [metrics, setMetrics] = useState(null);
  const [finalOutput, setFinalOutput] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  // Load systemType from localStorage on mount
  useEffect(() => {
    const savedSystemType = localStorage.getItem('systemType');
    if (savedSystemType) {
      setSystemType(savedSystemType);
    }
  }, []);

  // Persist systemType to localStorage when it changes
  useEffect(() => {
    localStorage.setItem('systemType', systemType);
  }, [systemType]);

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

        // Extract and verify system_type from backend response
        if (jobStatus.system_type) {
          setSystemType(jobStatus.system_type);
        }

        // If completed, fetch results
        if (jobStatus.status === 'completed') {
          const results = await jobAPI.getResults(jobId);
          setFinalOutput(results.final_output);
          setMetrics(results.metrics);
          setIterations(results.iteration_trace);

          // Verify system_type from results response
          if (results.system_type) {
            setSystemType(results.system_type);
          }
        }
      } catch (err) {
        console.error('Polling error:', err);
        setError(err.response?.data?.error || err.message);
      }
    }, 2000); // Poll every 2 seconds

    return () => clearInterval(interval);
  }, [jobId, status]);

  const createJob = async (lesson_input, config = {}) => {
    try {
      setLoading(true);
      setError(null);

      // Ensure config includes systemType
      const finalConfig = {
        ...config,
        system_type: systemType,
      };

      const result = await jobAPI.createJob(lesson_input, finalConfig);
      setJobId(result.job_id);
      setStatus('pending');

      // Extract system_type from creation response
      if (result.system_type) {
        setSystemType(result.system_type);
      }
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
        systemType,
        setSystemType,
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
