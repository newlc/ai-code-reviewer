import * as core from '@actions/core';
import * as fs from 'fs';
import * as path from 'path';
import { parse as parseYaml } from 'yaml';
import type { ActionConfig, AIProvider, UserConfig, ReviewModeType, OutputType } from './types.js';

/**
 * Default user configuration
 */
const DEFAULT_USER_CONFIG: UserConfig = {
  temperature: 0.3,
  max_tokens: 4000,
  language: 'en',
  review_mode: 'detailed',
  focus: {
    security: true,
    performance: true,
    best_practices: true,
    code_style: true,
    documentation: false,
    testing: true,
  },
  severity: {
    critical: true,
    warning: true,
    suggestion: true,
    nitpick: false,
  },
  ignore: [
    '*.min.js',
    '*.min.css',
    '*.lock',
    'package-lock.json',
    'yarn.lock',
    'pnpm-lock.yaml',
    '**/node_modules/**',
    '**/dist/**',
    '**/build/**',
    '**/vendor/**',
    '**/generated/**',
  ],
  max_files: 20,
  max_diff_size: 5000,
  max_file_size: 1000,
};

/**
 * Determine which AI provider to use based on available API keys
 */
function determineProvider(
  model: string,
  openaiKey?: string,
  anthropicKey?: string,
  grokKey?: string,
  geminiKey?: string,
  ollamaUrl?: string
): AIProvider {
  // Check if model explicitly specifies provider
  if (model.startsWith('gpt-') || model.startsWith('o1') || model.startsWith('codex')) {
    if (!openaiKey) throw new Error('OpenAI API key required for GPT/Codex models');
    return 'openai';
  }
  if (model.startsWith('claude-')) {
    if (!anthropicKey) throw new Error('Anthropic API key required for Claude models');
    return 'anthropic';
  }
  if (model.startsWith('grok-')) {
    if (!grokKey) throw new Error('Grok API key required for Grok models');
    return 'grok';
  }
  if (model.startsWith('gemini-')) {
    if (!geminiKey) throw new Error('Gemini API key required for Gemini models');
    return 'gemini';
  }
  if (model.startsWith('ollama/') || model.includes(':')) {
    if (!ollamaUrl) throw new Error('Ollama URL required for local models');
    return 'ollama';
  }

  // Default: use first available provider
  if (openaiKey) return 'openai';
  if (anthropicKey) return 'anthropic';
  if (grokKey) return 'grok';
  if (geminiKey) return 'gemini';
  if (ollamaUrl) return 'ollama';

  throw new Error('No AI provider configured. Please provide at least one API key.');
}

/**
 * Load user configuration from file
 */
function loadUserConfig(configPath: string): UserConfig {
  const fullPath = path.resolve(process.cwd(), configPath);
  
  if (!fs.existsSync(fullPath)) {
    core.info(`Config file not found at ${configPath}, using defaults`);
    return { ...DEFAULT_USER_CONFIG };
  }

  try {
    const content = fs.readFileSync(fullPath, 'utf-8');
    const parsed = parseYaml(content) as UserConfig;
    
    // Merge with defaults
    return {
      ...DEFAULT_USER_CONFIG,
      ...parsed,
      focus: {
        ...DEFAULT_USER_CONFIG.focus,
        ...parsed.focus,
      },
      severity: {
        ...DEFAULT_USER_CONFIG.severity,
        ...parsed.severity,
      },
      ignore: parsed.ignore || DEFAULT_USER_CONFIG.ignore,
    };
  } catch (error) {
    core.warning(`Failed to parse config file: ${error}`);
    return { ...DEFAULT_USER_CONFIG };
  }
}

/**
 * Load complete action configuration
 */
export function loadConfig(): ActionConfig {
  // Get inputs from action
  const githubToken = core.getInput('github-token', { required: true });
  const openaiApiKey = core.getInput('openai-api-key') || undefined;
  const anthropicApiKey = core.getInput('anthropic-api-key') || undefined;
  const grokApiKey = core.getInput('grok-api-key') || undefined;
  const geminiApiKey = core.getInput('gemini-api-key') || undefined;
  const ollamaUrl = core.getInput('ollama-url') || undefined;
  
  const model = core.getInput('model') || 'gpt-5.1';
  const failOnCritical = core.getInput('fail-on-critical') === 'true';
  const language = core.getInput('language') || 'en';
  const configPath = core.getInput('config-path') || '.github/ai-review-config.yml';
  
  // Review mode settings
  const modeInput = core.getInput('mode') || 'pr';
  const mode: ReviewModeType = modeInput === 'full' ? 'full' : 'pr';
  const pathsInput = core.getInput('paths') || 'src/';
  const paths = pathsInput.split(',').map(p => p.trim()).filter(p => p.length > 0);
  const outputTypeInput = core.getInput('output-type') || 'issue';
  const outputType: OutputType = ['issue', 'comment', 'summary'].includes(outputTypeInput) 
    ? outputTypeInput as OutputType 
    : 'issue';

  // Load user config
  const userConfig = loadUserConfig(configPath);
  
  // Override with action inputs if provided
  if (language !== 'en') {
    userConfig.language = language;
  }

  // Determine provider
  const provider = determineProvider(
    model,
    openaiApiKey,
    anthropicApiKey,
    grokApiKey,
    geminiApiKey,
    ollamaUrl
  );

  return {
    githubToken,
    openaiApiKey,
    anthropicApiKey,
    grokApiKey,
    geminiApiKey,
    ollamaUrl,
    provider,
    model,
    failOnCritical,
    language,
    mode,
    paths,
    outputType,
    userConfig,
  };
}

/**
 * Check if a file should be ignored based on patterns
 */
export function shouldIgnoreFile(filePath: string, config: UserConfig): boolean {
  const { ignore = [], include_only } = config;

  // If include_only is set, only include matching files
  if (include_only && include_only.length > 0) {
    const included = include_only.some(pattern => matchPattern(filePath, pattern));
    if (!included) return true;
  }

  // Check ignore patterns
  return ignore.some(pattern => matchPattern(filePath, pattern));
}

/**
 * Simple glob pattern matching
 */
function matchPattern(filePath: string, pattern: string): boolean {
  // Convert glob pattern to regex
  let regexPattern = pattern
    .replace(/\./g, '\\.')
    .replace(/\*\*/g, '{{GLOBSTAR}}')
    .replace(/\*/g, '[^/]*')
    .replace(/{{GLOBSTAR}}/g, '.*');
  
  // If pattern doesn't start with **, allow matching anywhere in path
  if (!pattern.startsWith('**') && !pattern.startsWith('/')) {
    regexPattern = `(^|.*/)?${regexPattern}`;
  }
  
  const regex = new RegExp(`^${regexPattern}$`);
  return regex.test(filePath);
}

