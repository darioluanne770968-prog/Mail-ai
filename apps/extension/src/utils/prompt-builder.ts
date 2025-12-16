import type { ToneType, LengthType } from '~/types';

export const TONE_DESCRIPTIONS: Record<ToneType, string> = {
  formal: 'Professional and business-appropriate, using proper grammar and structured sentences',
  friendly: 'Warm and personable while remaining professional, conversational tone',
  concise: 'Brief and to the point, minimal words while keeping the message clear',
  detailed: 'Comprehensive and thorough, providing full explanations and context',
  casual: 'Relaxed and informal, using everyday language',
};

export const LENGTH_DESCRIPTIONS: Record<LengthType, string> = {
  short: '1-2 sentences',
  medium: '1 paragraph (3-5 sentences)',
  long: 'Multiple paragraphs with full detail',
};

export function buildReplyPrompt(params: {
  emailContent: string;
  threadContext?: string;
  tone: ToneType;
  length: LengthType;
  language?: string;
}): string {
  const { emailContent, threadContext, tone, length, language } = params;

  return `You are an expert email assistant. Generate a professional email reply based on the following:

## Original Email:
${emailContent}

${threadContext ? `## Previous Thread Context:\n${threadContext}` : ''}

## Requirements:
- Tone: ${tone} (${TONE_DESCRIPTIONS[tone]})
- Length: ${length} (${LENGTH_DESCRIPTIONS[length]})
- Language: ${language || 'Same as the original email'}

## Guidelines:
- Match the language of the original email unless specified otherwise
- Do NOT include placeholder text like [Your Name] or [Company Name]
- Do NOT include subject line
- Be helpful and address all questions/concerns from the original email
- Maintain appropriate professionalism

Generate 2 reply options with slightly different approaches. Return as JSON:
{
  "replies": [
    { "content": "reply text here", "tone": "${tone}" }
  ]
}`;
}

export function buildComposePrompt(params: {
  description: string;
  tone: ToneType;
  length: LengthType;
  language?: string;
}): string {
  const { description, tone, length, language } = params;

  return `You are an expert email writer. Draft a new email based on the following:

## User's Description:
${description}

## Requirements:
- Tone: ${tone} (${TONE_DESCRIPTIONS[tone]})
- Length: ${length} (${LENGTH_DESCRIPTIONS[length]})
- Language: ${language || 'English'}

## Guidelines:
- Generate both a subject line and email body
- Do NOT include placeholder text
- Be clear and purposeful
- Include appropriate greeting and sign-off

Return as JSON:
{
  "subject": "email subject here",
  "body": "email body here"
}`;
}

export function buildSummarizePrompt(params: {
  emailContent: string;
  type: 'single' | 'thread';
}): string {
  const { emailContent, type } = params;

  return `You are an expert at extracting key information from emails.

## Email${type === 'thread' ? ' Thread' : ''}:
${emailContent}

## Task:
Analyze the email${type === 'thread' ? ' thread' : ''} and provide:
1. A brief summary (2-3 sentences max)
2. Key points as bullet points
3. Action items (things that need to be done)
4. Important entities (dates, amounts, names, deadlines)

Return as JSON:
{
  "summary": "Brief overview here",
  "keyPoints": ["point 1", "point 2"],
  "actionItems": ["action 1", "action 2"],
  "entities": {
    "dates": ["date strings"],
    "amounts": ["money amounts"],
    "people": ["names"],
    "deadlines": ["deadline strings"],
    "locations": ["location strings"]
  }
}`;
}

export function buildAnalyzePrompt(emailContent: string): string {
  return `Analyze this email and provide:

## Email:
${emailContent}

## Analysis Required:
1. Sentiment (positive/neutral/negative/urgent)
2. Urgency level (low/medium/high/critical)
3. Category (work/personal/newsletter/promotional/support/other)
4. Key entities (dates, amounts, people, deadlines, locations)

Return as JSON:
{
  "sentiment": "positive|neutral|negative|urgent",
  "urgency": "low|medium|high|critical",
  "category": "category name",
  "entities": {
    "dates": [],
    "amounts": [],
    "people": [],
    "deadlines": [],
    "locations": []
  }
}`;
}

export function buildImprovePrompt(params: {
  content: string;
  action: 'grammar' | 'professional' | 'expand' | 'shorten' | 'translate';
  targetLanguage?: string;
}): string {
  const { content, action, targetLanguage } = params;

  const actionInstructions: Record<string, string> = {
    grammar: 'Fix all grammar, spelling, and punctuation errors while maintaining the original meaning and tone.',
    professional: 'Rewrite in a professional business style with formal language, clear structure, and appropriate greetings/closings.',
    expand: 'Expand with more detail and context, elaborating on key points while maintaining the same tone. Make it approximately 2x longer.',
    shorten: 'Condense to essential points only, removing redundant phrases. Aim for 50% of original length.',
    translate: `Translate to ${targetLanguage || 'English'} while maintaining the original tone and meaning.`,
  };

  return `${actionInstructions[action]}

## Original Content:
${content}

Return as JSON:
{
  "improvedContent": "improved text here",
  "changes": ["list of changes made"]
}`;
}
