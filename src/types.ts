/**
 * AI Provider types
 */
export type AIProvider = 'openai' | 'anthropic' | 'grok' | 'gemini' | 'ollama';

/**
 * Review mode: PR diff or full repository
 */
export type ReviewModeType = 'pr' | 'full';

/**
 * Output type for full review
 */
export type OutputType = 'issue' | 'comment' | 'summary';

/**
 * Severity levels for issues
 */
export type Severity = 'critical' | 'warning' | 'suggestion';

/**
 * Categories for issues
 */
export type IssueCategory = 
  | 'security' 
  | 'performance' 
  | 'logic' 
  | 'style' 
  | 'best-practice' 
  | 'documentation';

/**
 * Overall assessment of the PR
 */
export type Assessment = 'approve' | 'request_changes' | 'comment';

/**
 * A single issue found in the code review
 */
export interface ReviewIssue {
  severity: Severity;
  category: IssueCategory;
  file: string;
  line: number;
  title: string;
  description: string;
  suggestion?: string;
}

/**
 * The complete review result from AI
 */
export interface ReviewResult {
  summary: string;
  issues: ReviewIssue[];
  positives: string[];
  overall_assessment: Assessment;
}

/**
 * A parsed file from the diff
 */
export interface DiffFile {
  path: string;
  additions: number;
  deletions: number;
  hunks: DiffHunk[];
}

/**
 * A hunk (changed section) within a diff file
 */
export interface DiffHunk {
  oldStart: number;
  oldLines: number;
  newStart: number;
  newLines: number;
  content: string;
}

/**
 * Chunk of diff for processing (when splitting large PRs)
 */
export interface DiffChunk {
  files: DiffFile[];
  totalLines: number;
}

/**
 * Configuration from .github/ai-review-config.yml
 */
export interface UserConfig {
  // AI settings
  model?: string;
  temperature?: number;
  max_tokens?: number;

  // Review behavior
  language?: string;
  review_mode?: 'quick' | 'detailed' | 'comprehensive';

  // Focus areas
  focus?: {
    security?: boolean;
    performance?: boolean;
    best_practices?: boolean;
    code_style?: boolean;
    documentation?: boolean;
    testing?: boolean;
  };

  // Severity configuration
  severity?: {
    critical?: boolean;
    warning?: boolean;
    suggestion?: boolean;
    nitpick?: boolean;
  };

  // File filters
  ignore?: string[];
  include_only?: string[];

  // Limits
  max_files?: number;
  max_diff_size?: number;
  max_file_size?: number;

  // Custom prompt
  custom_prompt?: string;
}

/**
 * Action configuration (from inputs + user config)
 */
export interface ActionConfig {
  // GitHub
  githubToken: string;
  
  // AI Provider keys
  openaiApiKey?: string;
  anthropicApiKey?: string;
  grokApiKey?: string;
  geminiApiKey?: string;
  ollamaUrl?: string;

  // Selected provider and model
  provider: AIProvider;
  model: string;

  // Behavior
  failOnCritical: boolean;
  language: string;

  // Review mode
  mode: ReviewModeType;
  paths?: string[];
  outputType: OutputType;

  // User config
  userConfig: UserConfig;
}

/**
 * GitHub context for the PR
 */
export interface PRContext {
  owner: string;
  repo: string;
  pullNumber: number;
  headSha: string;
  baseSha: string;
}

/**
 * Interface for AI clients
 */
export interface AIClient {
  /**
   * Get a code review for the given diff
   */
  review(diff: string, customPrompt?: string): Promise<ReviewResult>;
}

/**
 * Inline comment for GitHub review
 */
export interface InlineComment {
  path: string;
  line: number;
  body: string;
}

