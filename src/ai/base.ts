import * as fs from 'fs';
import * as path from 'path';
import type { AIClient, ReviewResult, UserConfig } from '../types.js';

/**
 * Base prompt for code review
 */
export function getBasePrompt(): string {
  const promptPath = path.resolve(__dirname, '../../prompts/base.txt');
  
  // In bundled environment, prompt might not exist as file
  // Fall back to inline prompt
  try {
    if (fs.existsSync(promptPath)) {
      return fs.readFileSync(promptPath, 'utf-8');
    }
  } catch {
    // Ignore and use inline prompt
  }
  
  return `You are an expert code reviewer with deep knowledge of software engineering best practices.

Analyze the following code changes from a pull request and provide a structured review.

## Your Review Should Include:

1. **Summary**: A brief overview of the changes (2-3 sentences)

2. **Issues**: Problems found in the code, categorized by:
   - **Severity**: critical (must fix), warning (should fix), suggestion (nice to have)
   - **Category**: security, performance, logic, style, best-practice, documentation

3. **Positives**: Good things about the code (if any)

4. **Overall Assessment**: Whether to approve, request changes, or just comment

## Guidelines:

- Focus on important issues, not minor style nitpicks
- Be constructive and explain WHY something is a problem
- Provide specific suggestions for fixes when possible
- Reference specific file paths and line numbers
- Consider the context of the entire change

## Response Format:

Respond ONLY with valid JSON in this exact format:
{
  "summary": "Brief summary of the changes",
  "issues": [
    {
      "severity": "critical|warning|suggestion",
      "category": "security|performance|logic|style|best-practice|documentation",
      "file": "path/to/file.ts",
      "line": 42,
      "title": "Brief issue title",
      "description": "Detailed explanation of the problem",
      "suggestion": "How to fix this (optional)"
    }
  ],
  "positives": ["Good thing 1", "Good thing 2"],
  "overall_assessment": "approve|request_changes|comment"
}`;
}

/**
 * Build the full prompt with user customizations
 */
export function buildPrompt(diff: string, config: UserConfig): string {
  let prompt = getBasePrompt();
  
  // Add language instruction
  if (config.language && config.language !== 'en') {
    const languageNames: Record<string, string> = {
      ru: 'Russian',
      es: 'Spanish',
      de: 'German',
      zh: 'Chinese',
      ja: 'Japanese',
      fr: 'French',
      pt: 'Portuguese',
    };
    const langName = languageNames[config.language] || config.language;
    prompt += `\n\n**IMPORTANT**: Respond in ${langName} language.`;
  }
  
  // Add focus areas
  if (config.focus) {
    const focusAreas = Object.entries(config.focus)
      .filter(([_, enabled]) => enabled)
      .map(([area]) => area.replace('_', ' '));
    
    if (focusAreas.length > 0) {
      prompt += `\n\n**Focus Areas**: Pay special attention to: ${focusAreas.join(', ')}.`;
    }
  }
  
  // Add custom prompt
  if (config.custom_prompt) {
    prompt += `\n\n**Additional Instructions**:\n${config.custom_prompt}`;
  }
  
  // Add the diff
  prompt += `\n\n## Code Changes to Review:\n\n\`\`\`diff\n${diff}\n\`\`\``;
  
  return prompt;
}

/**
 * Parse the AI response as JSON
 */
export function parseReviewResponse(response: string): ReviewResult {
  // Try to extract JSON from the response
  let jsonStr = response.trim();
  
  // Remove markdown code blocks if present
  if (jsonStr.startsWith('```json')) {
    jsonStr = jsonStr.slice(7);
  } else if (jsonStr.startsWith('```')) {
    jsonStr = jsonStr.slice(3);
  }
  
  if (jsonStr.endsWith('```')) {
    jsonStr = jsonStr.slice(0, -3);
  }
  
  jsonStr = jsonStr.trim();
  
  try {
    const parsed = JSON.parse(jsonStr) as ReviewResult;
    
    // Validate required fields
    if (!parsed.summary) {
      parsed.summary = 'No summary provided';
    }
    if (!Array.isArray(parsed.issues)) {
      parsed.issues = [];
    }
    if (!Array.isArray(parsed.positives)) {
      parsed.positives = [];
    }
    if (!parsed.overall_assessment) {
      parsed.overall_assessment = 'comment';
    }
    
    return parsed;
  } catch (error) {
    // If JSON parsing fails, create a basic response
    return {
      summary: 'Failed to parse AI response',
      issues: [{
        severity: 'warning',
        category: 'documentation',
        file: '',
        line: 0,
        title: 'AI Response Parse Error',
        description: `The AI response could not be parsed as JSON. Raw response: ${response.substring(0, 500)}...`,
      }],
      positives: [],
      overall_assessment: 'comment',
    };
  }
}

/**
 * Abstract base class for AI clients
 */
export abstract class BaseAIClient implements AIClient {
  protected config: UserConfig;
  
  constructor(config: UserConfig) {
    this.config = config;
  }
  
  abstract review(diff: string, customPrompt?: string): Promise<ReviewResult>;
}

