const openRouterClient = require('../services/openRouterClient');

/**
 * Planner: Generates initial plan from lesson_input
 */
class Planner {
  async plan(lesson_input) {
    const prompt = `You are an expert educational planner. Analyze the following lesson request and create a detailed plan for generating high-quality educational content.

Lesson Request:
Title: ${lesson_input.title}
Type: ${lesson_input.type}
Level: ${lesson_input.level} (1=beginner, 5=advanced)
Module ID: ${lesson_input.module_id}

Create a structured plan for generating content that covers:
1. Core concepts to explain
2. Examples to include
3. Exercises to provide
4. Assessment strategy

Return as JSON with keys: core_concepts, examples_strategy, exercises_strategy, assessment_approach`;

    try {
      const response = await this._callLLM(prompt);
      const planText = this._normalizePlan(response);

      return {
        title: lesson_input.title,
        type: lesson_input.type,
        level: lesson_input.level,
        module_id: lesson_input.module_id,
        skill_id: lesson_input.skill_id,
        prompt,
        plan: planText,
      };
    } catch (error) {
      console.error('Planner error:', error.message);
      throw error;
    }
  }

  async _callLLM(prompt) {
    return openRouterClient.complete(
      [
        {
          role: 'system',
          content:
            'You are a careful educational planner. Return only a concise plan for lesson generation. Do not include markdown fences.',
        },
        { role: 'user', content: prompt },
      ],
      {
        temperature: 0.3,
        max_tokens: 600,
      }
    );
  }

  _normalizePlan(response) {
    if (typeof response === 'string') {
      return response;
    }

    if (response && typeof response === 'object') {
      return JSON.stringify(response, null, 2);
    }

    return 'Plan: cover fundamentals, examples, exercises, and assessment.';
  }
}

module.exports = new Planner();
