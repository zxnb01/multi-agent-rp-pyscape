-- Create jobs table
CREATE TABLE IF NOT EXISTS jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_input JSONB NOT NULL,
  config JSONB NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  error TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create execution_results table
CREATE TABLE IF NOT EXISTS execution_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  final_output JSONB NOT NULL,
  metrics JSONB NOT NULL,
  iteration_trace JSONB NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create iteration_metrics table
CREATE TABLE IF NOT EXISTS iteration_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  iteration INTEGER NOT NULL,
  score FLOAT NOT NULL,
  metrics JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_jobs_status ON jobs(status);
CREATE INDEX idx_execution_results_job_id ON execution_results(job_id);
CREATE INDEX idx_iteration_metrics_job_id ON iteration_metrics(job_id);
