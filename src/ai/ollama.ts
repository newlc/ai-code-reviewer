import * as core from '@actions/core';
import type { ReviewResult, UserConfig } from '../types.js';
import { BaseAIClient, buildPrompt, parseReviewResponse } from './base.js';

interface OllamaResponse {
  model: string;
  created_at: string;
  message: {
    role: string;
    content: string;
  };
  done: boolean;
}

/**
 * Ollama client for local LLM code review
 */
export class OllamaClient extends BaseAIClient {
  private baseUrl: string;
  private model: string;
  
  constructor(baseUrl: string, model: string, config: UserConfig) {
    super(config);
    this.baseUrl = baseUrl.replace(/\/$/, ''); // Remove trailing slash
    // Handle model formats: "ollama/llama3", "llama3", "llama3:latest"
    this.model = model.replace('ollama/', '');
  }
  
  async review(diff: string, customPrompt?: string): Promise<ReviewResult> {
    const prompt = buildPrompt(diff, {
      ...this.config,
      custom_prompt: customPrompt || this.config.custom_prompt,
    });
    
    core.info(`Sending request to Ollama (${this.model})...`);
    
    const response = await fetch(`${this.baseUrl}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: this.model,
        messages: [
          {
            role: 'user',
            content: prompt + '\n\nRespond with valid JSON only.',
          },
        ],
        stream: false,
        options: {
          temperature: this.config.temperature ?? 0.3,
          num_predict: this.config.max_tokens ?? 4000,
        },
      }),
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Ollama request failed: ${response.status} ${errorText}`);
    }
    
    const data = await response.json() as OllamaResponse;
    const content = data.message?.content;
    
    if (!content) {
      throw new Error('Empty response from Ollama');
    }
    
    core.info('Received response from Ollama');
    
    return parseReviewResponse(content);
  }
}

