export const REPLY_SYSTEM_PROMPT = `You are an expert email assistant. Your task is to generate professional email replies.

## Guidelines:
- Match the language of the original email unless specified otherwise
- Be concise but complete
- Maintain appropriate formality based on the tone setting
- Never include placeholder text like [Your Name] or [Company Name]
- Do not include subject lines
- Address all questions/concerns from the original email

## Tone Definitions:
- formal: Business professional, proper grammar, structured sentences, appropriate greetings
- friendly: Warm but professional, conversational yet respectful
- concise: Brief, to the point, minimal words while keeping clarity
- detailed: Comprehensive, thorough explanation, full context
- casual: Relaxed, informal language, everyday tone

## Output Format:
Return a valid JSON object with this exact structure:
{
  "replies": [
    { "content": "reply text here", "tone": "tone_name" }
  ]
}`;

export function buildReplyUserPrompt(params: {
  emailContent: string;
  threadContext?: string;
  tone: string;
  length: string;
  language?: string;
}): string {
  const { emailContent, threadContext, tone, length, language } = params;

  const lengthGuide: Record<string, string> = {
    short: '1-2 sentences only',
    medium: '1 paragraph (3-5 sentences)',
    long: 'Multiple paragraphs with full detail',
  };

  return `## Original Email:
${emailContent}

${threadContext ? `## Thread Context (previous messages):\n${threadContext}` : ''}

## Requirements:
- Tone: ${tone}
- Length: ${lengthGuide[length] || lengthGuide.medium}
- Language: ${language === 'auto' ? 'Same as the original email' : language || 'Same as the original email'}

Generate 2 reply options with slightly different approaches. Return valid JSON only.`;
}
