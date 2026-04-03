const openRouterClient = require('../services/openRouterClient');

/**
 * Generator: Generates lesson content
 */
class Generator {
  async generate({ lesson_input, plan, iteration, memory }) {
    const prompt = `You are an expert educational content creator. Generate high-quality lesson content.

Lesson Input:
${JSON.stringify(lesson_input, null, 2)}

Lesson Plan:
${JSON.stringify(plan, null, 2)}

Iteration: ${iteration}

Write a lesson that matches the requested topic, level, and type. Use the lesson title and module context directly in the content.

Generate structured lesson content with:
- title: Clear, descriptive title
- content: Comprehensive explanation (2-3 paragraphs)
- examples: Array of 2-3 relevant examples
- exercise: One practical exercise or problem
- keyPoints: Key takeaways (bullet list)
- testCases: 2-3 test cases for the exercise (optional)

Return valid JSON.`;

    try {
      const response = await this._callLLM(prompt);
      const output = this._parseJSON(response);

      return {
        output,
        source_context: {
          lesson_input,
          plan,
          iteration,
        },
        score: 0.72 + iteration * 0.04, // Mock improvement per iteration
      };
    } catch (error) {
      console.error('Generator error:', error.message);
      throw error;
    }
  }

  async _callLLM(prompt) {
    return openRouterClient.complete(
      [
        {
          role: 'system',
          content:
            'You are an expert educational content creator. Return valid JSON only with keys title, content, examples, exercise, keyPoints, and testCases.',
        },
        { role: 'user', content: prompt },
      ],
      {
        temperature: 0.7,
        max_tokens: 1400,
      }
    );
  }

  _parseJSON(str) {
    try {
      return JSON.parse(str);
    } catch {
      return {
        title: 'Generated lesson',
        content: str,
        examples: [],
        exercise: {},
        keyPoints: [],
        testCases: [],
      };
    }
  }
}

module.exports = new Generator();
