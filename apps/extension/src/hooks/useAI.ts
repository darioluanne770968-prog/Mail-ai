import { useState, useCallback } from 'react';
import { AIService } from '~/services/ai.service';
import type {
  AIReplyRequest,
  AIReplyResponse,
  AIComposeRequest,
  AIComposeResponse,
  AISummarizeRequest,
  AISummarizeResponse,
  AIAnalyzeResponse,
  AIImproveRequest,
  AIImproveResponse,
  LoadingState,
} from '~/types';

interface AIHookState<T> {
  data: T | null;
  loading: LoadingState;
  error: string | null;
}

export function useAI() {
  const [replyState, setReplyState] = useState<AIHookState<AIReplyResponse>>({
    data: null,
    loading: 'idle',
    error: null,
  });

  const [composeState, setComposeState] = useState<AIHookState<AIComposeResponse>>({
    data: null,
    loading: 'idle',
    error: null,
  });

  const [summarizeState, setSummarizeState] = useState<AIHookState<AISummarizeResponse>>({
    data: null,
    loading: 'idle',
    error: null,
  });

  const [analyzeState, setAnalyzeState] = useState<AIHookState<AIAnalyzeResponse>>({
    data: null,
    loading: 'idle',
    error: null,
  });

  const [improveState, setImproveState] = useState<AIHookState<AIImproveResponse>>({
    data: null,
    loading: 'idle',
    error: null,
  });

  const generateReply = useCallback(async (params: AIReplyRequest) => {
    setReplyState({ data: null, loading: 'loading', error: null });

    const response = await AIService.generateReply(params);

    if (response.success && response.data) {
      setReplyState({ data: response.data, loading: 'success', error: null });
      return response.data;
    } else {
      setReplyState({
        data: null,
        loading: 'error',
        error: response.error?.message || 'Failed to generate reply',
      });
      return null;
    }
  }, []);

  const compose = useCallback(async (params: AIComposeRequest) => {
    setComposeState({ data: null, loading: 'loading', error: null });

    const response = await AIService.compose(params);

    if (response.success && response.data) {
      setComposeState({ data: response.data, loading: 'success', error: null });
      return response.data;
    } else {
      setComposeState({
        data: null,
        loading: 'error',
        error: response.error?.message || 'Failed to compose email',
      });
      return null;
    }
  }, []);

  const summarize = useCallback(async (params: AISummarizeRequest) => {
    setSummarizeState({ data: null, loading: 'loading', error: null });

    const response = await AIService.summarize(params);

    if (response.success && response.data) {
      setSummarizeState({ data: response.data, loading: 'success', error: null });
      return response.data;
    } else {
      setSummarizeState({
        data: null,
        loading: 'error',
        error: response.error?.message || 'Failed to summarize email',
      });
      return null;
    }
  }, []);

  const analyze = useCallback(async (emailContent: string) => {
    setAnalyzeState({ data: null, loading: 'loading', error: null });

    const response = await AIService.analyze({ emailContent });

    if (response.success && response.data) {
      setAnalyzeState({ data: response.data, loading: 'success', error: null });
      return response.data;
    } else {
      setAnalyzeState({
        data: null,
        loading: 'error',
        error: response.error?.message || 'Failed to analyze email',
      });
      return null;
    }
  }, []);

  const improve = useCallback(async (params: AIImproveRequest) => {
    setImproveState({ data: null, loading: 'loading', error: null });

    const response = await AIService.improve(params);

    if (response.success && response.data) {
      setImproveState({ data: response.data, loading: 'success', error: null });
      return response.data;
    } else {
      setImproveState({
        data: null,
        loading: 'error',
        error: response.error?.message || 'Failed to improve content',
      });
      return null;
    }
  }, []);

  const clearStates = useCallback(() => {
    setReplyState({ data: null, loading: 'idle', error: null });
    setComposeState({ data: null, loading: 'idle', error: null });
    setSummarizeState({ data: null, loading: 'idle', error: null });
    setAnalyzeState({ data: null, loading: 'idle', error: null });
    setImproveState({ data: null, loading: 'idle', error: null });
  }, []);

  return {
    // Reply
    generateReply,
    replyData: replyState.data,
    replyLoading: replyState.loading,
    replyError: replyState.error,

    // Compose
    compose,
    composeData: composeState.data,
    composeLoading: composeState.loading,
    composeError: composeState.error,

    // Summarize
    summarize,
    summarizeData: summarizeState.data,
    summarizeLoading: summarizeState.loading,
    summarizeError: summarizeState.error,

    // Analyze
    analyze,
    analyzeData: analyzeState.data,
    analyzeLoading: analyzeState.loading,
    analyzeError: analyzeState.error,

    // Improve
    improve,
    improveData: improveState.data,
    improveLoading: improveState.loading,
    improveError: improveState.error,

    // Clear all
    clearStates,
  };
}
