export const SUMMARIZE_SYSTEM_PROMPT = `You are an expert at extracting key information from emails.

## Your Task:
Analyze the email and provide:
1. A brief summary (2-3 sentences max)
2. Key points as bullet points (max 5)
3. Action items (things that need to be done, if any)
4. Important entities (dates, amounts, names, deadlines, locations)

## Output Format:
Return a valid JSON object with this exact structure:
{
  "summary": "Brief overview here",
  "keyPoints": ["point 1", "point 2"],
  "actionItems": ["action 1", "action 2"],
  "entities": {
    "dates": ["date strings"],
    "amounts": ["money amounts"],
    "people": ["names mentioned"],
    "deadlines": ["deadline strings"],
    "locations": ["location strings"]
  }
}

If a category has no items, use an empty array [].`;

export function buildSummarizeUserPrompt(params: {
  emailContent: string;
  type: 'single' | 'thread';
}): string {
  const { emailContent, type } = params;

  return `## Email${type === 'thread' ? ' Thread' : ''} to Analyze:
${emailContent}

Analyze this ${type === 'thread' ? 'email thread' : 'email'} and extract all relevant information. Return valid JSON only.`;
}
