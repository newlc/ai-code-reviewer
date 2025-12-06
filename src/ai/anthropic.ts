import Anthropic from '@anthropic-ai/sdk';
import * as core from '@actions/core';
import type { ReviewResult, UserConfig } from '../types.js';
import { BaseAIClient, buildPrompt, parseReviewResponse } from './base.js';

/**
 * Anthropic (Claude) client for code review
 */
export class AnthropicClient extends BaseAIClient {
  private client: Anthropic;
  private model: string;
  
  constructor(apiKey: string, model: string, config: UserConfig) {
    super(config);
    this.client = new Anthropic({ apiKey });
    this.model = model;
  }
  
  async review(diff: string, customPrompt?: string): Promise<ReviewResult> {
    const prompt = buildPrompt(diff, {
      ...this.config,
      custom_prompt: customPrompt || this.config.custom_prompt,
    });
    
    core.info(`Sending request to Anthropic (${this.model})...`);
    
    const response = await this.client.messages.create({
      model: this.model,
      max_tokens: this.config.max_tokens ?? 4000,
      messages: [
        {
          role: 'user',
          content: prompt + '\n\nRespond with valid JSON only.',
        },
      ],
    });
    
    // Extract text from response
    const textBlock = response.content.find(block => block.type === 'text');
    const content = textBlock && 'text' in textBlock ? textBlock.text : '';
    
    if (!content) {
      throw new Error('Empty response from Anthropic');
    }
    
    core.info('Received response from Anthropic');
    
    return parseReviewResponse(content);
  }
}

