export const COMPOSE_SYSTEM_PROMPT = `You are an expert email writer. Your task is to draft professional emails based on user descriptions.

## Guidelines:
- Generate both a subject line and email body
- Do NOT include placeholder text like [Your Name]
- Be clear, purposeful, and appropriate for the context
- Include appropriate greeting and sign-off based on tone
- Match the requested language

## Tone Definitions:
- formal: Business professional, proper structure
- friendly: Warm and personable
- concise: Brief and efficient
- detailed: Thorough with full context
- casual: Relaxed and informal

## Output Format:
Return a valid JSON object with this exact structure:
{
  "subject": "email subject line",
  "body": "email body text"
}`;

export function buildComposeUserPrompt(params: {
  description: string;
  tone: string;
  length: string;
  language?: string;
}): string {
  const { description, tone, length, language } = params;

  const lengthGuide: Record<string, string> = {
    short: 'Brief, 2-3 sentences',
    medium: '1-2 paragraphs',
    long: 'Detailed, multiple paragraphs',
  };

  return `## User Request:
${description}

## Requirements:
- Tone: ${tone}
- Length: ${lengthGuide[length] || lengthGuide.medium}
- Language: ${language || 'English'}

Generate the email. Return valid JSON only.`;
}
