# 📧 Mail AI - 完整开发规划

## 项目概述

**Mail AI** 是一个智能邮件助手浏览器扩展，支持 Gmail 和 Outlook 网页版，通过 AI 技术提升邮件处理效率。

---

## 🎯 核心功能模块

### 模块一：智能回复系统

| 功能 | 描述 | 优先级 |
|------|------|--------|
| 一键回复生成 | 分析邮件内容，生成3种不同风格的回复选项 | P0 |
| 语气选择器 | 支持：正式、友好、简洁、详细、幽默 5种语气 | P0 |
| 回复长度控制 | 短回复(1-2句)、中等(1段)、详细(多段) | P1 |
| 上下文感知 | 分析邮件线程历史，生成连贯回复 | P1 |
| 多语言支持 | 自动检测邮件语言，用相同语言回复 | P1 |
| 自定义模板 | 用户可保存常用回复模板 | P2 |

### 模块二：邮件撰写助手

| 功能 | 描述 | 优先级 |
|------|------|--------|
| 快速起草 | 输入简短描述，生成完整邮件 | P0 |
| 语法优化 | AI 自动修正语法和拼写错误 | P0 |
| 专业化改写 | 将口语化内容转为专业商务风格 | P1 |
| 主题行生成 | 根据邮件内容自动生成合适的主题 | P1 |
| 扩写/缩写 | 将简短内容扩展或精简 | P1 |
| 翻译功能 | 一键将邮件翻译成目标语言 | P2 |

### 模块三：邮件摘要与分析

| 功能 | 描述 | 优先级 |
|------|------|--------|
| 单邮件摘要 | 长邮件一键生成3-5个要点摘要 | P0 |
| 线程摘要 | 整个邮件对话的完整总结 | P0 |
| 关键信息提取 | 自动提取：日期、金额、姓名、联系方式 | P1 |
| 情感分析 | 检测发件人情绪：积极/中性/消极/紧急 | P1 |
| 行动项提取 | 识别邮件中需要执行的任务 | P1 |
| 会议信息识别 | 自动识别会议时间、地点、议程 | P2 |

### 模块四：智能邮件管理

| 功能 | 描述 | 优先级 |
|------|------|--------|
| 智能分类 | 自动分类：工作/个人/订阅/促销/重要 | P1 |
| 优先级标记 | AI 判断邮件紧急程度并标记 | P1 |
| 待办提醒 | 识别需要回复的邮件并提醒 | P2 |
| 未读摘要 | 批量显示所有未读邮件的摘要 | P2 |
| 智能搜索 | 用自然语言搜索邮件内容 | P3 |

### 模块五：个性化与设置

| 功能 | 描述 | 优先级 |
|------|------|--------|
| 用户画像学习 | 学习用户写作风格，生成更个性化回复 | P2 |
| 快捷键支持 | 自定义快捷键触发各项功能 | P1 |
| 黑名单/白名单 | 指定哪些邮件自动处理 | P2 |
| API Key 管理 | 支持用户自带 API Key | P0 |
| 使用统计 | 显示 AI 使用次数和节省时间 | P3 |

---

## 🏗 技术架构

### 整体架构图

```
┌────────────────────────────────────────────────────────────────┐
│                        浏览器扩展层                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │ Popup UI     │  │ Options Page │  │ Content Scripts      │  │
│  │ - 快速操作    │  │ - 设置页面    │  │ - Gmail 注入脚本     │  │
│  │ - 状态显示    │  │ - API配置     │  │ - Outlook 注入脚本   │  │
│  │ - 统计信息    │  │ - 偏好设置    │  │ - UI 组件注入        │  │
│  └──────────────┘  └──────────────┘  └──────────────────────┘  │
│                              │                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                   Background Service Worker               │  │
│  │  - 消息路由  - API 调用管理  - 存储管理  - 状态同步        │  │
│  └──────────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌────────────────────────────────────────────────────────────────┐
│                         后端服务层                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │ API Gateway  │  │ AI Service   │  │ User Service         │  │
│  │ - 路由转发    │  │ - Prompt管理  │  │ - 认证授权            │  │
│  │ - 限流控制    │  │ - 模型调用    │  │ - 配额管理            │  │
│  │ - 日志记录    │  │ - 结果缓存    │  │ - 偏好存储            │  │
│  └──────────────┘  └──────────────┘  └──────────────────────┘  │
│                              │                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                      数据存储层                            │  │
│  │  PostgreSQL (用户数据)  │  Redis (缓存/限流)  │  S3 (日志) │  │
│  └──────────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌────────────────────────────────────────────────────────────────┐
│                       AI 提供商层                               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │ OpenAI API   │  │ Claude API   │  │ 备用模型              │  │
│  │ GPT-4/3.5    │  │ Claude 3     │  │ Gemini/Llama         │  │
│  └──────────────┘  └──────────────┘  └──────────────────────┘  │
└────────────────────────────────────────────────────────────────┘
```

### 技术栈选择

#### 浏览器扩展 (Frontend)

| 技术 | 用途 | 理由 |
|------|------|------|
| **TypeScript** | 开发语言 | 类型安全，减少运行时错误 |
| **React 18** | UI 框架 | 组件化开发，生态丰富 |
| **Tailwind CSS** | 样式框架 | 快速开发，体积小 |
| **Vite** | 构建工具 | 快速 HMR，优秀的构建性能 |
| **Zustand** | 状态管理 | 轻量级，适合扩展开发 |
| **Plasmo** | 扩展框架 | 简化扩展开发，支持热重载 |

#### 后端服务 (Backend)

| 技术 | 用途 | 理由 |
|------|------|------|
| **Node.js** | 运行时 | 与前端统一语言栈 |
| **Fastify** | Web框架 | 高性能，TypeScript友好 |
| **Prisma** | ORM | 类型安全，开发体验好 |
| **PostgreSQL** | 主数据库 | 可靠，功能丰富 |
| **Redis** | 缓存/限流 | 高性能，支持限流算法 |
| **Docker** | 容器化 | 部署一致性 |

---

## 📁 项目目录结构

```
Mail-ai/
├── apps/
│   ├── extension/                 # 浏览器扩展
│   │   ├── src/
│   │   │   ├── background/        # Service Worker
│   │   │   │   ├── index.ts
│   │   │   │   ├── messages.ts    # 消息处理
│   │   │   │   └── api.ts         # API 调用
│   │   │   │
│   │   │   ├── contents/          # Content Scripts
│   │   │   │   ├── gmail/
│   │   │   │   │   ├── index.ts
│   │   │   │   │   ├── detector.ts    # 页面元素检测
│   │   │   │   │   ├── injector.ts    # UI 注入
│   │   │   │   │   └── extractor.ts   # 邮件内容提取
│   │   │   │   │
│   │   │   │   └── outlook/
│   │   │   │       ├── index.ts
│   │   │   │       ├── detector.ts
│   │   │   │       ├── injector.ts
│   │   │   │       └── extractor.ts
│   │   │   │
│   │   │   ├── popup/             # 弹出窗口
│   │   │   │   ├── index.tsx
│   │   │   │   ├── App.tsx
│   │   │   │   └── components/
│   │   │   │
│   │   │   ├── options/           # 设置页面
│   │   │   │   ├── index.tsx
│   │   │   │   ├── App.tsx
│   │   │   │   └── pages/
│   │   │   │
│   │   │   ├── components/        # 共享组件
│   │   │   │   ├── ui/            # 基础 UI 组件
│   │   │   │   ├── ReplyPanel.tsx
│   │   │   │   ├── SummaryCard.tsx
│   │   │   │   ├── ComposeAssist.tsx
│   │   │   │   └── ToneSelector.tsx
│   │   │   │
│   │   │   ├── hooks/             # 自定义 Hooks
│   │   │   │   ├── useAI.ts
│   │   │   │   ├── useEmail.ts
│   │   │   │   └── useSettings.ts
│   │   │   │
│   │   │   ├── services/          # 服务层
│   │   │   │   ├── ai.service.ts
│   │   │   │   ├── email.service.ts
│   │   │   │   └── storage.service.ts
│   │   │   │
│   │   │   ├── utils/             # 工具函数
│   │   │   │   ├── dom.ts
│   │   │   │   ├── email-parser.ts
│   │   │   │   └── prompt-builder.ts
│   │   │   │
│   │   │   ├── types/             # 类型定义
│   │   │   │   ├── email.ts
│   │   │   │   ├── ai.ts
│   │   │   │   └── settings.ts
│   │   │   │
│   │   │   └── styles/            # 全局样式
│   │   │       └── globals.css
│   │   │
│   │   ├── public/
│   │   │   └── icons/
│   │   │
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── tailwind.config.js
│   │   └── plasmo.config.ts
│   │
│   └── server/                    # 后端服务
│       ├── src/
│       │   ├── index.ts           # 入口文件
│       │   │
│       │   ├── routes/            # 路由层
│       │   │   ├── ai.routes.ts
│       │   │   ├── user.routes.ts
│       │   │   └── health.routes.ts
│       │   │
│       │   ├── controllers/       # 控制器层
│       │   │   ├── ai.controller.ts
│       │   │   └── user.controller.ts
│       │   │
│       │   ├── services/          # 服务层
│       │   │   ├── ai/
│       │   │   │   ├── index.ts
│       │   │   │   ├── openai.ts
│       │   │   │   ├── claude.ts
│       │   │   │   └── prompts/
│       │   │   │       ├── reply.ts
│       │   │   │       ├── compose.ts
│       │   │   │       ├── summarize.ts
│       │   │   │       └── analyze.ts
│       │   │   │
│       │   │   ├── user.service.ts
│       │   │   └── rate-limit.service.ts
│       │   │
│       │   ├── middleware/        # 中间件
│       │   │   ├── auth.ts
│       │   │   ├── rate-limit.ts
│       │   │   └── error-handler.ts
│       │   │
│       │   ├── models/            # 数据模型
│       │   │   └── index.ts
│       │   │
│       │   ├── utils/             # 工具函数
│       │   │   ├── logger.ts
│       │   │   └── validators.ts
│       │   │
│       │   └── config/            # 配置
│       │       ├── index.ts
│       │       └── env.ts
│       │
│       ├── prisma/
│       │   └── schema.prisma
│       │
│       ├── package.json
│       ├── tsconfig.json
│       └── Dockerfile
│
├── packages/                      # 共享包
│   └── shared/
│       ├── src/
│       │   ├── types/             # 共享类型
│       │   ├── constants/         # 共享常量
│       │   └── utils/             # 共享工具
│       └── package.json
│
├── docs/                          # 文档
│   ├── api.md
│   ├── development.md
│   └── deployment.md
│
├── docker-compose.yml
├── package.json                   # Monorepo 根配置
├── pnpm-workspace.yaml
├── turbo.json                     # Turborepo 配置
├── .env.example
├── .gitignore
└── README.md
```

---

## 🔌 API 设计

### API 端点列表

#### AI 功能端点

```
POST /api/v1/ai/reply
  - 生成邮件回复
  - Body: { email_content, thread_context?, tone, length, language }
  - Response: { replies: [{ content, tone }] }

POST /api/v1/ai/compose
  - 起草新邮件
  - Body: { description, tone, length, language }
  - Response: { subject, body }

POST /api/v1/ai/summarize
  - 生成邮件摘要
  - Body: { email_content, type: 'single' | 'thread' }
  - Response: { summary, key_points: [], action_items: [] }

POST /api/v1/ai/analyze
  - 分析邮件情感和信息
  - Body: { email_content }
  - Response: { sentiment, urgency, entities: { dates, amounts, contacts } }

POST /api/v1/ai/improve
  - 优化邮件内容
  - Body: { content, action: 'grammar' | 'professional' | 'expand' | 'shorten' }
  - Response: { improved_content, changes: [] }

POST /api/v1/ai/translate
  - 翻译邮件
  - Body: { content, target_language }
  - Response: { translated_content }
```

#### 用户端点

```
POST /api/v1/user/register
POST /api/v1/user/login
GET  /api/v1/user/profile
PUT  /api/v1/user/settings
GET  /api/v1/user/usage
```

### API 请求/响应示例

#### 生成回复示例

**Request:**
```json
{
  "email_content": "Hi, I wanted to follow up on the proposal we discussed last week. When can we schedule a meeting to finalize the details?",
  "thread_context": "Previous emails about project proposal...",
  "tone": "professional",
  "length": "medium",
  "language": "en"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "replies": [
      {
        "content": "Hi,\n\nThank you for following up. I'd be happy to schedule a meeting to finalize the proposal details.\n\nI'm available this Thursday at 2 PM or Friday at 10 AM. Please let me know which time works best for you, or feel free to suggest an alternative.\n\nBest regards",
        "tone": "professional"
      },
      {
        "content": "Hi,\n\nThanks for reaching out! Let's definitely get that meeting on the calendar.\n\nHow does Thursday afternoon look for you? I'm flexible on timing.\n\nLooking forward to it!",
        "tone": "friendly"
      }
    ]
  },
  "usage": {
    "tokens_used": 250,
    "remaining_quota": 9750
  }
}
```

---

## 🎨 UI/UX 设计规范

### 设计原则

1. **非侵入性** - 不干扰原有邮件界面
2. **即时响应** - 操作反馈在 200ms 内
3. **一致性** - 与 Gmail/Outlook 视觉风格协调
4. **可访问性** - 支持键盘导航和屏幕阅读器

### 主要 UI 组件

#### 1. 浮动操作按钮 (FAB)
```
位置: 邮件编辑器右下角
样式: 圆形按钮，渐变紫色背景
状态: 默认/悬停/加载中/禁用
```

#### 2. AI 面板
```
位置: 邮件内容右侧滑出
尺寸: 400px 宽度
内容:
  - 功能标签页 (回复/摘要/分析)
  - 操作区域
  - 结果显示区
  - 插入/复制按钮
```

#### 3. 快捷工具栏
```
位置: 邮件编辑器工具栏内
按钮:
  - ✨ AI 回复
  - 📝 改写优化
  - 🌐 翻译
  - 📋 摘要
```

### 颜色规范

```css
/* 主色调 */
--primary: #6366f1;        /* 靛蓝色 - 主操作 */
--primary-hover: #4f46e5;
--primary-light: #e0e7ff;

/* 语气颜色 */
--tone-formal: #3b82f6;    /* 蓝色 - 正式 */
--tone-friendly: #10b981;  /* 绿色 - 友好 */
--tone-concise: #f59e0b;   /* 橙色 - 简洁 */

/* 状态颜色 */
--success: #22c55e;
--warning: #eab308;
--error: #ef4444;

/* 中性色 */
--text-primary: #1f2937;
--text-secondary: #6b7280;
--background: #ffffff;
--border: #e5e7eb;
```

---

## 📊 数据库设计

### ER 图

```
┌──────────────────┐     ┌──────────────────┐
│      users       │     │    api_keys      │
├──────────────────┤     ├──────────────────┤
│ id (PK)          │────<│ id (PK)          │
│ email            │     │ user_id (FK)     │
│ password_hash    │     │ key_hash         │
│ created_at       │     │ name             │
│ updated_at       │     │ created_at       │
└──────────────────┘     │ last_used_at     │
         │               └──────────────────┘
         │
         ▼
┌──────────────────┐     ┌──────────────────┐
│  user_settings   │     │   usage_logs     │
├──────────────────┤     ├──────────────────┤
│ id (PK)          │     │ id (PK)          │
│ user_id (FK)     │────<│ user_id (FK)     │
│ default_tone     │     │ action_type      │
│ default_language │     │ tokens_used      │
│ ai_provider      │     │ model            │
│ custom_prompts   │     │ created_at       │
│ shortcuts        │     └──────────────────┘
└──────────────────┘
         │
         ▼
┌──────────────────┐
│    templates     │
├──────────────────┤
│ id (PK)          │
│ user_id (FK)     │
│ name             │
│ content          │
│ category         │
│ created_at       │
└──────────────────┘
```

### Prisma Schema

```prisma
// prisma/schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id           String        @id @default(cuid())
  email        String        @unique
  passwordHash String        @map("password_hash")
  createdAt    DateTime      @default(now()) @map("created_at")
  updatedAt    DateTime      @updatedAt @map("updated_at")

  settings     UserSettings?
  apiKeys      ApiKey[]
  usageLogs    UsageLog[]
  templates    Template[]

  @@map("users")
}

model UserSettings {
  id              String   @id @default(cuid())
  userId          String   @unique @map("user_id")
  defaultTone     String   @default("professional") @map("default_tone")
  defaultLanguage String   @default("en") @map("default_language")
  aiProvider      String   @default("openai") @map("ai_provider")
  customPrompts   Json?    @map("custom_prompts")
  shortcuts       Json?

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@map("user_settings")
}

model ApiKey {
  id         String    @id @default(cuid())
  userId     String    @map("user_id")
  keyHash    String    @map("key_hash")
  name       String
  createdAt  DateTime  @default(now()) @map("created_at")
  lastUsedAt DateTime? @map("last_used_at")

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@map("api_keys")
}

model UsageLog {
  id         String   @id @default(cuid())
  userId     String   @map("user_id")
  actionType String   @map("action_type")
  tokensUsed Int      @map("tokens_used")
  model      String
  createdAt  DateTime @default(now()) @map("created_at")

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@map("usage_logs")
}

model Template {
  id        String   @id @default(cuid())
  userId    String   @map("user_id")
  name      String
  content   String
  category  String?
  createdAt DateTime @default(now()) @map("created_at")

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@map("templates")
}
```

---

## 🤖 AI Prompt 工程

### Prompt 设计原则

1. **结构化输出** - 使用 JSON 格式确保可解析
2. **角色设定** - 明确 AI 的角色和约束
3. **示例驱动** - 提供 few-shot 示例
4. **语气控制** - 通过详细描述控制输出风格

### 核心 Prompt 模板

#### 回复生成 Prompt

```typescript
// services/ai/prompts/reply.ts

export const REPLY_SYSTEM_PROMPT = `You are an expert email assistant. Your task is to generate professional email replies.

## Guidelines:
- Match the language of the original email
- Be concise but complete
- Maintain appropriate formality based on the tone setting
- Never include placeholder text like [Your Name]
- Do not repeat information unnecessarily

## Tone Definitions:
- formal: Business professional, proper grammar, structured
- friendly: Warm but professional, conversational
- concise: Brief, to the point, minimal words
- detailed: Comprehensive, thorough explanation
- casual: Relaxed, informal language

## Output Format:
Return a JSON object with this structure:
{
  "replies": [
    { "content": "reply text", "tone": "tone_name" }
  ]
}`;

export const buildReplyPrompt = (params: {
  emailContent: string;
  threadContext?: string;
  tone: string;
  length: 'short' | 'medium' | 'long';
  language: string;
}) => {
  return `
## Original Email:
${params.emailContent}

${params.threadContext ? `## Thread Context:\n${params.threadContext}` : ''}

## Requirements:
- Tone: ${params.tone}
- Length: ${params.length} (short: 1-2 sentences, medium: 1 paragraph, long: multiple paragraphs)
- Language: ${params.language}

Generate 2 reply options with slightly different approaches.
`;
};
```

#### 摘要生成 Prompt

```typescript
// services/ai/prompts/summarize.ts

export const SUMMARIZE_SYSTEM_PROMPT = `You are an expert at extracting key information from emails.

## Your Task:
Analyze the email and provide:
1. A brief summary (2-3 sentences)
2. Key points as bullet points
3. Action items (things that need to be done)
4. Important entities (dates, amounts, names, deadlines)

## Output Format:
{
  "summary": "Brief overview...",
  "keyPoints": ["point 1", "point 2"],
  "actionItems": ["action 1", "action 2"],
  "entities": {
    "dates": ["2024-01-15"],
    "amounts": ["$5,000"],
    "people": ["John Smith"],
    "deadlines": ["Friday EOD"]
  }
}`;
```

#### 邮件优化 Prompt

```typescript
// services/ai/prompts/improve.ts

export const IMPROVE_PROMPTS = {
  grammar: `Fix all grammar, spelling, and punctuation errors.
Maintain the original meaning and tone.
Return the corrected text with a list of changes made.`,

  professional: `Rewrite this email in a professional business style.
- Use formal language
- Structure with clear paragraphs
- Remove colloquialisms
- Add appropriate greetings/closings if missing`,

  expand: `Expand this email with more detail and context.
- Add supporting information
- Elaborate on key points
- Maintain the same tone
- Make it approximately 2x longer`,

  shorten: `Condense this email to its essential points.
- Remove redundant phrases
- Combine related sentences
- Keep only critical information
- Aim for 50% of original length`
};
```

---

## 🔒 安全设计

### 安全措施清单

| 领域 | 措施 | 实现方式 |
|------|------|----------|
| **数据传输** | HTTPS 加密 | TLS 1.3 |
| **API 认证** | JWT Token | RS256 签名 |
| **密码存储** | 加密哈希 | bcrypt (cost=12) |
| **速率限制** | 请求频率控制 | Redis 滑动窗口 |
| **输入验证** | 请求数据校验 | Zod schema |
| **XSS 防护** | 内容转义 | DOMPurify |
| **CORS** | 跨域控制 | 白名单域名 |
| **API Key** | 密钥管理 | 加密存储 |

### 隐私保护

```typescript
// 邮件内容处理原则
const PRIVACY_RULES = {
  // 不存储原始邮件内容
  storeEmailContent: false,

  // 只记录使用统计，不记录具体内容
  logLevel: 'metadata_only',

  // 敏感信息检测和警告
  detectSensitiveInfo: true,

  // 用户可随时删除所有数据
  allowDataDeletion: true,

  // 默认不发送遥测
  telemetryOptIn: false
};
```

---

## 📅 开发阶段规划

### Phase 1: 基础框架 (MVP)

**目标**: 实现基本的回复生成功能

```
Week 1-2: 项目初始化
├── 搭建 Monorepo 结构
├── 配置 TypeScript, ESLint, Prettier
├── 创建浏览器扩展基础框架
└── 设置 CI/CD 流水线

Week 3-4: Gmail 集成
├── 实现 Gmail 页面检测
├── 开发邮件内容提取器
├── 注入 AI 按钮到界面
└── 实现基础 UI 组件

Week 5-6: 核心 AI 功能
├── 设计 AI 服务架构
├── 实现回复生成功能
├── 开发 Prompt 模板系统
└── 添加语气和长度选项

Week 7-8: 后端服务
├── 搭建 Fastify 服务器
├── 实现 API 路由
├── 添加用户认证
└── 配置数据库
```

**交付物**:
- Chrome 扩展可安装包
- 基本回复生成功能
- Gmail 网页版支持

---

### Phase 2: 功能扩展

**目标**: 添加摘要、撰写等核心功能

```
Week 9-10: 邮件摘要
├── 单邮件摘要功能
├── 线程摘要功能
├── 关键信息提取
└── 行动项识别

Week 11-12: 邮件撰写
├── 快速起草功能
├── 主题行生成
├── 语法优化功能
└── 专业化改写

Week 13-14: Outlook 支持
├── Outlook 页面适配
├── 内容提取器开发
├── UI 组件调整
└── 兼容性测试

Week 15-16: 用户设置
├── 设置页面开发
├── 自定义快捷键
├── API Key 管理
└── 偏好设置存储
```

**交付物**:
- 完整的核心功能
- Outlook 支持
- 用户设置系统

---

### Phase 3: 高级功能

**目标**: 添加智能管理和个性化功能

```
Week 17-18: 智能分类
├── 邮件分类算法
├── 优先级判断
├── 批量处理功能
└── 未读摘要视图

Week 19-20: 翻译功能
├── 语言检测
├── 多语言翻译
├── 翻译历史
└── 术语表支持

Week 21-22: 个性化
├── 用户风格学习
├── 自定义模板
├── 智能建议
└── 使用分析

Week 23-24: 优化和发布
├── 性能优化
├── 安全审计
├── 文档完善
└── 商店发布
```

**交付物**:
- 完整功能版本
- Chrome/Edge 商店上架
- 用户文档

---

## ✅ 功能验收标准

### 智能回复

| 测试项 | 验收标准 |
|--------|----------|
| 响应时间 | < 3秒生成回复 |
| 准确性 | 回复内容与原邮件相关度 > 90% |
| 语气准确 | 5种语气可明显区分 |
| 语言支持 | 支持中/英/日/韩等主流语言 |
| 多选项 | 每次生成 2-3 个回复选项 |

### 邮件摘要

| 测试项 | 验收标准 |
|--------|----------|
| 摘要质量 | 覆盖 90% 以上关键信息 |
| 行动项提取 | 准确识别待办事项 |
| 实体提取 | 日期、金额等提取准确率 > 95% |
| 线程处理 | 支持 20+ 封邮件的线程 |

### 性能指标

| 指标 | 目标值 |
|------|--------|
| 扩展加载时间 | < 500ms |
| UI 响应时间 | < 100ms |
| API 响应时间 | < 2s (P95) |
| 内存占用 | < 50MB |
| 错误率 | < 0.1% |

---

## 🚀 部署架构

### 生产环境架构

```
                        ┌─────────────────┐
                        │   Cloudflare    │
                        │   (CDN + WAF)   │
                        └────────┬────────┘
                                 │
                        ┌────────▼────────┐
                        │   Load Balancer │
                        │   (AWS ALB)     │
                        └────────┬────────┘
                                 │
              ┌──────────────────┼──────────────────┐
              │                  │                  │
     ┌────────▼────────┐ ┌──────▼──────┐ ┌────────▼────────┐
     │   API Server 1  │ │ API Server 2│ │   API Server N  │
     │   (ECS Fargate) │ │             │ │                 │
     └────────┬────────┘ └──────┬──────┘ └────────┬────────┘
              │                  │                  │
              └──────────────────┼──────────────────┘
                                 │
              ┌──────────────────┼──────────────────┐
              │                  │                  │
     ┌────────▼────────┐ ┌──────▼──────┐ ┌────────▼────────┐
     │   PostgreSQL    │ │    Redis    │ │   S3 (Logs)     │
     │   (RDS)         │ │ (ElastiCache)│ │                 │
     └─────────────────┘ └─────────────┘ └─────────────────┘
```

### Docker Compose 配置

```yaml
# docker-compose.yml
version: '3.8'

services:
  api:
    build:
      context: ./apps/server
      dockerfile: Dockerfile
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - DATABASE_URL=postgresql://user:pass@db:5432/mailai
      - REDIS_URL=redis://redis:6379
      - OPENAI_API_KEY=${OPENAI_API_KEY}
    depends_on:
      - db
      - redis
    restart: unless-stopped

  db:
    image: postgres:15-alpine
    volumes:
      - postgres_data:/var/lib/postgresql/data
    environment:
      - POSTGRES_USER=user
      - POSTGRES_PASSWORD=pass
      - POSTGRES_DB=mailai
    restart: unless-stopped

  redis:
    image: redis:7-alpine
    volumes:
      - redis_data:/data
    restart: unless-stopped

volumes:
  postgres_data:
  redis_data:
```

---

## 📈 商业化考虑

### 定价模型

| 计划 | 价格 | 包含内容 |
|------|------|----------|
| **Free** | $0/月 | 50次 AI 调用/月，基础功能 |
| **Pro** | $9.9/月 | 无限 AI 调用，所有功能，优先支持 |
| **Team** | $7.9/用户/月 | Pro + 团队管理，共享模板，统计分析 |
| **Enterprise** | 联系销售 | 私有部署，自定义集成，SLA |

### 成本估算

```
每 1000 个活跃用户/月:
├── AI API 成本: ~$200 (GPT-3.5) / ~$800 (GPT-4)
├── 服务器成本: ~$100
├── 数据库成本: ~$50
└── 其他服务: ~$50

盈亏平衡点: 约 50 个 Pro 用户 或 200 个混合用户
```

---

## 📝 下一步行动

1. **确认技术栈** - 确定是否使用推荐的技术方案
2. **开始项目初始化** - 创建 Monorepo 结构和基础配置
3. **开发 MVP** - 实现 Gmail + 回复生成的最小可用版本
4. **迭代优化** - 根据反馈持续改进

---

*文档版本: 1.0*
*最后更新: 2024*
