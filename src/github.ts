import * as core from '@actions/core';
import * as github from '@actions/github';
import * as fs from 'fs';
import * as path from 'path';
import type { PRContext, ReviewResult, InlineComment, ReviewIssue } from './types.js';

type Octokit = ReturnType<typeof github.getOctokit>;

const REVIEW_COMMENT_MARKER = '<!-- ai-code-reviewer -->';

/**
 * Get the PR context from GitHub Actions
 */
export function getPRContext(): PRContext {
  const context = github.context;
  
  if (!context.payload.pull_request) {
    throw new Error('This action can only be run on pull request events');
  }
  
  return {
    owner: context.repo.owner,
    repo: context.repo.repo,
    pullNumber: context.payload.pull_request.number,
    headSha: context.payload.pull_request.head.sha,
    baseSha: context.payload.pull_request.base.sha,
  };
}

/**
 * Get the diff content for a PR
 */
export async function getPRDiff(
  token: string, 
  context: PRContext
): Promise<string> {
  const octokit = github.getOctokit(token);
  
  const { data } = await octokit.rest.pulls.get({
    owner: context.owner,
    repo: context.repo,
    pull_number: context.pullNumber,
    mediaType: {
      format: 'diff',
    },
  });
  
  // The response is a string when using diff format
  return data as unknown as string;
}

/**
 * Find existing AI review comment
 */
async function findExistingComment(
  octokit: Octokit,
  context: PRContext
): Promise<number | null> {
  const { data: comments } = await octokit.rest.issues.listComments({
    owner: context.owner,
    repo: context.repo,
    issue_number: context.pullNumber,
  });
  
  const existingComment = comments.find(
    comment => comment.body?.includes(REVIEW_COMMENT_MARKER)
  );
  
  return existingComment?.id ?? null;
}

/**
 * Post or update the main review comment
 */
export async function postReviewComment(
  token: string,
  context: PRContext,
  body: string
): Promise<number> {
  const octokit = github.getOctokit(token);
  const fullBody = `${REVIEW_COMMENT_MARKER}\n${body}`;
  
  // Try to find existing comment
  const existingCommentId = await findExistingComment(octokit, context);
  
  if (existingCommentId) {
    // Update existing comment
    await octokit.rest.issues.updateComment({
      owner: context.owner,
      repo: context.repo,
      comment_id: existingCommentId,
      body: fullBody,
    });
    core.info(`Updated existing review comment #${existingCommentId}`);
    return existingCommentId;
  }
  
  // Create new comment
  const { data } = await octokit.rest.issues.createComment({
    owner: context.owner,
    repo: context.repo,
    issue_number: context.pullNumber,
    body: fullBody,
  });
  
  core.info(`Created new review comment #${data.id}`);
  return data.id;
}

/**
 * Post inline comments as a review
 */
export async function postInlineReview(
  token: string,
  context: PRContext,
  comments: InlineComment[],
  review: ReviewResult
): Promise<void> {
  if (comments.length === 0) {
    core.info('No inline comments to post');
    return;
  }
  
  const octokit = github.getOctokit(token);
  
  // Map our comments to GitHub's format
  const githubComments = comments.map(comment => ({
    path: comment.path,
    line: comment.line,
    body: comment.body,
  }));
  
  // Determine the review event type
  let event: 'APPROVE' | 'REQUEST_CHANGES' | 'COMMENT' = 'COMMENT';
  if (review.overall_assessment === 'approve') {
    event = 'APPROVE';
  } else if (review.overall_assessment === 'request_changes') {
    event = 'REQUEST_CHANGES';
  }
  
  try {
    await octokit.rest.pulls.createReview({
      owner: context.owner,
      repo: context.repo,
      pull_number: context.pullNumber,
      commit_id: context.headSha,
      event,
      comments: githubComments,
    });
    
    core.info(`Posted inline review with ${comments.length} comments`);
  } catch (error) {
    // If inline comments fail (e.g., line not in diff), fall back to regular comments
    core.warning(`Failed to post inline review: ${error}`);
    core.info('Falling back to regular comments');
    
    for (const comment of comments) {
      try {
        await octokit.rest.issues.createComment({
          owner: context.owner,
          repo: context.repo,
          issue_number: context.pullNumber,
          body: `**${comment.path}:${comment.line}**\n\n${comment.body}`,
        });
      } catch (innerError) {
        core.warning(`Failed to post comment for ${comment.path}: ${innerError}`);
      }
    }
  }
}

/**
 * Convert review issues to inline comments
 */
export function issuesToInlineComments(issues: ReviewIssue[]): InlineComment[] {
  return issues
    .filter(issue => issue.file && issue.line > 0)
    .map(issue => {
      const emoji = getSeverityEmoji(issue.severity);
      let body = `${emoji} **${issue.title}**\n\n${issue.description}`;
      
      if (issue.suggestion) {
        body += `\n\n💡 **Suggestion:** ${issue.suggestion}`;
      }
      
      return {
        path: issue.file,
        line: issue.line,
        body,
      };
    });
}

/**
 * Get emoji for severity level
 */
function getSeverityEmoji(severity: string): string {
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
 * Set action outputs
 */
export function setOutputs(
  commentId: number,
  issuesCount: number,
  criticalCount: number
): void {
  core.setOutput('review-comment-id', commentId.toString());
  core.setOutput('issues-found', issuesCount.toString());
  core.setOutput('critical-issues', criticalCount.toString());
}

/**
 * Supported file extensions for full review
 */
const SUPPORTED_EXTENSIONS = [
  '.js', '.ts', '.jsx', '.tsx', '.mjs', '.cjs',
  '.py', '.pyw',
  '.go',
  '.rs',
  '.java', '.kt', '.kts',
  '.c', '.cpp', '.cc', '.h', '.hpp',
  '.cs',
  '.rb',
  '.php',
  '.swift',
  '.scala',
  '.vue', '.svelte',
];

/**
 * Collect files from specified paths for full review
 */
export function collectFilesForReview(paths: string[]): string {
  const cwd = process.cwd();
  let content = '';
  let fileCount = 0;
  const maxFiles = 50;
  const maxFileSize = 100000; // 100KB per file
  
  for (const searchPath of paths) {
    const fullPath = path.resolve(cwd, searchPath);
    
    if (!fs.existsSync(fullPath)) {
      core.warning(`Path not found: ${searchPath}`);
      continue;
    }
    
    const stat = fs.statSync(fullPath);
    
    if (stat.isFile()) {
      // Single file
      const ext = path.extname(fullPath).toLowerCase();
      if (SUPPORTED_EXTENSIONS.includes(ext)) {
        const fileContent = readFileContent(fullPath, maxFileSize);
        if (fileContent) {
          content += `\n=== FILE: ${searchPath} ===\n${fileContent}\n`;
          fileCount++;
        }
      }
    } else if (stat.isDirectory()) {
      // Directory - recursively collect files
      const files = collectFilesRecursively(fullPath, cwd, maxFiles - fileCount);
      for (const file of files) {
        if (fileCount >= maxFiles) {
          core.warning(`Reached maximum file limit (${maxFiles}). Some files were skipped.`);
          break;
        }
        const fileContent = readFileContent(file.fullPath, maxFileSize);
        if (fileContent) {
          content += `\n=== FILE: ${file.relativePath} ===\n${fileContent}\n`;
          fileCount++;
        }
      }
    }
  }
  
  core.info(`Collected ${fileCount} files for review`);
  return content;
}

/**
 * Read file content with size limit
 */
function readFileContent(filePath: string, maxSize: number): string | null {
  try {
    const stat = fs.statSync(filePath);
    if (stat.size > maxSize) {
      core.warning(`File too large, skipping: ${filePath} (${stat.size} bytes)`);
      return null;
    }
    return fs.readFileSync(filePath, 'utf-8');
  } catch (error) {
    core.warning(`Failed to read file: ${filePath}`);
    return null;
  }
}

/**
 * Recursively collect files from directory
 */
function collectFilesRecursively(
  dir: string, 
  cwd: string, 
  maxFiles: number
): Array<{ fullPath: string; relativePath: string }> {
  const results: Array<{ fullPath: string; relativePath: string }> = [];
  
  const ignoreDirs = ['node_modules', '.git', 'dist', 'build', '__pycache__', 'vendor', '.venv', 'venv'];
  
  function walk(currentDir: string) {
    if (results.length >= maxFiles) return;
    
    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(currentDir, { withFileTypes: true });
    } catch {
      return;
    }
    
    for (const entry of entries) {
      if (results.length >= maxFiles) break;
      
      const fullPath = path.join(currentDir, entry.name);
      
      if (entry.isDirectory()) {
        if (!ignoreDirs.includes(entry.name) && !entry.name.startsWith('.')) {
          walk(fullPath);
        }
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name).toLowerCase();
        if (SUPPORTED_EXTENSIONS.includes(ext)) {
          results.push({
            fullPath,
            relativePath: path.relative(cwd, fullPath),
          });
        }
      }
    }
  }
  
  walk(dir);
  return results;
}

/**
 * Get repository context (works without PR)
 */
export function getRepoContext(): { owner: string; repo: string } {
  const context = github.context;
  return {
    owner: context.repo.owner,
    repo: context.repo.repo,
  };
}

/**
 * Create a GitHub issue with review results
 */
export async function createReviewIssue(
  token: string,
  title: string,
  body: string,
  labels?: string[]
): Promise<number> {
  const octokit = github.getOctokit(token);
  const { owner, repo } = getRepoContext();
  
  try {
    const { data } = await octokit.rest.issues.create({
      owner,
      repo,
      title,
      body,
      labels: labels || [],
    });
    
    core.info(`Created issue #${data.number}`);
    return data.number;
  } catch (error) {
    // Try without labels if they don't exist
    core.warning(`Failed to create issue with labels, retrying without: ${error}`);
    const { data } = await octokit.rest.issues.create({
      owner,
      repo,
      title,
      body,
    });
    
    core.info(`Created issue #${data.number}`);
    return data.number;
  }
}

/**
 * Write review to GitHub Actions summary
 */
export function writeToSummary(content: string): void {
  core.summary.addRaw(content);
  core.summary.write();
}

