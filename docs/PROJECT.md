# 🤖 AI Code Reviewer

> Automated AI-powered code review for your pull requests

[![GitHub Stars](https://img.shields.io/github/stars/username/ai-code-reviewer?style=social)](https://github.com/username/ai-code-reviewer)
[![GitHub Action](https://img.shields.io/badge/GitHub-Action-blue?logo=github)](https://github.com/marketplace/actions/ai-code-reviewer)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## ✨ What is this?

**AI Code Reviewer** is a GitHub Action that automatically reviews your pull requests using AI (OpenAI GPT-4, Claude, or local LLMs via Ollama). It analyzes code changes, finds potential bugs, security issues, and suggests improvements — all based on your custom review guidelines.

## 🎬 Demo

```
┌─────────────────────────────────────────────────────────┐
│  Pull Request #42: Add user authentication              │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  🤖 AI Code Reviewer                                    │
│                                                         │
│  ## Summary                                             │
│  This PR adds JWT authentication. Overall looks good    │
│  with a few suggestions.                                │
│                                                         │
│  ## Issues Found                                        │
│                                                         │
│  🔴 **Security** (auth.ts:45)                          │
│  Token expiration is set to 30 days. Consider using    │
│  shorter expiration with refresh tokens.                │
│                                                         │
│  🟡 **Performance** (middleware.ts:12)                 │
│  Database query inside loop. Consider batch fetching.   │
│                                                         │
│  🟢 **Style** (utils.ts:78)                            │
│  Magic number 86400. Consider using named constant.     │
│                                                         │
│  ## Suggested Improvements                              │
│  - Add rate limiting to auth endpoints                  │
│  - Consider using httpOnly cookies for tokens           │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

## 🚀 Quick Start

### 1. Add the workflow file

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

Go to **Settings → Secrets → Actions** and add:
- `OPENAI_API_KEY` — your OpenAI API key

### 3. (Optional) Add custom review guidelines

Create `.github/ai-review-config.yml`:

```yaml
# Review configuration
model: gpt-4o
language: en  # or 'ru' for Russian

# What to focus on
focus:
  - security
  - performance
  - best-practices
  - code-style

# Severity levels to report
severity:
  - critical
  - warning
  - suggestion

# Custom instructions for the AI reviewer
custom_prompt: |
  You are a senior software engineer reviewing code.
  Focus on:
  - Security vulnerabilities (SQL injection, XSS, etc.)
  - Performance issues
  - Code maintainability
  - Best practices for our stack (TypeScript, React, Node.js)
  
  Our coding standards:
  - Use functional components with hooks
  - Prefer const over let
  - All functions must have JSDoc comments

# Files to ignore
ignore:
  - "*.md"
  - "*.json"
  - "dist/**"
  - "node_modules/**"

# Max files to review per PR
max_files: 20

# Max lines of diff to analyze
max_diff_size: 3000
```

---

## ⚙️ Configuration Options

### Action Inputs

| Input | Required | Default | Description |
|-------|----------|---------|-------------|
| `github-token` | ✅ | — | GitHub token for PR comments |
| `openai-api-key` | ❌* | — | OpenAI API key |
| `anthropic-api-key` | ❌* | — | Anthropic (Claude) API key |
| `ollama-url` | ❌* | — | Ollama server URL for local LLMs |
| `config-path` | ❌ | `.github/ai-review-config.yml` | Path to config file |
| `model` | ❌ | `gpt-4o` | Model to use |
| `language` | ❌ | `en` | Response language |
| `fail-on-critical` | ❌ | `false` | Fail the check if critical issues found |

*At least one AI provider key is required

### Config File Options

```yaml
# .github/ai-review-config.yml

# AI Model settings
model: gpt-4o                    # gpt-4o, gpt-4-turbo, claude-3-opus, ollama/llama3
temperature: 0.3                 # Lower = more focused, Higher = more creative
max_tokens: 4000                 # Max response length

# Review behavior
language: en                     # en, ru, es, de, zh, ja
review_mode: detailed            # quick, detailed, comprehensive

# Focus areas (enable/disable)
focus:
  security: true
  performance: true
  best_practices: true
  code_style: true
  documentation: false
  testing: true

# Severity configuration
severity:
  critical: true                 # 🔴 Must fix
  warning: true                  # 🟡 Should fix
  suggestion: true               # 🟢 Nice to have
  nitpick: false                 # 🔵 Minor style issues

# File filters
ignore:
  - "*.min.js"
  - "*.lock"
  - "package-lock.json"
  - "yarn.lock"
  - "**/generated/**"
  - "**/vendor/**"

include_only:                    # If set, only review these patterns
  - "src/**"
  - "lib/**"

# Limits
max_files: 20                    # Max files per review
max_diff_size: 5000              # Max diff lines to analyze
max_file_size: 1000              # Skip files larger than this

# Custom prompt (appended to base prompt)
custom_prompt: |
  Additional context for reviewer:
  - This is a fintech application
  - PCI DSS compliance is required
  - All user input must be sanitized

# Review triggers
triggers:
  on_open: true                  # Review when PR opened
  on_push: true                  # Review on new commits
  on_comment: true               # Re-review on "/ai-review" comment
```

---

## 🔒 Security

### Token Safety
- API keys are passed via GitHub Secrets (encrypted)
- Keys are never logged or exposed
- Minimal permissions required (`contents: read`, `pull-requests: write`)

### Data Privacy
- Only diff content is sent to AI provider
- No code is stored or logged
- Supports self-hosted Ollama for complete privacy

### Enterprise Options
```yaml
# Use Azure OpenAI
azure-openai-endpoint: ${{ secrets.AZURE_ENDPOINT }}
azure-openai-key: ${{ secrets.AZURE_KEY }}
azure-deployment: my-gpt4-deployment

# Use self-hosted Ollama
ollama-url: http://your-server:11434
model: ollama/codellama
```

---

## 🏗️ Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                     GitHub Actions                            │
├──────────────────────────────────────────────────────────────┤
│                                                               │
│   ┌─────────────┐    ┌─────────────┐    ┌─────────────┐     │
│   │   Trigger   │───▶│  Checkout   │───▶│  Get Diff   │     │
│   │  (PR Open)  │    │    Code     │    │   Content   │     │
│   └─────────────┘    └─────────────┘    └──────┬──────┘     │
│                                                 │             │
│                                                 ▼             │
│   ┌─────────────┐    ┌─────────────┐    ┌─────────────┐     │
│   │   Post PR   │◀───│   Format    │◀───│  AI Review  │     │
│   │   Comment   │    │   Output    │    │   Engine    │     │
│   └─────────────┘    └─────────────┘    └──────┬──────┘     │
│                                                 │             │
└─────────────────────────────────────────────────┼─────────────┘
                                                  │
                    ┌─────────────────────────────┼─────────────┐
                    │         AI Providers        │             │
                    │  ┌──────────┐ ┌──────────┐ ┌▼─────────┐  │
                    │  │  OpenAI  │ │  Claude  │ │  Ollama  │  │
                    │  │  GPT-4   │ │  Opus    │ │  Local   │  │
                    │  └──────────┘ └──────────┘ └──────────┘  │
                    └───────────────────────────────────────────┘
```

### Components

```
ai-code-reviewer/
├── action.yml                 # GitHub Action definition
├── src/
│   ├── index.ts              # Entry point
│   ├── config.ts             # Configuration loader
│   ├── diff-parser.ts        # Parse git diff
│   ├── ai-client.ts          # AI provider abstraction
│   │   ├── openai.ts
│   │   ├── anthropic.ts
│   │   └── ollama.ts
│   ├── reviewer.ts           # Main review logic
│   ├── formatter.ts          # Format output for PR comment
│   └── github.ts             # GitHub API interactions
├── prompts/
│   ├── base.txt              # Base review prompt
│   ├── security.txt          # Security-focused additions
│   └── performance.txt       # Performance-focused additions
├── dist/                     # Compiled action
├── tests/
├── package.json
└── README.md
```

---

## 📝 Custom Prompts

### Default Base Prompt

```
You are an expert code reviewer with deep knowledge of software engineering best practices.

Review the following code changes and provide:
1. A brief summary of the changes
2. Any issues found (categorized by severity)
3. Suggestions for improvement

For each issue, provide:
- Severity: critical/warning/suggestion
- Category: security/performance/style/best-practice
- File and line number
- Clear explanation of the problem
- Suggested fix (if applicable)

Be constructive and helpful. Focus on important issues, not nitpicks.
```

### Example Custom Prompts

**For Fintech Projects:**
```yaml
custom_prompt: |
  This is a fintech application handling sensitive financial data.
  Pay special attention to:
  - PCI DSS compliance
  - SQL injection vulnerabilities
  - Proper encryption of sensitive data
  - Audit logging requirements
  - Input validation for financial amounts
```

**For React Projects:**
```yaml
custom_prompt: |
  This is a React application. Focus on:
  - Proper use of hooks (dependencies arrays)
  - Memory leaks (useEffect cleanup)
  - Unnecessary re-renders
  - Accessibility (a11y) issues
  - Component composition patterns
```

---

## 🌍 Multi-language Support

```yaml
language: ru  # Russian
```

**Supported languages:**
- 🇺🇸 English (`en`)
- 🇷🇺 Russian (`ru`)
- 🇪🇸 Spanish (`es`)
- 🇩🇪 German (`de`)
- 🇨🇳 Chinese (`zh`)
- 🇯🇵 Japanese (`ja`)
- 🇫🇷 French (`fr`)
- 🇵🇹 Portuguese (`pt`)

---

## 💰 Cost Estimation

| Model | Cost per 1K tokens | Avg PR Review | Monthly (100 PRs) |
|-------|-------------------|---------------|-------------------|
| GPT-4o | $0.005 / $0.015 | ~$0.05 | ~$5 |
| GPT-4 Turbo | $0.01 / $0.03 | ~$0.10 | ~$10 |
| Claude 3 Opus | $0.015 / $0.075 | ~$0.15 | ~$15 |
| Ollama (local) | Free | Free | Free |

---

## 🛠️ Development Roadmap

### v1.0 (MVP)
- [x] Basic GitHub Action structure
- [x] OpenAI integration
- [x] Parse git diff
- [x] Post PR comments
- [x] Basic configuration

### v1.1
- [ ] Anthropic (Claude) support
- [ ] Ollama support
- [ ] Custom prompts
- [ ] Multi-language responses

### v1.2
- [ ] Inline comments on specific lines
- [ ] Re-review on command (`/ai-review`)
- [ ] Review summary in check status
- [ ] Ignore patterns

### v2.0
- [ ] Azure OpenAI support
- [ ] Review history & learning
- [ ] Team-specific rules
- [ ] Integration with popular linters
- [ ] Slack/Discord notifications

---

## 🤝 Contributing

Contributions are welcome! Please read our [Contributing Guide](CONTRIBUTING.md).

```bash
# Clone the repo
git clone https://github.com/username/ai-code-reviewer

# Install dependencies
npm install

# Run tests
npm test

# Build
npm run build
```

---

## 📄 License

MIT License - see [LICENSE](LICENSE)

---

## 🙏 Acknowledgments

- OpenAI for GPT-4
- Anthropic for Claude
- Ollama team for local LLM support

---

**Made with ❤️ by [Anton Bukarev](https://linkedin.com/in/antonbu)**

*If you find this useful, please ⭐ the repo!*

