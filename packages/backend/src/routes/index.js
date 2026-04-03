const express = require('express');
const router = express.Router();

const jobController = require('../controllers/jobController');
const resultsController = require('../controllers/resultsController');

// Job endpoints
router.post('/jobs', jobController.createJob);
router.get('/jobs/:id', jobController.getJobStatus);

// Results endpoints
router.get('/results/:job_id', resultsController.getResults);

module.exports = router;
