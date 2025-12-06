import OpenAI from 'openai';
import * as core from '@actions/core';
import type { ReviewResult, UserConfig } from '../types.js';
import { BaseAIClient, buildPrompt, parseReviewResponse } from './base.js';

/**
 * Grok (xAI) client for code review
 * Uses OpenAI-compatible API
 */
export class GrokClient extends BaseAIClient {
  private client: OpenAI;
  private model: string;
  
  constructor(apiKey: string, model: string, config: UserConfig) {
    super(config);
    // Grok uses OpenAI-compatible API at api.x.ai
    this.client = new OpenAI({ 
      apiKey,
      baseURL: 'https://api.x.ai/v1',
    });
    this.model = model.replace('grok-', ''); // Remove prefix if present
    if (!this.model.startsWith('grok')) {
      this.model = `grok-${this.model}`;
    }
  }
  
  async review(diff: string, customPrompt?: string): Promise<ReviewResult> {
    const prompt = buildPrompt(diff, {
      ...this.config,
      custom_prompt: customPrompt || this.config.custom_prompt,
    });
    
    core.info(`Sending request to Grok (${this.model})...`);
    
    const response = await this.client.chat.completions.create({
      model: this.model,
      messages: [
        {
          role: 'user',
          content: prompt + '\n\nRespond with valid JSON only.',
        },
      ],
      temperature: this.config.temperature ?? 0.3,
      max_tokens: this.config.max_tokens ?? 4000,
    });
    
    const content = response.choices[0]?.message?.content;
    
    if (!content) {
      throw new Error('Empty response from Grok');
    }
    
    core.info('Received response from Grok');
    
    return parseReviewResponse(content);
  }
}

