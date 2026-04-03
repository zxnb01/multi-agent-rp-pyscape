const axios = require('axios');

const OPENROUTER_BASE_URL = process.env.OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1/chat/completions';
const OPENROUTER_MODEL = process.env.OPENROUTER_MODEL || 'openai/gpt-3.5-turbo';
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const OPENROUTER_REFERER = process.env.OPENROUTER_REFERER || 'http://localhost:3001';
const OPENROUTER_TITLE = process.env.OPENROUTER_TITLE || 'PyScape UI';

class OpenRouterClient {
  constructor() {
    this.http = axios.create({
      baseURL: OPENROUTER_BASE_URL,
      timeout: 30000,
      headers: {
        Authorization: `Bearer ${OPENROUTER_API_KEY || ''}`,
        'HTTP-Referer': OPENROUTER_REFERER,
        'X-Title': OPENROUTER_TITLE,
        'Content-Type': 'application/json',
      },
    });
  }

  _ensureConfigured() {
    if (!OPENROUTER_API_KEY) {
      throw new Error('OPENROUTER_API_KEY is missing from the agent-service environment');
    }
  }

  async complete(messages, options = {}) {
    this._ensureConfigured();

    const response = await this.http.post('', {
      model: options.model || OPENROUTER_MODEL,
      messages,
      temperature: options.temperature ?? 0.7,
      max_tokens: options.max_tokens ?? 1200,
      top_p: options.top_p ?? 1,
      ...(options.response_format ? { response_format: options.response_format } : {}),
    });

    const choice = response.data?.choices?.[0];
    const content = choice?.message?.content;

    if (!content) {
      throw new Error('OpenRouter response did not include content');
    }

    return content;
  }
}

module.exports = new OpenRouterClient();