import type { ReviewResult, ReviewIssue, Severity } from './types.js';

/**
 * Get emoji for severity level
 */
function getSeverityEmoji(severity: Severity): string {
  switch (severity) {
    case 'critical':
      return '🔴';
    case 'warning':
      return '🟡';
    case 'suggestion':
      return '🟢';
    default:
      return '💬';
  }
}

/**
 * Get label for severity level
 */
function getSeverityLabel(severity: Severity): string {
  switch (severity) {
    case 'critical':
      return 'Critical';
    case 'warning':
      return 'Warning';
    case 'suggestion':
      return 'Suggestion';
    default:
      return 'Info';
  }
}

/**
 * Format a single issue
 */
function formatIssue(issue: ReviewIssue, index: number): string {
  const emoji = getSeverityEmoji(issue.severity);
  const location = issue.file && issue.line > 0 
    ? `\`${issue.file}:${issue.line}\`` 
    : issue.file 
      ? `\`${issue.file}\`` 
      : '';
  
  let formatted = `### ${emoji} ${issue.title}\n\n`;
  
  if (location) {
    formatted += `📍 ${location}\n\n`;
  }
  
  formatted += `${issue.description}\n`;
  
  if (issue.suggestion) {
    formatted += `\n💡 **Suggestion:** ${issue.suggestion}\n`;
  }
  
  return formatted;
}

/**
 * Group issues by severity
 */
function groupBySeverity(issues: ReviewIssue[]): Record<Severity, ReviewIssue[]> {
  const groups: Record<Severity, ReviewIssue[]> = {
    critical: [],
    warning: [],
    suggestion: [],
  };
  
  for (const issue of issues) {
    if (groups[issue.severity]) {
      groups[issue.severity].push(issue);
    }
  }
  
  return groups;
}

/**
 * Format the review result as a Markdown comment
 */
export function formatReviewComment(result: ReviewResult): string {
  const lines: string[] = [];
  
  // Header
  lines.push('## 🤖 AI Code Review\n');
  
  // Summary
  lines.push('### Summary\n');
  lines.push(result.summary);
  lines.push('');
  
  // Statistics
  const criticalCount = result.issues.filter(i => i.severity === 'critical').length;
  const warningCount = result.issues.filter(i => i.severity === 'warning').length;
  const suggestionCount = result.issues.filter(i => i.severity === 'suggestion').length;
  
  if (result.issues.length > 0) {
    lines.push('### 📊 Overview\n');
    lines.push(`| Severity | Count |`);
    lines.push(`|----------|-------|`);
    if (criticalCount > 0) lines.push(`| 🔴 Critical | ${criticalCount} |`);
    if (warningCount > 0) lines.push(`| 🟡 Warning | ${warningCount} |`);
    if (suggestionCount > 0) lines.push(`| 🟢 Suggestion | ${suggestionCount} |`);
    lines.push('');
  }
  
  // Issues grouped by severity
  if (result.issues.length > 0) {
    lines.push('### 🔍 Issues Found\n');
    
    const grouped = groupBySeverity(result.issues);
    
    // Critical first
    if (grouped.critical.length > 0) {
      lines.push('<details open>');
      lines.push(`<summary><strong>🔴 Critical Issues (${grouped.critical.length})</strong></summary>\n`);
      grouped.critical.forEach((issue, i) => {
        lines.push(formatIssue(issue, i));
      });
      lines.push('</details>\n');
    }
    
    // Warnings
    if (grouped.warning.length > 0) {
      lines.push('<details open>');
      lines.push(`<summary><strong>🟡 Warnings (${grouped.warning.length})</strong></summary>\n`);
      grouped.warning.forEach((issue, i) => {
        lines.push(formatIssue(issue, i));
      });
      lines.push('</details>\n');
    }
    
    // Suggestions
    if (grouped.suggestion.length > 0) {
      lines.push('<details>');
      lines.push(`<summary><strong>🟢 Suggestions (${grouped.suggestion.length})</strong></summary>\n`);
      grouped.suggestion.forEach((issue, i) => {
        lines.push(formatIssue(issue, i));
      });
      lines.push('</details>\n');
    }
  } else {
    lines.push('### ✅ No Issues Found\n');
    lines.push('The code looks good! No significant issues were detected.\n');
  }
  
  // Positives
  if (result.positives.length > 0) {
    lines.push('### 👍 What\'s Good\n');
    for (const positive of result.positives) {
      lines.push(`- ${positive}`);
    }
    lines.push('');
  }
  
  // Overall assessment
  lines.push('---\n');
  const assessmentEmoji = 
    result.overall_assessment === 'approve' ? '✅' :
    result.overall_assessment === 'request_changes' ? '❌' : '💬';
  const assessmentLabel = 
    result.overall_assessment === 'approve' ? 'Approved' :
    result.overall_assessment === 'request_changes' ? 'Changes Requested' : 'Comment';
  
  lines.push(`**Overall: ${assessmentEmoji} ${assessmentLabel}**`);
  lines.push('');
  lines.push('---');
  lines.push('*Powered by [AI Code Reviewer](https://github.com/username/ai-code-reviewer)*');
  
  return lines.join('\n');
}

/**
 * Format a short summary for the action output
 */
export function formatShortSummary(result: ReviewResult): string {
  const criticalCount = result.issues.filter(i => i.severity === 'critical').length;
  const warningCount = result.issues.filter(i => i.severity === 'warning').length;
  const suggestionCount = result.issues.filter(i => i.severity === 'suggestion').length;
  
  const parts: string[] = [];
  
  if (criticalCount > 0) parts.push(`${criticalCount} critical`);
  if (warningCount > 0) parts.push(`${warningCount} warnings`);
  if (suggestionCount > 0) parts.push(`${suggestionCount} suggestions`);
  
  if (parts.length === 0) {
    return 'No issues found';
  }
  
  return `Found: ${parts.join(', ')}`;
}

