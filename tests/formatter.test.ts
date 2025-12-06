import { describe, it, expect } from 'vitest';
import { formatReviewComment, formatShortSummary } from '../src/formatter.js';
import type { ReviewResult } from '../src/types.js';

describe('formatReviewComment', () => {
  it('should format a review with issues', () => {
    const review: ReviewResult = {
      summary: 'This PR adds a new feature.',
      issues: [
        {
          severity: 'critical',
          category: 'security',
          file: 'src/auth.ts',
          line: 42,
          title: 'SQL Injection',
          description: 'User input is not sanitized.',
          suggestion: 'Use parameterized queries.',
        },
        {
          severity: 'warning',
          category: 'performance',
          file: 'src/data.ts',
          line: 100,
          title: 'N+1 Query',
          description: 'Database query inside a loop.',
        },
      ],
      positives: ['Good code structure', 'Well documented'],
      overall_assessment: 'request_changes',
    };

    const comment = formatReviewComment(review);

    expect(comment).toContain('AI Code Review');
    expect(comment).toContain('This PR adds a new feature.');
    expect(comment).toContain('🔴 Critical');
    expect(comment).toContain('🟡 Warning');
    expect(comment).toContain('SQL Injection');
    expect(comment).toContain('N+1 Query');
    expect(comment).toContain('Good code structure');
    expect(comment).toContain('Changes Requested');
  });

  it('should format a review with no issues', () => {
    const review: ReviewResult = {
      summary: 'Minor documentation update.',
      issues: [],
      positives: ['Clear and concise'],
      overall_assessment: 'approve',
    };

    const comment = formatReviewComment(review);

    expect(comment).toContain('No Issues Found');
    expect(comment).toContain('Approved');
  });

  it('should handle missing optional fields', () => {
    const review: ReviewResult = {
      summary: 'Test changes.',
      issues: [
        {
          severity: 'suggestion',
          category: 'style',
          file: 'src/utils.ts',
          line: 10,
          title: 'Consider const',
          description: 'Use const instead of let.',
        },
      ],
      positives: [],
      overall_assessment: 'comment',
    };

    const comment = formatReviewComment(review);

    expect(comment).toContain('🟢 Suggestions');
    expect(comment).toContain('Consider const');
    expect(comment).not.toContain("What's Good");
  });
});

describe('formatShortSummary', () => {
  it('should format summary with all issue types', () => {
    const review: ReviewResult = {
      summary: 'Test',
      issues: [
        { severity: 'critical', category: 'security', file: '', line: 0, title: '', description: '' },
        { severity: 'critical', category: 'security', file: '', line: 0, title: '', description: '' },
        { severity: 'warning', category: 'performance', file: '', line: 0, title: '', description: '' },
        { severity: 'suggestion', category: 'style', file: '', line: 0, title: '', description: '' },
      ],
      positives: [],
      overall_assessment: 'request_changes',
    };

    const summary = formatShortSummary(review);

    expect(summary).toBe('Found: 2 critical, 1 warnings, 1 suggestions');
  });

  it('should return "No issues found" when empty', () => {
    const review: ReviewResult = {
      summary: 'Test',
      issues: [],
      positives: [],
      overall_assessment: 'approve',
    };

    const summary = formatShortSummary(review);

    expect(summary).toBe('No issues found');
  });
});

