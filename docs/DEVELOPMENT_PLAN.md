# 🛠️ План разработки AI Code Reviewer

## Оценка времени

| Фаза | Время | Описание |
|------|-------|----------|
| MVP | 2-3 дня | Базовый функционал |
| Полировка | 1-2 дня | README, демо, тесты |
| Запуск | 1 день | Публикация, продвижение |
| **Итого** | **4-6 дней** | До первого релиза |

---

## Фаза 1: MVP (2-3 дня)

### День 1: Структура и базовый функционал

```bash
# Создать репозиторий
mkdir ai-code-reviewer
cd ai-code-reviewer
npm init -y
```

#### 1.1 Структура проекта
```
ai-code-reviewer/
├── action.yml              # GitHub Action metadata
├── src/
│   ├── index.ts           # Entry point
│   ├── config.ts          # Load config from repo
│   ├── diff.ts            # Parse git diff
│   ├── ai.ts              # AI client (OpenAI)
│   ├── review.ts          # Build review prompt
│   ├── comment.ts         # Post GitHub comment
│   └── types.ts           # TypeScript types
├── package.json
├── tsconfig.json
└── README.md
```

#### 1.2 action.yml
```yaml
name: 'AI Code Reviewer'
description: 'Automated AI-powered code review for your pull requests'
author: 'Anton Bukarev'

branding:
  icon: 'code'
  color: 'purple'

inputs:
  github-token:
    description: 'GitHub token for PR comments'
    required: true
  openai-api-key:
    description: 'OpenAI API key'
    required: true
  config-path:
    description: 'Path to config file'
    required: false
    default: '.github/ai-review-config.yml'
  model:
    description: 'AI model to use'
    required: false
    default: 'gpt-4o'
  language:
    description: 'Response language'
    required: false
    default: 'en'

runs:
  using: 'node20'
  main: 'dist/index.js'
```

#### 1.3 Основные зависимости
```json
{
  "dependencies": {
    "@actions/core": "^1.10.0",
    "@actions/github": "^6.0.0",
    "openai": "^4.20.0",
    "yaml": "^2.3.0"
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
    "typescript": "^5.0.0",
    "@vercel/ncc": "^0.38.0"
  }
}
```

### День 2: AI интеграция и форматирование

#### 2.1 Промпт для review
```typescript
// src/prompts.ts
export const BASE_PROMPT = `
You are an expert code reviewer. Analyze the following code changes and provide a structured review.

## Instructions
- Focus on important issues, not minor style nitpicks
- Be constructive and explain WHY something is a problem
- Provide specific suggestions for fixes
- Categorize issues by severity

## Output Format
Respond in JSON format:
{
  "summary": "Brief summary of changes",
  "issues": [
    {
      "severity": "critical|warning|suggestion",
      "category": "security|performance|style|logic|best-practice",
      "file": "path/to/file.ts",
      "line": 42,
      "title": "Brief issue title",
      "description": "Detailed explanation",
      "suggestion": "How to fix (optional)"
    }
  ],
  "positives": ["Good things about the code"],
  "overall_assessment": "approve|request_changes|comment"
}
`;
```

#### 2.2 Форматирование комментария
```typescript
// src/formatter.ts
export function formatReviewComment(review: ReviewResult): string {
  let comment = `## 🤖 AI Code Review\n\n`;
  
  comment += `### Summary\n${review.summary}\n\n`;
  
  if (review.issues.length > 0) {
    comment += `### Issues Found\n\n`;
    for (const issue of review.issues) {
      const emoji = getSeverityEmoji(issue.severity);
      comment += `${emoji} **${issue.category}** (\`${issue.file}:${issue.line}\`)\n`;
      comment += `${issue.description}\n`;
      if (issue.suggestion) {
        comment += `> 💡 Suggestion: ${issue.suggestion}\n`;
      }
      comment += `\n`;
    }
  }
  
  if (review.positives.length > 0) {
    comment += `### ✅ Good Things\n`;
    for (const positive of review.positives) {
      comment += `- ${positive}\n`;
    }
  }
  
  return comment;
}
```

### День 3: Тестирование и сборка

```bash
# Build action
npm run build  # Компилирует в dist/

# Test locally (с act)
act pull_request -s OPENAI_API_KEY=xxx
```

---

## Фаза 2: Полировка (1-2 дня)

### README.md
- [ ] GIF демо (записать через LICEcap или asciinema)
- [ ] Badges (stars, license, marketplace)
- [ ] Примеры использования
- [ ] FAQ секция

### Документация
- [ ] CONTRIBUTING.md
- [ ] LICENSE (MIT)
- [ ] CHANGELOG.md
- [ ] Examples в отдельной папке

### Тесты
- [ ] Unit tests для parser
- [ ] Mock tests для AI client
- [ ] Integration test с реальным PR

---

## Фаза 3: Запуск (1 день)

### Подготовка
- [ ] Создать репозиторий на GitHub
- [ ] Опубликовать в GitHub Marketplace
- [ ] Подготовить посты для продвижения

### День запуска

**Утро (14:00 UTC = вечер по Москве):**

1. **Hacker News**
```
Title: Show HN: AI Code Reviewer – Automated code review with GPT-4 for your PRs

I built a GitHub Action that reviews your pull requests using AI.
- Just add a workflow file
- Customizable prompts
- Supports multiple AI providers
- Works with any language

GitHub: [link]
```

2. **Reddit**
- r/programming
- r/github
- r/devops
- r/MachineLearning

3. **Twitter/X**
```
🚀 Just launched AI Code Reviewer!

Get automated AI-powered code reviews on every PR.

✅ GPT-4/Claude support
✅ Custom review guidelines
✅ Security & performance focus
✅ Free for open source

GitHub: [link]

#OpenSource #AI #DevTools
```

**Вечер:**
- Dev.to статья
- LinkedIn пост
- Product Hunt (можно на следующий день)

---

## Метрики успеха

| Период | Цель Stars | Действия |
|--------|------------|----------|
| Неделя 1 | 100-300 | HN, Reddit, Twitter |
| Месяц 1 | 500-1000 | Dev.to, YouTube видео |
| Месяц 3 | 1000-3000 | Product Hunt, интеграции |
| Месяц 6 | 3000-5000 | Фичи, community |

---

## Технические детали

### Получение diff
```typescript
import * as github from '@actions/github';

async function getPRDiff(token: string): Promise<string> {
  const octokit = github.getOctokit(token);
  const context = github.context;
  
  const { data: diff } = await octokit.rest.pulls.get({
    owner: context.repo.owner,
    repo: context.repo.repo,
    pull_number: context.payload.pull_request!.number,
    mediaType: { format: 'diff' }
  });
  
  return diff as unknown as string;
}
```

### Вызов OpenAI
```typescript
import OpenAI from 'openai';

async function getAIReview(diff: string, config: Config): Promise<ReviewResult> {
  const openai = new OpenAI({ apiKey: config.openaiApiKey });
  
  const prompt = buildPrompt(diff, config);
  
  const response = await openai.chat.completions.create({
    model: config.model,
    messages: [
      { role: 'system', content: BASE_PROMPT },
      { role: 'user', content: prompt }
    ],
    temperature: 0.3,
    response_format: { type: 'json_object' }
  });
  
  return JSON.parse(response.choices[0].message.content!);
}
```

### Постинг комментария
```typescript
async function postComment(token: string, body: string): Promise<void> {
  const octokit = github.getOctokit(token);
  const context = github.context;
  
  // Find existing AI review comment
  const { data: comments } = await octokit.rest.issues.listComments({
    owner: context.repo.owner,
    repo: context.repo.repo,
    issue_number: context.payload.pull_request!.number
  });
  
  const existingComment = comments.find(c => 
    c.body?.includes('🤖 AI Code Review')
  );
  
  if (existingComment) {
    // Update existing
    await octokit.rest.issues.updateComment({
      owner: context.repo.owner,
      repo: context.repo.repo,
      comment_id: existingComment.id,
      body
    });
  } else {
    // Create new
    await octokit.rest.issues.createComment({
      owner: context.repo.owner,
      repo: context.repo.repo,
      issue_number: context.payload.pull_request!.number,
      body
    });
  }
}
```

---

## Конкурентный анализ

| Проект | Stars | Отличие нашего |
|--------|-------|----------------|
| coderabbitai | 5k+ | Платный, мы бесплатные |
| pr-agent | 3k+ | Сложная настройка, мы проще |
| ai-pr-reviewer | 1k+ | Нет кастомных промптов |

**Наши преимущества:**
1. Кастомные промпты в репозитории
2. Поддержка нескольких AI провайдеров
3. Простая настройка (1 файл)
4. Multi-language responses
5. Открытый исходный код

---

## Чеклист запуска

- [ ] Репозиторий создан
- [ ] Код написан и собран
- [ ] README с GIF демо
- [ ] Опубликован в GitHub Marketplace
- [ ] Пост на Hacker News готов
- [ ] Посты для Reddit готовы
- [ ] Twitter тред готов
- [ ] Dev.to статья готова

