import type { ToneType, LengthType, AIProvider } from './ai';

export interface UserSettings {
  // AI Settings
  aiProvider: AIProvider;
  apiKey?: string;
  defaultTone: ToneType;
  defaultLength: LengthType;
  defaultLanguage: string;

  // UI Settings
  theme: 'light' | 'dark' | 'system';
  showFloatingButton: boolean;
  floatingButtonPosition: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
  panelWidth: number;

  // Keyboard Shortcuts
  shortcuts: ShortcutSettings;

  // Feature Toggles
  features: FeatureSettings;

  // Templates
  customTemplates: EmailTemplate[];

  // Privacy
  privacy: PrivacySettings;
}

export interface ShortcutSettings {
  openPanel: string;
  generateReply: string;
  summarize: string;
  improve: string;
  translate: string;
}

export interface FeatureSettings {
  smartReply: boolean;
  emailSummary: boolean;
  grammarCheck: boolean;
  translation: boolean;
  sentimentAnalysis: boolean;
  autoSuggest: boolean;
}

export interface EmailTemplate {
  id: string;
  name: string;
  content: string;
  category: string;
  tone: ToneType;
  createdAt: Date;
  updatedAt: Date;
}

export interface PrivacySettings {
  sendAnalytics: boolean;
  storeHistory: boolean;
  historyRetentionDays: number;
}

export const DEFAULT_SETTINGS: UserSettings = {
  aiProvider: 'openai',
  defaultTone: 'formal',
  defaultLength: 'medium',
  defaultLanguage: 'auto',
  theme: 'light',
  showFloatingButton: true,
  floatingButtonPosition: 'bottom-right',
  panelWidth: 400,
  shortcuts: {
    openPanel: 'Alt+M',
    generateReply: 'Alt+R',
    summarize: 'Alt+S',
    improve: 'Alt+I',
    translate: 'Alt+T',
  },
  features: {
    smartReply: true,
    emailSummary: true,
    grammarCheck: true,
    translation: true,
    sentimentAnalysis: true,
    autoSuggest: false,
  },
  customTemplates: [],
  privacy: {
    sendAnalytics: false,
    storeHistory: true,
    historyRetentionDays: 30,
  },
};
