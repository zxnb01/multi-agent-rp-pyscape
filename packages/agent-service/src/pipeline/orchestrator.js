const Planner = require('../agents/Planner');
const Generator = require('../agents/Generator');
const Critic = require('../agents/Critic');
const Refiner = require('../agents/Refiner');
const Validator = require('../agents/Validator');

/**
 * Orchestrator: Mode-aware multi-agent pipeline
 * Branches by system_type:
 *   - single_llm: Generator (no planning) -> Validator (deterministic gate)
 *   - pipeline: Planner -> Generator (single pass) -> Validator
 *   - multi_agent: Planner -> Generator loop with Critic/Refiner -> Validator
 * Returns: final_output, metrics, iteration_trace
 */
class Orchestrator {
  async run({ job_id, lesson_input, config }) {
    const { system_type = 'multi_agent' } = config;

    // Dispatch to mode-specific pipeline
    switch (system_type) {
      case 'single_llm':
        return this._orchestrate_single_llm({ job_id, lesson_input, config });
      case 'pipeline':
        return this._orchestrate_pipeline({ job_id, lesson_input, config });
      case 'multi_agent':
        return this._orchestrate_multi_agent({ job_id, lesson_input, config });
      default:
        throw new Error(`Invalid system_type: ${system_type}`);
    }
  }

  /**
   * single_llm: Direct generation without planning or iteration
   * Generator -> Validator (deterministic gate)
   */
  async _orchestrate_single_llm({ job_id, lesson_input, config }) {
    const { quality_threshold = 0.85 } = config;

    console.log(`[${job_id}] Starting single_llm pipeline (no Planner, one-shot generation)`);

    try {
      // Single generation pass (no planning, no loop)
      const generated = await Generator.generate({
        lesson_input,
        plan: null, // No plan in single_llm
        iteration: 0,
        memory: {},
      });

      const output = generated.output;
      const score = generated.score || 0.5;

      console.log(`[${job_id}] single_llm generation complete, score: ${score.toFixed(3)}`);

      // Deterministic validation gate
      const validation = await Validator.validate({
        lesson_input,
        output,
        iteration: 0,
      });

      console.log(`[${job_id}] single_llm validation: ${validation.is_valid ? 'PASS' : 'FAIL'}`);

      // Single iteration trace for single_llm
      const iteration_trace = [
        {
          iteration: 0,
          score,
          consistency_flag: false,
          metrics: { clarity: 0.5, correctness: 0.5, pedagogy: 0.5, pass_rate: validation.pass_rate || 0, quality: score },
          validation,
        },
      ];

      // Minimal metrics for single_llm
      const final_metrics = {
        quality_score: score,
        pass_rate: validation.pass_rate || 0,
        total_latency: 0,
        tokens_used: 0,
        iterations: 1,
      };

      const result = {
        job_id,
        status: 'completed',
        final_output: {
          lesson: output,
          source_context: {
            lesson_input,
            plan: null,
            config,
            iteration_trace,
          },
        },
        metrics: final_metrics,
        iteration_trace,
      };

      console.log(`[${job_id}] single_llm pipeline completed`);
      return result;
    } catch (error) {
      console.error(`[${job_id}] single_llm pipeline failed:`, error);
      throw error;
    }
  }

  /**
   * pipeline: Structured but non-iterative flow
   * Planner -> Generator (single pass) -> Validator
   * No Critic/Refiner iteration, strictly one-shot
   */
  async _orchestrate_pipeline({ job_id, lesson_input, config }) {
    const { quality_threshold = 0.85 } = config;

    console.log(`[${job_id}] Starting pipeline (Planner -> Generator -> Validator, one-shot)`);

    try {
      // Phase 1: Planner generates initial plan
      const plan = await Planner.plan(lesson_input);
      console.log(`[${job_id}] Pipeline plan generated`);

      // Phase 2: Single Generator pass
      const generated = await Generator.generate({
        lesson_input,
        plan,
        iteration: 0,
        memory: {},
      });

      let output = generated.output;
      const score = generated.score || 0.5;

      console.log(`[${job_id}] Pipeline generation complete, score: ${score.toFixed(3)}`);

      // Phase 3: Validation gate (no Refiner)
      const validation = await Validator.validate({
        lesson_input,
        output,
        iteration: 0,
      });

      console.log(`[${job_id}] Pipeline validation: ${validation.is_valid ? 'PASS' : 'FAIL'}`);

      // Single iteration trace
      const iteration_trace = [
        {
          iteration: 0,
          score,
          consistency_flag: false,
          metrics: { clarity: 0.5, correctness: 0.5, pedagogy: 0.5, pass_rate: validation.pass_rate || 0, quality: score },
          validation,
        },
      ];

      // Standard metrics (no iteration trace variance)
      const final_metrics = {
        quality_score: score,
        clarity: 0.5,
        correctness: 0.5,
        pedagogy: 0.5,
        pass_rate: validation.pass_rate || 0,
        iterations: 1,
        total_latency: 0,
        tokens_used: 0,
      };

      const result = {
        job_id,
        status: 'completed',
        final_output: {
          lesson: output,
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

      console.log(`[${job_id}] Pipeline completed with final score: ${score.toFixed(3)}`);
      return result;
    } catch (error) {
      console.error(`[${job_id}] Pipeline failed:`, error);
      throw error;
    }
  }

  /**
   * multi_agent: Full iterative loop with Critic/Refiner
   * Planner -> (Generator -> Critic -> Refiner) loop -> Validator
   * Original behavior retained
   */
  async _orchestrate_multi_agent({ job_id, lesson_input, config }) {
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

    console.log(`[${job_id}] Starting multi_agent pipeline with config:`, config);

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

      console.log(`[${job_id}] multi_agent pipeline completed with final score: ${best_score.toFixed(3)}`);
      return result;
    } catch (error) {
      console.error(`[${job_id}] multi_agent pipeline failed:`, error);
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
