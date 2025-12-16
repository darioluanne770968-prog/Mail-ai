export * from './email';
export * from './ai';
export * from './settings';

export interface Message<T = unknown> {
  type: string;
  payload: T;
}

export interface APIResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
}

export type LoadingState = 'idle' | 'loading' | 'success' | 'error';

export interface PanelState {
  isOpen: boolean;
  activeTab: 'reply' | 'compose' | 'summarize' | 'improve';
  isLoading: boolean;
  error?: string;
}
