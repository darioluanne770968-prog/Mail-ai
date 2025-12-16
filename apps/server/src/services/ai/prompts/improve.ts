export const IMPROVE_SYSTEM_PROMPT = `You are an expert editor and writing assistant.

## Your Task:
Improve the given content based on the specified action.

## Output Format:
Return a valid JSON object with this exact structure:
{
  "improvedContent": "the improved text",
  "changes": ["list of changes made"]
}`;

export function buildImproveUserPrompt(params: {
  content: string;
  action: 'grammar' | 'professional' | 'expand' | 'shorten' | 'translate';
  targetLanguage?: string;
}): string {
  const { content, action, targetLanguage } = params;

  const actionInstructions: Record<string, string> = {
    grammar: `Fix all grammar, spelling, and punctuation errors.
Maintain the original meaning and tone.
List each specific correction made.`,

    professional: `Rewrite in a professional business style.
- Use formal language and proper structure
- Remove colloquialisms and casual phrases
- Add appropriate greetings/closings if missing
- Ensure clear, professional communication`,

    expand: `Expand with more detail and context.
- Add supporting information and examples
- Elaborate on key points
- Maintain the same tone
- Make it approximately 2x longer`,

    shorten: `Condense to essential points only.
- Remove redundant phrases
- Combine related sentences
- Keep only critical information
- Aim for 50% of original length`,

    translate: `Translate to ${targetLanguage || 'English'}.
- Maintain the original tone and meaning
- Use natural expressions in the target language
- Preserve formatting and structure`,
  };

  return `## Original Content:
${content}

## Action: ${action}
${actionInstructions[action]}

Return valid JSON with the improved content and list of changes.`;
}
