import OpenAI from 'openai';
import * as core from '@actions/core';
import type { ReviewResult, UserConfig } from '../types.js';
import { BaseAIClient, buildPrompt, parseReviewResponse } from './base.js';

/**
 * OpenAI client for code review
 */
export class OpenAIClient extends BaseAIClient {
  private client: OpenAI;
  private model: string;
  
  constructor(apiKey: string, model: string, config: UserConfig) {
    super(config);
    this.client = new OpenAI({ apiKey });
    this.model = model;
  }
  
  async review(diff: string, customPrompt?: string): Promise<ReviewResult> {
    const prompt = buildPrompt(diff, {
      ...this.config,
      custom_prompt: customPrompt || this.config.custom_prompt,
    });
    
    core.info(`Sending request to OpenAI (${this.model})...`);
    
    // Newer models (gpt-5.1, gpt-4.1, o1, o3) use max_completion_tokens
    // These models use reasoning tokens, so we need MORE tokens for response
    const useNewTokenParam = /^(gpt-[45]\.\d|o[13])/.test(this.model);
    const configTokens = this.config.max_tokens ?? 4000;
    // For reasoning models, ensure at least 16000 tokens (reasoning + response)
    const maxTokens = useNewTokenParam ? Math.max(configTokens, 16000) : configTokens;
    
    core.info(`Using ${maxTokens} tokens (reasoning model: ${useNewTokenParam})`);
    
    // Some newer models may not support json_object response format
    const supportsJsonFormat = !this.model.startsWith('o1') && !this.model.startsWith('o3');
    
    const response = await this.client.chat.completions.create({
      model: this.model,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: this.config.temperature ?? 0.3,
      ...(useNewTokenParam 
        ? { max_completion_tokens: maxTokens } 
        : { max_tokens: maxTokens }),
      ...(supportsJsonFormat && { response_format: { type: 'json_object' } }),
    });
    
    core.debug(`OpenAI response: ${JSON.stringify(response.choices[0])}`);
    
    const content = response.choices[0]?.message?.content;
    const finishReason = response.choices[0]?.finish_reason;
    
    if (!content) {
      core.warning(`Empty content. Finish reason: ${finishReason}`);
      core.warning(`Full response: ${JSON.stringify(response)}`);
      throw new Error(`Empty response from OpenAI (finish_reason: ${finishReason})`);
    }
    
    core.info(`Received response from OpenAI (finish_reason: ${finishReason})`);
    
    return parseReviewResponse(content);
  }
}

