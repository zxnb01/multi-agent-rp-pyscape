const openRouterClient = require('../services/openRouterClient');

/**
 * Refiner: Improves content based on critic feedback
 */
class Refiner {
  async refine({ output, feedback, iteration }) {
    const prompt = `Improve this lesson content based on the feedback provided.

Current Content:
${JSON.stringify(output, null, 2)}

Feedback:
${JSON.stringify(feedback, null, 2)}

Iteration: ${iteration}

Make targeted improvements to address the feedback. Return improved lesson as JSON with same structure:
{
  "title": "...",
  "content": "...",
  "examples": [...],
  "exercise": {...},
  "keyPoints": [...],
  "testCases": [...]
}`;

    try {
      const response = await this._callLLM(prompt);
      const refined = this._parseJSON(response);

      // Merge with original, keeping structure
      return {
        ...output,
        ...refined,
      };
    } catch (error) {
      console.error('Refiner error:', error.message);
      throw error;
    }
  }

  async _callLLM(prompt) {
    return openRouterClient.complete(
      [
        {
          role: 'system',
          content:
            'You are an educational refiner. Improve the provided lesson and return valid JSON only with the same schema as the input lesson.',
        },
        { role: 'user', content: prompt },
      ],
      {
        temperature: 0.5,
        max_tokens: 1400,
      }
    );
  }

  _parseJSON(str) {
    try {
      return JSON.parse(str);
    } catch {
      return {};
    }
  }
}

module.exports = new Refiner();
