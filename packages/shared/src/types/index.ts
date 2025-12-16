// Shared types between extension and server

export type ToneType = 'formal' | 'friendly' | 'concise' | 'detailed' | 'casual';
export type LengthType = 'short' | 'medium' | 'long';
export type AIProvider = 'openai' | 'anthropic';

export interface AIReplyRequest {
  emailContent: string;
  threadContext?: string;
  tone: ToneType;
  length: LengthType;
  language?: string;
}

export interface AIReplyResponse {
  replies: GeneratedReply[];
  usage: TokenUsage;
}

export interface GeneratedReply {
  content: string;
  tone: ToneType;
}

export interface AIComposeRequest {
  description: string;
  tone: ToneType;
  length: LengthType;
  language?: string;
}

export interface AIComposeResponse {
  subject: string;
  body: string;
  usage: TokenUsage;
}

export interface AISummarizeRequest {
  emailContent: string;
  type: 'single' | 'thread';
}

export interface AISummarizeResponse {
  summary: string;
  keyPoints: string[];
  actionItems: string[];
  entities: ExtractedEntities;
  usage: TokenUsage;
}

export interface ExtractedEntities {
  dates: string[];
  amounts: string[];
  people: string[];
  deadlines: string[];
  locations: string[];
}

export interface AIAnalyzeResponse {
  sentiment: 'positive' | 'neutral' | 'negative' | 'urgent';
  urgency: 'low' | 'medium' | 'high' | 'critical';
  category: string;
  entities: ExtractedEntities;
  usage: TokenUsage;
}

export interface AIImproveRequest {
  content: string;
  action: 'grammar' | 'professional' | 'expand' | 'shorten' | 'translate';
  targetLanguage?: string;
}

export interface AIImproveResponse {
  improvedContent: string;
  changes?: string[];
  usage: TokenUsage;
}

export interface TokenUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

export interface APIResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
}
