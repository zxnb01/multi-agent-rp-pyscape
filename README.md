# PyScape UI – Multi-Agent Observability Console

**A developer-facing UI for running controlled experiments on multi-agent systems, visualizing agent execution, and comparing systems.**

---

## 🏗️ Project Structure

```
multi-agent-rp/
├── packages/
│   ├── agent-service/       # Multi-agent pipeline (Planner, Generator, Critic, Refiner)
│   ├── backend/             # Express API orchestrator
│   └── frontend/            # React/Vite UI
├── package.json             # Root monorepo config
└── README.md
```

---

## 🚀 Quick Start

### Prerequisites

- **Node.js** v18+ with npm
- **Supabase** project with tables created (see "Database Setup" below)
- **OpenRouter** API key (for LLM calls)

### 1. Install Dependencies

```bash
# Install all packages (root level)
npm install

# Or install individual packages
cd packages/agent-service && npm install
cd ../backend && npm install
cd ../frontend && npm install
```

### 2. Configure Environment Variables

#### Agent Service (`packages/agent-service/.env`)

```env
PORT=5000
OPENROUTER_API_KEY=your_openrouter_key_here
```

#### Backend (`packages/backend/.env`)

```env
PORT=3000
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your_supabase_anon_key
AGENT_SERVICE_URL=http://localhost:5000
```

#### Frontend (`packages/frontend/.env`)

```env
VITE_API_BASE_URL=http://localhost:3000/api
```

### 3. Database Setup (Supabase)

Run the SQL migration in `packages/backend/migrations/001_initial_schema.sql` in your Supabase SQL editor:

```sql
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
```

### 4. Run All Services

**Terminal 1: Agent Service**

```bash
cd packages/agent-service
npm run dev
# Output: Agent service listening on port 5000
```

**Terminal 2: Backend API**

```bash
cd packages/backend
npm run dev
# Output: Backend API listening on port 3000
```

**Terminal 3: Frontend**

```bash
cd packages/frontend
npm run dev
# Output: VITE v5.0.8 ready in NNN ms
# ➜  Local:   http://localhost:3001/
```

### 5. Open UI

Navigate to: **http://localhost:3001**

---

## 📊 API Endpoints

### Job Management

**POST /api/jobs** — Create and start a new job

```json
Request:
{
  "lesson_input": {
    "title": "Regular Expressions",
    "type": "projects",
    "level": 4,
    "module_id": 12,
    "skill_id": "skill-123"
  },
  "config": {
    "system_type": "multi_agent",
    "max_iterations": 3,
    "quality_threshold": 0.85,
    "use_critic": true,
    "use_refiner": true,
    "use_memory": false
  }
}

Response:
{
  "job_id": "uuid",
  "status": "pending"
}
```

**GET /api/jobs/:id** — Get job status

```json
Response:
{
  "job_id": "uuid",
  "status": "running",
  "created_at": "2026-04-03T...",
  "updated_at": "2026-04-03T..."
}
```

### Results

**GET /api/results/:job_id** — Get job results (only when completed)

```json
Response:
{
  "job_id": "uuid",
  "status": "completed",
  "final_output": {
    "lesson": {
      "title": "...",
      "content": "...",
      "examples": [...],
      "exercise": {...}
    }
  },
  "metrics": {
    "quality_score": 0.86,
    "clarity": 0.88,
    "correctness": 0.85,
    "pedagogy": 0.83,
    "pass_rate": 0.78,
    "iterations": 3,
    "total_latency": 14.5,
    "tokens_used": 3200
  },
  "iteration_trace": [
    { "iteration": 0, "score": 0.72, "consistency_flag": false },
    { "iteration": 1, "score": 0.80, "consistency_flag": false },
    { "iteration": 2, "score": 0.86, "consistency_flag": false }
  ]
}
```

---

## 🎯 Multi-Agent Pipeline

### Agent Service Flow

**Input:**
- `lesson_input`: Lesson metadata (title, type, level, module_id)
- `config`: Ablations and parameters (use_critic, use_refiner, max_iterations, quality_threshold)

**Pipeline:**

1. **Planner** → Generates initial plan
2. **Generator** → Creates lesson content
3. **Critic** (if enabled) → Evaluates output (hybrid scoring: LLM + heuristics + execution)
   - Consistency check: Run evaluation twice, flag if |score1 - score2| > 0.2
   - Early stopping: If score ≥ quality_threshold, stop
4. **Refiner** (if enabled) → Improves content based on feedback
5. **Repeat** → Steps 2–4 until max_iterations or quality_threshold reached

**Output:**
- `final_output`: Best lesson content
- `metrics`: Aggregated quality, clarity, correctness, pedagogy, pass_rate
- `iteration_trace`: Per-iteration scores and metrics

### Scoring Logic (Hybrid System)

```
clarity = llm_clarity - penalties
correctness = (llm_correctness * 0.6) + (pass_rate * 0.4)
pedagogy = llm_pedagogy - penalties
quality = 0.3 * clarity + 0.4 * correctness + 0.2 * pedagogy + 0.1 * pass_rate
```

**Penalties:**
- Missing examples: -0.1
- Missing exercise: -0.15
- Short explanation: -0.1

---

## 🎨 Frontend Architecture

### Components

- **Layout.jsx** → 3-panel grid (Control, Trace, Results)
- **ControlPanel.jsx** → Input + config + actions
- **ExecutionTrace.jsx** → Iteration timeline + metrics
- **ResultsPanel.jsx** → Output + metrics cards + graph
- **IterationGraph.jsx** → Recharts convergence visualization
- **MetricsCard.jsx** → Individual metric display

### State Management

**JobContext** provides:
- `jobId`, `status`, `iterations`, `metrics`, `finalOutput`, `error`
- `createJob()`, `resetJob()`

**useJob()** hook automatically:
- Polls every 2–3 seconds while job is running
- Fetches results when job completes
- Updates state in real-time

---

## 🔄 Real-Time Updates

**Polling Strategy:** Frontend polls `/jobs/:id` every 2–3 seconds while status is "running"

```javascript
// useJob.js hook
useEffect(() => {
  if (!jobId || status === 'completed' || status === 'failed') return;

  const interval = setInterval(async () => {
    const jobStatus = await jobAPI.getJobStatus(jobId);
    setStatus(jobStatus.status);

    if (jobStatus.status === 'completed') {
      const results = await jobAPI.getResults(jobId);
      setMetrics(results.metrics);
      setIterations(results.iteration_trace);
    }
  }, 2000);

  return () => clearInterval(interval);
}, [jobId, status]);
```

---

## 🧪 Testing

### Manual E2E Test

1. **Start all services** (see "Run All Services" above)
2. **Open frontend** at http://localhost:3001
3. **Configure job:**
   - Enter title: "Regular Expressions"
   - Select level: L4 (Advanced)
   - Toggle: Use Critic ✓, Use Refiner ✓
   - Set iterations: 3, threshold: 0.85
4. **Click "Run Job"**
5. **Observe:**
   - Execution Trace updates with iterations
   - Scores improve each iteration (convergence)
   - Results panel populates on completion
   - Iteration graph shows line chart
6. **Verify metrics** are non-null and reasonable (0–1 for scores)

### Expected Output

- **Iterations:** 3 (or fewer if early stopped)
- **Score progression:** 0.72 → 0.80 → 0.86 (improving each iteration)
- **Consistency flag:** Should be false for stable evaluations
- **Metrics:** Quality 0.86, Clarity 0.88, Correctness 0.85, Pedagogy 0.83, Pass Rate 0.78

---

## 🛠️ Development Notes

### Agent Service

- Currently uses mock LLM calls with simulated delays (see `_callLLM()`)
- To integrate real OpenRouter calls:
  1. Update `_callLLM()` methods in each agent
  2. Use axios to POST to OpenRouter API
  3. Replace mock scoring with real LLM evaluation

### Backend

- Uses Supabase for persistence
- Job execution is async (doesn't block the response)
- Error states stored in job record

### Frontend

- Uses React Context for state management (no Redux)
- Tailwind CSS for styling
- Recharts for visualization
- Axios for HTTP client

---

## 📋 MVP Scope

**Included:**
- ✅ Control panel (inputs, config, toggles)
- ✅ Execution trace (iteration timeline, metrics)
- ✅ Iteration graph (convergence visualization)
- ✅ Metrics cards (quality, clarity, correctness, pedagogy, pass_rate)
- ✅ Real-time polling (2–3 sec updates)

**Excluded (for future):**
- ❌ Ablation comparison UI (side-by-side with/without critic)
- ❌ Failure inspector (error diagnostics)
- ❌ Logs viewer (raw JSON logs)
- ❌ Baseline comparison table
- ❌ Multi-system runs

---

## 📞 Troubleshooting

### Error: "Cannot POST /api/jobs"

- Check backend is running (`npm run dev` in `packages/backend`)
- Verify frontend `.env` has correct `VITE_API_BASE_URL`

### Error: "Job not started"

- Check agent service is running (`npm run dev` in `packages/agent-service`)
- Verify backend `.env` has correct `AGENT_SERVICE_URL`

### Error: "Supabase connection failed"

- Verify Supabase credentials in backend `.env`
- Confirm tables exist (run migration SQL)

### UI not updating

- Check browser console for errors
- Verify polling is active (look for network requests in DevTools)
- Check job status: navigate to `http://localhost:3000/api/jobs/:id`

---

## 📝 Summary

**PyScape UI** provides a complete observability platform for multi-agent systems:

1. **Agent Service** runs the pipeline (Planner → Generator → Critic → Refiner)
2. **Backend API** orchestrates jobs and stores results in Supabase
3. **Frontend UI** provides real-time visualization of execution, metrics, and convergence

**Key Features:**
- Hybrid scoring (LLM + heuristics + execution)
- Early stopping (saves cost/latency)
- Consistency checking (detects evaluation instability)
- Real-time polling (2–3 sec updates)
- Convergence visualization (iteration graph)

**Next Steps:**
- Integrate real OpenRouter API calls in agent service
- Connect to real multi-agent system (replace mocks)
- Add ablation comparison UI for research insights

---

Generated: April 3, 2026
