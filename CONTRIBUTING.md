# Contributing to AI Code Reviewer

Thank you for considering contributing to AI Code Reviewer! This document provides guidelines and steps for contributing.

## Getting Started

1. Fork the repository
2. Clone your fork:
   ```bash
   git clone https://github.com/YOUR_USERNAME/ai-code-reviewer
   cd ai-code-reviewer
   ```
3. Install dependencies:
   ```bash
   npm install
   ```

## Development

### Project Structure

```
ai-code-reviewer/
├── src/
│   ├── index.ts          # Entry point
│   ├── types.ts          # TypeScript types
│   ├── config.ts         # Configuration loading
│   ├── diff.ts           # Diff parsing
│   ├── github.ts         # GitHub API client
│   ├── review.ts         # Review logic
│   ├── formatter.ts      # Output formatting
│   └── ai/
│       ├── base.ts       # Base AI client
│       ├── openai.ts     # OpenAI client
│       ├── anthropic.ts  # Anthropic client
│       ├── grok.ts       # Grok client
│       ├── gemini.ts     # Gemini client
│       └── ollama.ts     # Ollama client
├── tests/                # Test files
├── prompts/              # AI prompts
└── dist/                 # Compiled output
```

### Commands

```bash
# Build the action
npm run build

# Run tests
npm test

# Run tests in watch mode
npm run test:watch

# Type check
npm run lint
```

### Making Changes

1. Create a feature branch:
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. Make your changes

3. Run tests:
   ```bash
   npm test
   ```

4. Build:
   ```bash
   npm run build
   ```

5. Commit your changes:
   ```bash
   git commit -m "feat: add your feature"
   ```

6. Push to your fork:
   ```bash
   git push origin feature/your-feature-name
   ```

7. Open a Pull Request

## Commit Messages

We follow [Conventional Commits](https://www.conventionalcommits.org/):

- `feat:` - New feature
- `fix:` - Bug fix
- `docs:` - Documentation changes
- `test:` - Test changes
- `refactor:` - Code refactoring
- `chore:` - Build/tooling changes

Examples:
- `feat: add support for Gemini API`
- `fix: handle empty diff correctly`
- `docs: update README with new examples`

## Testing

- Write tests for new features
- Ensure all tests pass before submitting PR
- Test files should be in `tests/` directory
- Use descriptive test names

## Pull Request Guidelines

1. **Title**: Use a clear, descriptive title following commit message convention
2. **Description**: Explain what changes you made and why
3. **Tests**: Include tests for new functionality
4. **Documentation**: Update README if needed
5. **Build**: Make sure `npm run build` succeeds

## Reporting Bugs

When reporting bugs, please include:
- Node.js version
- GitHub Actions runner (ubuntu-latest, etc.)
- AI provider and model used
- Steps to reproduce
- Expected vs actual behavior
- Error messages if any

## Feature Requests

We welcome feature requests! Please:
- Check if the feature is already requested
- Provide a clear use case
- Explain the expected behavior

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
