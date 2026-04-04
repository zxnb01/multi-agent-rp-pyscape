const Planner = require('../agents/Planner');
const Generator = require('../agents/Generator');
const Critic = require('../agents/Critic');
const Refiner = require('../agents/Refiner');
const Validator = require('../agents/Validator');

/**
 * Orchestrator runs the multi-agent pipeline
 * Planner -> Generator -> Critic -> Refiner loop
 * Returns: final_output, metrics, iteration_trace
 */
class Orchestrator {
  async run({ job_id, lesson_input, config }) {
    const {
      max_iterations = 3,
      quality_threshold = 0.85,
      use_critic = true,
      use_refiner = true,
      use_memory = false,
    } = config;

    const memory = {};
    const iteration_trace = [];
    let best_output = null;
    let best_score = 0;

    console.log(`[${job_id}] Starting pipeline with config:`, config);

    try {
      // Phase 1: Planner generates initial plan
      const plan = await Planner.plan(lesson_input);
      console.log(`[${job_id}] Plan generated`);

      // Phase 2-5: Generator -> Critic -> Refiner loop
      for (let iteration = 0; iteration < max_iterations; iteration++) {
        console.log(`[${job_id}] Iteration ${iteration} starting`);

        // Generate lesson
        const generated = await Generator.generate({
          lesson_input,
          plan,
          iteration,
          memory: use_memory ? memory : {},
        });

        let output = generated.output;
        let score = generated.score || 0.5; // default score

        // Evaluate with Critic (if enabled)
        if (use_critic) {
          const evaluation = await Critic.evaluate({
            lesson_input,
            output,
            iteration,
          });
          score = evaluation.score;

          // Check consistency
          const evaluation2 = await Critic.evaluate({
            lesson_input,
            output,
            iteration,
          });
          const consistency_flag = Math.abs(evaluation.score - evaluation2.score) > 0.2;

          console.log(
            `[${job_id}] Iteration ${iteration} score: ${score.toFixed(3)}, consistent: ${!consistency_flag}`
          );

          // Store iteration data
          iteration_trace.push({
            iteration,
            score,
            consistency_flag,
            metrics: evaluation.metrics,
          });

          // Early stopping
          if (score >= quality_threshold) {
            console.log(
              `[${job_id}] Early stop at iteration ${iteration} (score ${score.toFixed(3)} >= ${quality_threshold})`
            );
            best_output = output;
            best_score = score;
            break;
          }

          // Refine if enabled and score not perfect
          if (use_refiner && score < 0.99) {
            output = await Refiner.refine({
              output,
              feedback: evaluation.feedback,
              iteration,
            });

            // Validate refined output
            const validation = await Validator.validate({
              lesson_input,
              output,
              iteration: `${iteration}-refined`,
            });

            // If validation fails and iterations remaining, try Refiner again with validation feedback
            if (!validation.is_valid && iteration < max_iterations - 1) {
              console.log(
                `[${job_id}] Iteration ${iteration} validation failed, attempting refinement with validation feedback`
              );
              output = await Refiner.refine({
                output,
                feedback: {
                  ...evaluation.feedback,
                  validation_issues: validation.failed_checks,
                  validation_report: validation.report,
                },
                iteration: `${iteration}-validation-fix`,
              });
            }

            // Re-validate after optional second refinement
            const final_validation = await Validator.validate({
              lesson_input,
              output,
              iteration: `${iteration}-final`,
            });

            // Store validation result in iteration trace
            iteration_trace[iteration_trace.length - 1].validation = final_validation;
          } else {
            // No refiner: validate raw generator output
            const validation = await Validator.validate({
              lesson_input,
              output,
              iteration,
            });
            iteration_trace[iteration_trace.length - 1].validation = validation;
          }
        } else {
          // No critic, use default score
          const validation = await Validator.validate({
            lesson_input,
            output,
            iteration,
          });
          iteration_trace.push({
            iteration,
            score,
            consistency_flag: false,
            metrics: { clarity: 0.5, correctness: 0.5, pedagogy: 0.5, pass_rate: 0, quality: 0.5 },
            validation,
          });
        }

        best_output = output;
        best_score = score;
      }

      // Calculate final metrics from iteration trace
      const final_metrics = this._aggregateMetrics(iteration_trace);

      const result = {
        job_id,
        status: 'completed',
        final_output: {
          lesson: best_output,
          source_context: {
            lesson_input,
            plan,
            config,
            iteration_trace,
          },
        },
        metrics: final_metrics,
        iteration_trace,
      };

      console.log(`[${job_id}] Pipeline completed with final score: ${best_score.toFixed(3)}`);
      return result;
    } catch (error) {
      console.error(`[${job_id}] Pipeline failed:`, error);
      throw error;
    }
  }

  _aggregateMetrics(iteration_trace) {
    if (iteration_trace.length === 0) {
      return {
        quality_score: 0,
        clarity: 0,
        correctness: 0,
        pedagogy: 0,
        pass_rate: 0,
        iterations: 0,
        total_latency: 0,
        tokens_used: 0,
      };
    }

    const last_iteration = iteration_trace[iteration_trace.length - 1];
    const metrics = last_iteration.metrics;

    return {
      quality_score: last_iteration.score,
      clarity: metrics.clarity,
      correctness: metrics.correctness,
      pedagogy: metrics.pedagogy,
      pass_rate: metrics.pass_rate,
      iterations: iteration_trace.length,
      total_latency: iteration_trace.reduce((sum, it) => sum + (it.latency || 0), 0),
      tokens_used: iteration_trace.reduce((sum, it) => sum + (it.tokens || 0), 0),
    };
  }
}

module.exports = new Orchestrator();
