const openRouterClient = require('../services/openRouterClient');

/**
 * Critic: Evaluates output and provides scores + feedback
 * Uses hybrid system: LLM scores + heuristic penalties + execution signal
 */
class Critic {
  async evaluate({ lesson_input, output, iteration }) {
    // Step 1: Get LLM evaluation (semantic scores)
    const llm_scores = await this._getLLMScores(lesson_input, output);

    // Step 2: Apply heuristic penalties
    const penalties = this._calculatePenalties(output);

    // Step 3: Calculate pass rate (execution signal)
    const pass_rate = this._calculatePassRate(output);

    // Step 4: Compute final score using hybrid formula
    const clarity = llm_scores.clarity - penalties.clarity;
    const correctness = llm_scores.correctness * 0.6 + pass_rate * 0.4;
    const pedagogy = llm_scores.pedagogy - penalties.pedagogy;

    const quality_score =
      0.3 * clarity + 0.4 * correctness + 0.2 * pedagogy + 0.1 * pass_rate;

    // Clamp to [0, 1]
    const final_score = Math.max(0, Math.min(1, quality_score));

    // Generate feedback for refiner
    const feedback = this._generateFeedback(
      { clarity, correctness, pedagogy },
      penalties,
      llm_scores
    );

    return {
      score: final_score,
      metrics: {
        clarity: Math.max(0, Math.min(1, clarity)),
        correctness: Math.max(0, Math.min(1, correctness)),
        pedagogy: Math.max(0, Math.min(1, pedagogy)),
        pass_rate,
        quality: final_score,
      },
      feedback,
    };
  }

  async _getLLMScores(lesson_input, output) {
    const prompt = `Evaluate this lesson content on three dimensions (0.0 to 1.0):

Title: ${output.title}
Content: ${output.content}
Examples: ${JSON.stringify(output.examples)}
Exercise: ${JSON.stringify(output.exercise)}

Score on:
1. Clarity: Is the explanation clear and well-structured? (0.0-1.0)
2. Correctness: Is the content factually correct and complete? (0.0-1.0)
3. Pedagogy: Is it effective for learning (progression, examples, engagement)? (0.0-1.0)

Respond with JSON: {"clarity": 0.X, "correctness": 0.X, "pedagogy": 0.X}`;

    try {
      const response = await this._callLLM(prompt);
      return this._parseScores(response);
    } catch (error) {
      console.error('Critic LLM error:', error.message);
      throw error;
    }
  }

  _calculatePenalties(output) {
    let clarity_penalty = 0;
    let pedagogy_penalty = 0;

    // Missing examples penalty
    if (!output.examples || output.examples.length === 0) {
      pedagogy_penalty += 0.1;
    }

    // Missing exercise penalty
    if (!output.exercise || !output.exercise.description) {
      pedagogy_penalty += 0.15;
    }

    // Short explanation penalty
    if (!output.content || output.content.length < 100) {
      clarity_penalty += 0.1;
    }

    return { clarity: clarity_penalty, pedagogy: pedagogy_penalty };
  }

  _calculatePassRate(output) {
    // For now, mock pass rate based on content presence
    let pass_rate = 0.5;

    if (output.testCases && output.testCases.length > 0) {
      pass_rate = Math.min(1, 0.5 + output.testCases.length * 0.1);
    }

    return Math.min(1, pass_rate);
  }

  _generateFeedback(scores, penalties, llm_scores) {
    const issues = [];

    if (scores.clarity < 0.7) {
      issues.push('Improve explanation clarity and structure');
    }
    if (scores.correctness < 0.7) {
      issues.push('Verify technical accuracy of examples');
    }
    if (scores.pedagogy < 0.7) {
      issues.push('Add more interactive elements or exercises');
    }

    return {
      summary: `Clarity: ${scores.clarity.toFixed(2)}, Correctness: ${scores.correctness.toFixed(2)}, Pedagogy: ${scores.pedagogy.toFixed(2)}`,
      issues,
      strengths: issues.length === 0 ? ['Well-structured content', 'Clear examples'] : [],
    };
  }

  async _callLLM(prompt) {
    return openRouterClient.complete(
      [
        {
          role: 'system',
          content:
            'You are a strict educational critic. Return only valid JSON with keys clarity, correctness, and pedagogy as scores between 0 and 1.',
        },
        { role: 'user', content: prompt },
      ],
      {
        temperature: 0.2,
        max_tokens: 500,
      }
    );
  }

  _parseScores(response) {
    try {
      const parsed = JSON.parse(response);
      return {
        clarity: Math.max(0, Math.min(1, parsed.clarity || 0.75)),
        correctness: Math.max(0, Math.min(1, parsed.correctness || 0.75)),
        pedagogy: Math.max(0, Math.min(1, parsed.pedagogy || 0.75)),
      };
    } catch {
      return { clarity: 0.75, correctness: 0.75, pedagogy: 0.75 };
    }
  }
}

module.exports = new Critic();
