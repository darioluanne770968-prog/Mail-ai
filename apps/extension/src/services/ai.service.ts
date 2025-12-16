import type {
  AIReplyRequest,
  AIReplyResponse,
  AIComposeRequest,
  AIComposeResponse,
  AISummarizeRequest,
  AISummarizeResponse,
  AIAnalyzeRequest,
  AIAnalyzeResponse,
  AIImproveRequest,
  AIImproveResponse,
  APIResponse,
} from '~/types';
import { StorageService } from './storage.service';

const API_BASE_URL = process.env.PLASMO_PUBLIC_API_URL || 'http://localhost:3000/api/v1';

class AIServiceClass {
  private async request<T>(
    endpoint: string,
    data: Record<string, unknown>
  ): Promise<APIResponse<T>> {
    const settings = await StorageService.getSettings();
    const apiKey = await StorageService.getApiKey();

    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(apiKey && { 'X-API-Key': apiKey }),
        },
        body: JSON.stringify({
          ...data,
          provider: settings.aiProvider,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: {
            code: result.error?.code || 'UNKNOWN_ERROR',
            message: result.error?.message || 'An error occurred',
          },
        };
      }

      // Track usage
      if (result.usage) {
        await StorageService.incrementUsage(result.usage.totalTokens || 0);
      }

      return { success: true, data: result };
    } catch (error) {
      console.error('AI Service Error:', error);
      return {
        success: false,
        error: {
          code: 'NETWORK_ERROR',
          message: error instanceof Error ? error.message : 'Network error occurred',
        },
      };
    }
  }

  async generateReply(params: AIReplyRequest): Promise<APIResponse<AIReplyResponse>> {
    return this.request<AIReplyResponse>('/ai/reply', params);
  }

  async compose(params: AIComposeRequest): Promise<APIResponse<AIComposeResponse>> {
    return this.request<AIComposeResponse>('/ai/compose', params);
  }

  async summarize(params: AISummarizeRequest): Promise<APIResponse<AISummarizeResponse>> {
    return this.request<AISummarizeResponse>('/ai/summarize', params);
  }

  async analyze(params: AIAnalyzeRequest): Promise<APIResponse<AIAnalyzeResponse>> {
    return this.request<AIAnalyzeResponse>('/ai/analyze', params);
  }

  async improve(params: AIImproveRequest): Promise<APIResponse<AIImproveResponse>> {
    return this.request<AIImproveResponse>('/ai/improve', params);
  }

  // Direct API call (for users with their own API key)
  async directOpenAICall(
    messages: Array<{ role: string; content: string }>,
    apiKey: string
  ): Promise<string> {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages,
        temperature: 0.7,
        max_tokens: 1000,
      }),
    });

    if (!response.ok) {
      throw new Error('OpenAI API request failed');
    }

    const data = await response.json();
    return data.choices[0]?.message?.content || '';
  }

  async directAnthropicCall(
    prompt: string,
    apiKey: string
  ): Promise<string> {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-3-sonnet-20240229',
        max_tokens: 1000,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    if (!response.ok) {
      throw new Error('Anthropic API request failed');
    }

    const data = await response.json();
    return data.content[0]?.text || '';
  }
}

export const AIService = new AIServiceClass();
