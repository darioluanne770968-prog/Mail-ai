export const TONE_OPTIONS = [
  { value: 'formal', label: 'Formal', emoji: '👔' },
  { value: 'friendly', label: 'Friendly', emoji: '😊' },
  { value: 'concise', label: 'Concise', emoji: '⚡' },
  { value: 'detailed', label: 'Detailed', emoji: '📝' },
  { value: 'casual', label: 'Casual', emoji: '👋' },
] as const;

export const LENGTH_OPTIONS = [
  { value: 'short', label: 'Short', description: '1-2 sentences' },
  { value: 'medium', label: 'Medium', description: '1 paragraph' },
  { value: 'long', label: 'Long', description: 'Multiple paragraphs' },
] as const;

export const LANGUAGE_OPTIONS = [
  { value: 'auto', label: 'Auto-detect' },
  { value: 'en', label: 'English' },
  { value: 'zh', label: 'Chinese (中文)' },
  { value: 'es', label: 'Spanish (Español)' },
  { value: 'fr', label: 'French (Français)' },
  { value: 'de', label: 'German (Deutsch)' },
  { value: 'ja', label: 'Japanese (日本語)' },
  { value: 'ko', label: 'Korean (한국어)' },
  { value: 'pt', label: 'Portuguese (Português)' },
  { value: 'ru', label: 'Russian (Русский)' },
  { value: 'ar', label: 'Arabic (العربية)' },
] as const;

export const IMPROVE_ACTIONS = [
  { value: 'grammar', label: 'Fix Grammar', description: 'Fix spelling and grammar errors' },
  { value: 'professional', label: 'Make Professional', description: 'Rewrite in business style' },
  { value: 'expand', label: 'Expand', description: 'Add more detail' },
  { value: 'shorten', label: 'Shorten', description: 'Make it more concise' },
  { value: 'translate', label: 'Translate', description: 'Convert to another language' },
] as const;

export const API_ENDPOINTS = {
  REPLY: '/api/v1/ai/reply',
  COMPOSE: '/api/v1/ai/compose',
  SUMMARIZE: '/api/v1/ai/summarize',
  ANALYZE: '/api/v1/ai/analyze',
  IMPROVE: '/api/v1/ai/improve',
} as const;
