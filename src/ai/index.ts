import type { AIClient, AIProvider, ActionConfig } from '../types.js';
import { OpenAIClient } from './openai.js';
import { AnthropicClient } from './anthropic.js';
import { GrokClient } from './grok.js';
import { GeminiClient } from './gemini.js';
import { OllamaClient } from './ollama.js';

/**
 * Create an AI client based on configuration
 */
export function createAIClient(config: ActionConfig): AIClient {
  const { provider, model, userConfig } = config;
  
  switch (provider) {
    case 'openai':
      if (!config.openaiApiKey) {
        throw new Error('OpenAI API key is required');
      }
      return new OpenAIClient(config.openaiApiKey, model, userConfig);
    
    case 'anthropic':
      if (!config.anthropicApiKey) {
        throw new Error('Anthropic API key is required');
      }
      return new AnthropicClient(config.anthropicApiKey, model, userConfig);
    
    case 'grok':
      if (!config.grokApiKey) {
        throw new Error('Grok API key is required');
      }
      return new GrokClient(config.grokApiKey, model, userConfig);
    
    case 'gemini':
      if (!config.geminiApiKey) {
        throw new Error('Gemini API key is required');
      }
      return new GeminiClient(config.geminiApiKey, model, userConfig);
    
    case 'ollama':
      if (!config.ollamaUrl) {
        throw new Error('Ollama URL is required');
      }
      return new OllamaClient(config.ollamaUrl, model, userConfig);
    
    default:
      throw new Error(`Unknown AI provider: ${provider}`);
  }
}

export { OpenAIClient } from './openai.js';
export { AnthropicClient } from './anthropic.js';
export { GrokClient } from './grok.js';
export { GeminiClient } from './gemini.js';
export { OllamaClient } from './ollama.js';

