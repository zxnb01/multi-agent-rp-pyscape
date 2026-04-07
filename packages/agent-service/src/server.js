require('dotenv').config();
const express = require('express');
const cors = require('express').json; // basic, we'll add cors if needed
const { v4: uuidv4 } = require('uuid');

const app = express();
app.use(express.json());

const orchestrator = require('./pipeline/orchestrator');

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'agent-service' });
});

// Execute job - receives lesson_input, config
// Returns: final_output, metrics, iteration_trace
app.post('/execute', async (req, res) => {
  try {
    const { job_id, lesson_input, config } = req.body;

    if (!job_id || !lesson_input || !config) {
      return res.status(400).json({ error: 'Missing required fields: job_id, lesson_input, config' });
    }

    // Run orchestrator pipeline
    const result = await orchestrator.run({
      job_id,
      lesson_input,
      config,
    });

    res.json(result);
  } catch (error) {
    console.error('Error executing job:', error);
    res.status(500).json({ error: error.message });
  }
});

const PORT = process.env.PORT || 5000;
const server = app.listen(PORT, () => {
  console.log(`Agent service listening on port ${PORT}`);
});

server.on('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    console.error(`Port ${PORT} is already in use. Stop the existing agent-service process or set PORT to a free port.`);
    process.exit(1);
  }

  throw error;
});

const shutdown = (signal) => {
  console.log(`Received ${signal}, closing agent service...`);
  server.close(() => {
    process.exit(0);
  });
};

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
