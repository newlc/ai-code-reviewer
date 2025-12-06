import * as core from '@actions/core';
import type { 
  ActionConfig, 
  AIClient, 
  DiffChunk, 
  DiffFile, 
  ReviewResult, 
  ReviewIssue 
} from './types.js';
import { parseDiff, filterFiles, splitIntoChunks, filesToDiffString, limitFiles } from './diff.js';
import { createAIClient } from './ai/index.js';

/**
 * Merge multiple review results into one
 */
function mergeReviewResults(results: ReviewResult[]): ReviewResult {
  if (results.length === 0) {
    return {
      summary: 'No files to review',
      issues: [],
      positives: [],
      overall_assessment: 'approve',
    };
  }
  
  if (results.length === 1) {
    return results[0];
  }
  
  // Merge all issues
  const allIssues: ReviewIssue[] = [];
  const allPositives: string[] = [];
  const summaries: string[] = [];
  
  for (const result of results) {
    allIssues.push(...result.issues);
    allPositives.push(...result.positives);
    summaries.push(result.summary);
  }
  
  // Determine overall assessment (most severe wins)
  let overall_assessment: ReviewResult['overall_assessment'] = 'approve';
  for (const result of results) {
    if (result.overall_assessment === 'request_changes') {
      overall_assessment = 'request_changes';
      break;
    }
    if (result.overall_assessment === 'comment') {
      overall_assessment = 'comment';
    }
  }
  
  return {
    summary: summaries.join(' '),
    issues: allIssues,
    positives: [...new Set(allPositives)], // Remove duplicates
    overall_assessment,
  };
}

/**
 * Process a single chunk of diff
 */
async function processChunk(
  client: AIClient,
  chunk: DiffChunk,
  chunkIndex: number,
  totalChunks: number
): Promise<ReviewResult> {
  const diffString = filesToDiffString(chunk.files);
  
  let customPrompt: string | undefined;
  if (totalChunks > 1) {
    customPrompt = `This is part ${chunkIndex + 1} of ${totalChunks} of the code changes. ` +
      `Review this part independently. Files in this chunk: ${chunk.files.map(f => f.path).join(', ')}`;
  }
  
  return client.review(diffString, customPrompt);
}

/**
 * Perform the code review
 */
export async function performReview(
  config: ActionConfig,
  rawDiff: string
): Promise<ReviewResult> {
  const { userConfig } = config;
  
  // Parse the diff
  core.info('Parsing diff...');
  let files = parseDiff(rawDiff);
  core.info(`Found ${files.length} files in diff`);
  
  // Filter ignored files
  files = filterFiles(files, userConfig);
  core.info(`After filtering: ${files.length} files to review`);
  
  if (files.length === 0) {
    return {
      summary: 'No files to review after applying filters',
      issues: [],
      positives: [],
      overall_assessment: 'approve',
    };
  }
  
  // Limit number of files
  const maxFiles = userConfig.max_files ?? 20;
  if (files.length > maxFiles) {
    core.warning(`Too many files (${files.length}), limiting to ${maxFiles}`);
    files = limitFiles(files, maxFiles);
  }
  
  // Create AI client
  core.info(`Creating ${config.provider} client...`);
  const client = createAIClient(config);
  
  // Split into chunks if necessary
  const maxDiffSize = userConfig.max_diff_size ?? 5000;
  const chunks = splitIntoChunks(files, maxDiffSize);
  
  core.info(`Split into ${chunks.length} chunk(s) for processing`);
  
  // Process each chunk
  const results: ReviewResult[] = [];
  
  for (let i = 0; i < chunks.length; i++) {
    core.info(`Processing chunk ${i + 1}/${chunks.length} (${chunks[i].totalLines} lines)...`);
    
    try {
      const result = await processChunk(client, chunks[i], i, chunks.length);
      results.push(result);
    } catch (error) {
      core.error(`Failed to process chunk ${i + 1}: ${error}`);
      
      // Add error as an issue
      results.push({
        summary: `Failed to review chunk ${i + 1}`,
        issues: [{
          severity: 'warning',
          category: 'documentation',
          file: chunks[i].files[0]?.path || '',
          line: 0,
          title: 'Review Error',
          description: `Failed to get AI review for this chunk: ${error}`,
        }],
        positives: [],
        overall_assessment: 'comment',
      });
    }
  }
  
  // Merge results
  const mergedResult = mergeReviewResults(results);
  
  core.info(`Review complete: ${mergedResult.issues.length} issues found`);
  
  return mergedResult;
}

/**
 * Count critical issues
 */
export function countCriticalIssues(result: ReviewResult): number {
  return result.issues.filter(issue => issue.severity === 'critical').length;
}

/**
 * Split code content into chunks by files
 */
function splitCodeIntoChunks(codeContent: string, maxChunkSize: number): string[] {
  // Split by file markers
  const filePattern = /\n?=== FILE: .+? ===/g;
  const parts = codeContent.split(filePattern);
  const markers = codeContent.match(filePattern) || [];
  
  // Reconstruct files with their markers
  const files: string[] = [];
  for (let i = 0; i < markers.length; i++) {
    const content = markers[i] + (parts[i + 1] || '');
    if (content.trim()) {
      files.push(content);
    }
  }
  
  if (files.length === 0) {
    // No file markers found, treat as single chunk
    return [codeContent];
  }
  
  // Group files into chunks that fit maxChunkSize
  const chunks: string[] = [];
  let currentChunk = '';
  
  for (const file of files) {
    if (currentChunk.length + file.length > maxChunkSize && currentChunk.length > 0) {
      chunks.push(currentChunk);
      currentChunk = file;
    } else {
      currentChunk += file;
    }
  }
  
  if (currentChunk.trim()) {
    chunks.push(currentChunk);
  }
  
  return chunks;
}

/**
 * Perform full repository review (not diff-based)
 */
export async function performFullReview(
  config: ActionConfig,
  codeContent: string
): Promise<ReviewResult> {
  core.info('Starting full code review...');
  
  if (!codeContent || codeContent.trim().length === 0) {
    return {
      summary: 'No code to review',
      issues: [],
      positives: [],
      overall_assessment: 'approve',
    };
  }
  
  // Create AI client
  core.info(`Creating ${config.provider} client...`);
  const client = createAIClient(config);
  
  // Split into chunks if content is too large (max ~10K chars per chunk)
  const maxChunkSize = 10000;
  const chunks = splitCodeIntoChunks(codeContent, maxChunkSize);
  
  core.info(`Split code into ${chunks.length} chunk(s) for review`);
  
  const results: ReviewResult[] = [];
  
  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    core.info(`Processing chunk ${i + 1}/${chunks.length} (${chunk.length} chars)...`);
    
    const customPrompt = chunks.length > 1
      ? `This is part ${i + 1} of ${chunks.length} of a full repository code review.
Review all the code provided and identify any issues.
Each file is marked with "=== FILE: path ===" header.`
      : `This is a full repository code review (not a PR diff).
Review all the code provided and identify any issues.
Each file is marked with "=== FILE: path ===" header.`;
    
    try {
      const result = await client.review(chunk, customPrompt);
      results.push(result);
      core.info(`Chunk ${i + 1} complete: ${result.issues.length} issues found`);
    } catch (error) {
      core.error(`Failed to review chunk ${i + 1}: ${error}`);
      results.push({
        summary: `Failed to review chunk ${i + 1}: ${error}`,
        issues: [{
          severity: 'warning',
          category: 'documentation',
          file: '',
          line: 0,
          title: 'Review Error',
          description: `Failed to get AI review for chunk ${i + 1}: ${error}`,
        }],
        positives: [],
        overall_assessment: 'comment',
      });
    }
  }
  
  // Merge results
  const mergedResult = mergeReviewResults(results);
  core.info(`Full review complete: ${mergedResult.issues.length} total issues found`);
  
  return mergedResult;
}

