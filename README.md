# AI Code Reviewer

[![GitHub Action](https://img.shields.io/badge/GitHub-Action-blue?logo=github)](https://github.com/marketplace/actions/ai-code-reviewer)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

> Automated AI-powered code review for your pull requests

**AI Code Reviewer** is a GitHub Action that automatically reviews your pull requests using AI. It analyzes code changes, finds potential bugs, security issues, and suggests improvements.

## Features

- **Multiple AI Providers**: OpenAI, Anthropic (Claude), Grok, Gemini, Ollama
- **Smart Comments**: General summary + inline comments on specific lines
- **Highly Configurable**: Custom prompts, ignore patterns, focus areas
- **Multi-language**: Review comments in English, Russian, Spanish, and more
- **Fail on Critical**: Optionally block PRs with critical issues
- **Easy Setup**: Single workflow file, no complex configuration

## Quick Start

### 1. Create workflow file

Create `.github/workflows/ai-review.yml`:

```yaml
name: AI Code Review

on:
  pull_request:
    types: [opened, synchronize]

jobs:
  review:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      pull-requests: write
    
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0
      
      - name: AI Code Review
        uses: username/ai-code-reviewer@v1
        with:
          github-token: ${{ secrets.GITHUB_TOKEN }}
          openai-api-key: ${{ secrets.OPENAI_API_KEY }}
```

### 2. Add your API key

Go to **Settings → Secrets → Actions** and add your API key:
- `OPENAI_API_KEY` for OpenAI/GPT models
- `ANTHROPIC_API_KEY` for Claude models
- `GROK_API_KEY` for Grok models
- `GEMINI_API_KEY` for Google Gemini models

### 3. Open a Pull Request

The action will automatically review your code and post comments!

## Configuration

### Action Inputs

| Input | Required | Default | Description |
|-------|----------|---------|-------------|
| `github-token` | Yes | — | GitHub token for PR comments |
| `openai-api-key` | No* | — | OpenAI API key |
| `anthropic-api-key` | No* | — | Anthropic (Claude) API key |
| `grok-api-key` | No* | — | Grok (xAI) API key |
| `gemini-api-key` | No* | — | Google Gemini API key |
| `ollama-url` | No* | — | Ollama server URL |
| `model` | No | `gpt-4o` | AI model to use |
| `fail-on-critical` | No | `false` | Fail action if critical issues found |
| `config-path` | No | `.github/ai-review-config.yml` | Path to config file |
| `language` | No | `en` | Response language |

*At least one AI provider is required

### Supported Models

| Provider | Models |
|----------|--------|
| OpenAI | `gpt-5.1`, `gpt-4.1`, `gpt-4.1-mini`, `gpt-4.1-nano`, `gpt-4o` |
| Anthropic | `claude-3-5-sonnet-20241022`, `claude-3-opus-20240229` |
| Grok | `grok-2`, `grok-2-mini` |
| Gemini | `gemini-1.5-pro`, `gemini-1.5-flash` |
| Ollama | Any model: `llama3`, `codellama`, `mistral`, etc. |

### Custom Configuration

Create `.github/ai-review-config.yml` for advanced settings:

```yaml
# Review behavior
language: en              # en, ru, es, de, zh, ja, fr, pt
review_mode: detailed     # quick, detailed, comprehensive
temperature: 0.3          # Lower = more focused

# Focus areas
focus:
  security: true
  performance: true
  best_practices: true
  code_style: true
  documentation: false
  testing: true

# Severity levels to report
severity:
  critical: true
  warning: true
  suggestion: true
  nitpick: false

# File filters
ignore:
  - "*.min.js"
  - "*.lock"
  - "package-lock.json"
  - "**/node_modules/**"
  - "**/dist/**"
  - "**/generated/**"

include_only:            # If set, only review these patterns
  - "src/**"
  - "lib/**"

# Limits
max_files: 20            # Max files per review
max_diff_size: 5000      # Max diff lines to analyze
max_file_size: 1000      # Skip files larger than this

# Custom instructions for the AI
custom_prompt: |
  This is a fintech application.
  Pay special attention to:
  - PCI DSS compliance
  - SQL injection vulnerabilities
  - Proper encryption of sensitive data
```

## Examples

### Using Claude

```yaml
- uses: username/ai-code-reviewer@v1
  with:
    github-token: ${{ secrets.GITHUB_TOKEN }}
    anthropic-api-key: ${{ secrets.ANTHROPIC_API_KEY }}
    model: claude-3-5-sonnet-20241022
```

### Using Gemini

```yaml
- uses: username/ai-code-reviewer@v1
  with:
    github-token: ${{ secrets.GITHUB_TOKEN }}
    gemini-api-key: ${{ secrets.GEMINI_API_KEY }}
    model: gemini-1.5-pro
```

### Using local Ollama

```yaml
- uses: username/ai-code-reviewer@v1
  with:
    github-token: ${{ secrets.GITHUB_TOKEN }}
    ollama-url: http://localhost:11434
    model: codellama
```

### Fail on critical issues

```yaml
- uses: username/ai-code-reviewer@v1
  with:
    github-token: ${{ secrets.GITHUB_TOKEN }}
    openai-api-key: ${{ secrets.OPENAI_API_KEY }}
    fail-on-critical: true
```

### Review in Russian

```yaml
- uses: username/ai-code-reviewer@v1
  with:
    github-token: ${{ secrets.GITHUB_TOKEN }}
    openai-api-key: ${{ secrets.OPENAI_API_KEY }}
    language: ru
```

## Security

- API keys are passed via GitHub Secrets (encrypted)
- Keys are never logged or exposed
- Only diff content is sent to AI provider
- Minimal permissions required (`contents: read`, `pull-requests: write`)

## Development

```bash
# Clone the repo
git clone https://github.com/username/ai-code-reviewer
cd ai-code-reviewer

# Install dependencies
npm install

# Run tests
npm test

# Build
npm run build
```

## License

MIT License - see [LICENSE](LICENSE)

## Acknowledgments

- OpenAI, Anthropic, Google, xAI for their AI models
- The GitHub Actions team
