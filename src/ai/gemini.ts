import { GoogleGenerativeAI } from '@google/generative-ai';
import * as core from '@actions/core';
import type { ReviewResult, UserConfig } from '../types.js';
import { BaseAIClient, buildPrompt, parseReviewResponse } from './base.js';

/**
 * Google Gemini client for code review
 */
export class GeminiClient extends BaseAIClient {
  private client: GoogleGenerativeAI;
  private model: string;
  
  constructor(apiKey: string, model: string, config: UserConfig) {
    super(config);
    this.client = new GoogleGenerativeAI(apiKey);
    this.model = model;
  }
  
  async review(diff: string, customPrompt?: string): Promise<ReviewResult> {
    const prompt = buildPrompt(diff, {
      ...this.config,
      custom_prompt: customPrompt || this.config.custom_prompt,
    });
    
    core.info(`Sending request to Gemini (${this.model})...`);
    
    const model = this.client.getGenerativeModel({ 
      model: this.model,
      generationConfig: {
        temperature: this.config.temperature ?? 0.3,
        maxOutputTokens: this.config.max_tokens ?? 4000,
        responseMimeType: 'application/json',
      },
    });
    
    const result = await model.generateContent(prompt);
    const response = result.response;
    const content = response.text();
    
    if (!content) {
      throw new Error('Empty response from Gemini');
    }
    
    core.info('Received response from Gemini');
    
    return parseReviewResponse(content);
  }
}

