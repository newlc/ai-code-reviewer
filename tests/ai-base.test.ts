import { describe, it, expect } from 'vitest';
import { buildPrompt, parseReviewResponse, getBasePrompt } from '../src/ai/base.js';
import type { UserConfig } from '../src/types.js';

describe('getBasePrompt', () => {
  it('should return a non-empty prompt', () => {
    const prompt = getBasePrompt();
    
    expect(prompt).toBeTruthy();
    expect(prompt).toContain('code reviewer');
    expect(prompt).toContain('JSON');
  });
});

describe('buildPrompt', () => {
  const config: UserConfig = {
    language: 'en',
    focus: {
      security: true,
      performance: true,
      best_practices: false,
      code_style: false,
      documentation: false,
      testing: false,
    },
  };

  it('should include the diff in the prompt', () => {
    const diff = 'diff --git a/test.ts b/test.ts\n+const x = 1;';
    const prompt = buildPrompt(diff, config);
    
    expect(prompt).toContain(diff);
  });

  it('should add focus areas', () => {
    const prompt = buildPrompt('test diff', config);
    
    expect(prompt).toContain('security');
    expect(prompt).toContain('performance');
  });

  it('should add language instruction for non-English', () => {
    const ruConfig: UserConfig = { ...config, language: 'ru' };
    const prompt = buildPrompt('test diff', ruConfig);
    
    expect(prompt).toContain('Russian');
  });

  it('should add custom prompt if provided', () => {
    const customConfig: UserConfig = { 
      ...config, 
      custom_prompt: 'This is a fintech app, focus on PCI compliance.' 
    };
    const prompt = buildPrompt('test diff', customConfig);
    
    expect(prompt).toContain('fintech');
    expect(prompt).toContain('PCI');
  });
});

describe('parseReviewResponse', () => {
  it('should parse valid JSON response', () => {
    const jsonResponse = JSON.stringify({
      summary: 'Test summary',
      issues: [
        {
          severity: 'warning',
          category: 'security',
          file: 'test.ts',
          line: 10,
          title: 'Test issue',
          description: 'Test description',
        },
      ],
      positives: ['Good tests'],
      overall_assessment: 'approve',
    });

    const result = parseReviewResponse(jsonResponse);

    expect(result.summary).toBe('Test summary');
    expect(result.issues).toHaveLength(1);
    expect(result.positives).toContain('Good tests');
    expect(result.overall_assessment).toBe('approve');
  });

  it('should handle JSON wrapped in markdown code blocks', () => {
    const wrappedResponse = '```json\n{"summary":"Test","issues":[],"positives":[],"overall_assessment":"approve"}\n```';

    const result = parseReviewResponse(wrappedResponse);

    expect(result.summary).toBe('Test');
    expect(result.overall_assessment).toBe('approve');
  });

  it('should provide defaults for missing fields', () => {
    const partialResponse = '{"issues":[]}';

    const result = parseReviewResponse(partialResponse);

    expect(result.summary).toBe('No summary provided');
    expect(result.issues).toEqual([]);
    expect(result.positives).toEqual([]);
    expect(result.overall_assessment).toBe('comment');
  });

  it('should handle invalid JSON gracefully', () => {
    const invalidResponse = 'This is not JSON at all';

    const result = parseReviewResponse(invalidResponse);

    expect(result.issues).toHaveLength(1);
    expect(result.issues[0].title).toContain('Parse Error');
  });
});

