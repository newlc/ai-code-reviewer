import * as core from '@actions/core';
import { loadConfig } from './config.js';
import { 
  getPRContext, 
  getPRDiff, 
  postReviewComment, 
  postInlineReview,
  issuesToInlineComments,
  setOutputs,
  collectFilesForReview,
  createReviewIssue,
  writeToSummary,
  getRepoContext
} from './github.js';
import { performReview, performFullReview, countCriticalIssues } from './review.js';
import { formatReviewComment, formatShortSummary } from './formatter.js';

/**
 * Run PR review mode
 */
async function runPRReview(config: ReturnType<typeof loadConfig>): Promise<void> {
  // Get PR context
  core.info('Getting PR context...');
  const prContext = getPRContext();
  core.info(`Reviewing PR #${prContext.pullNumber} in ${prContext.owner}/${prContext.repo}`);
  
  // Get PR diff
  core.info('Fetching PR diff...');
  const diff = await getPRDiff(config.githubToken, prContext);
  core.info(`Fetched diff (${diff.length} characters)`);
  
  if (!diff || diff.trim().length === 0) {
    core.info('No diff content found, skipping review');
    return;
  }
  
  // Perform the review
  core.info('Starting AI code review...');
  const reviewResult = await performReview(config, diff);
  
  // Format the review as markdown
  const reviewComment = formatReviewComment(reviewResult);
  
  // Post the main review comment
  core.info('Posting review comment...');
  const commentId = await postReviewComment(
    config.githubToken, 
    prContext, 
    reviewComment
  );
  
  // Post inline comments
  const inlineComments = issuesToInlineComments(reviewResult.issues);
  if (inlineComments.length > 0) {
    core.info(`Posting ${inlineComments.length} inline comments...`);
    await postInlineReview(
      config.githubToken,
      prContext,
      inlineComments,
      reviewResult
    );
  }
  
  // Set outputs
  const criticalCount = countCriticalIssues(reviewResult);
  setOutputs(commentId, reviewResult.issues.length, criticalCount);
  
  // Log summary
  const summary = formatShortSummary(reviewResult);
  core.info(`Review complete: ${summary}`);
  
  // Fail if critical issues found and fail-on-critical is enabled
  if (config.failOnCritical && criticalCount > 0) {
    core.setFailed(`Found ${criticalCount} critical issue(s). Review the PR comments for details.`);
  }
}

/**
 * Run full repository review mode
 */
async function runFullReview(config: ReturnType<typeof loadConfig>): Promise<void> {
  const paths = config.paths || ['src/'];
  core.info(`Running full review for paths: ${paths.join(', ')}`);
  
  // Collect files
  core.info('Collecting files for review...');
  const codeContent = collectFilesForReview(paths);
  
  if (!codeContent || codeContent.trim().length === 0) {
    core.warning('No files found to review');
    return;
  }
  
  core.info(`Collected code (${codeContent.length} characters)`);
  
  // Perform the full review (not diff-based)
  core.info('Starting AI full code review...');
  const reviewResult = await performFullReview(config, codeContent);
  
  // Format the review as markdown
  const reviewComment = formatReviewComment(reviewResult);
  
  // Create header
  const date = new Date().toISOString().split('T')[0];
  const header = `## 🔍 Full Repository Review\n\n**Date:** ${date}\n**Paths reviewed:** ${paths.join(', ')}\n\n---\n\n`;
  const fullReview = header + reviewComment;
  
  // Output based on outputType
  const { owner, repo } = getRepoContext();
  
  switch (config.outputType) {
    case 'issue':
      core.info('Creating GitHub issue with review...');
      const issueNumber = await createReviewIssue(
        config.githubToken,
        `🔍 Full Code Review - ${date}`,
        fullReview,
        ['code-review', 'automated']
      );
      core.setOutput('issue-number', issueNumber.toString());
      break;
      
    case 'summary':
      core.info('Writing review to job summary...');
      writeToSummary(fullReview);
      break;
      
    case 'comment':
      core.info('Posting as comment is only available in PR mode, using summary instead');
      writeToSummary(fullReview);
      break;
  }
  
  // Set outputs
  const criticalCount = countCriticalIssues(reviewResult);
  core.setOutput('issues-found', reviewResult.issues.length.toString());
  core.setOutput('critical-issues', criticalCount.toString());
  
  // Log summary
  const summary = formatShortSummary(reviewResult);
  core.info(`Review complete: ${summary}`);
  
  // Fail if critical issues found and fail-on-critical is enabled
  if (config.failOnCritical && criticalCount > 0) {
    core.setFailed(`Found ${criticalCount} critical issue(s). Check the review for details.`);
  }
}

/**
 * Main entry point for the GitHub Action
 */
async function run(): Promise<void> {
  try {
    // Load configuration
    core.info('Loading configuration...');
    const config = loadConfig();
    core.info(`Using provider: ${config.provider}, model: ${config.model}, mode: ${config.mode}`);
    
    if (config.mode === 'full') {
      await runFullReview(config);
    } else {
      await runPRReview(config);
    }
    
    core.info('AI Code Review completed successfully!');
  } catch (error) {
    if (error instanceof Error) {
      core.setFailed(`Action failed: ${error.message}`);
      core.debug(error.stack || '');
    } else {
      core.setFailed(`Action failed: ${String(error)}`);
    }
  }
}

// Run the action
run();

