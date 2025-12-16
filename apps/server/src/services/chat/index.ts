/**
 * AI Chat Assistant Service
 *
 * Multi-turn conversational AI for email management.
 * Supports natural language commands and context-aware responses.
 */

import OpenAI from 'openai';
import { config } from '../../config/index.js';
import { logger } from '../../utils/logger.js';
import { aiService } from '../ai/index.js';
import { calendarService } from '../calendar/index.js';
import { ragService } from '../rag/index.js';

interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  metadata?: {
    action?: string;
    parameters?: Record<string, any>;
    result?: any;
  };
}

interface ChatSession {
  id: string;
  userId: string;
  messages: ChatMessage[];
  context: SessionContext;
  createdAt: Date;
  lastActivityAt: Date;
}

interface SessionContext {
  currentEmail?: {
    id: string;
    subject: string;
    from: string;
    body: string;
  };
  pendingAction?: {
    type: string;
    parameters: Record<string, any>;
    requiresConfirmation: boolean;
  };
  preferences?: {
    tone: string;
    language: string;
  };
  knowledgeBaseId?: string;
}

interface ChatResponse {
  message: string;
  action?: ExecutedAction;
  suggestions?: string[];
  requiresConfirmation?: boolean;
  confirmationPrompt?: string;
}

interface ExecutedAction {
  type: string;
  success: boolean;
  result?: any;
  error?: string;
}

type IntentType =
  | 'compose_email'
  | 'reply_email'
  | 'summarize_email'
  | 'translate_email'
  | 'improve_text'
  | 'schedule_meeting'
  | 'check_calendar'
  | 'search_knowledge'
  | 'set_preference'
  | 'help'
  | 'confirm_action'
  | 'cancel_action'
  | 'general_question';

interface DetectedIntent {
  type: IntentType;
  confidence: number;
  parameters: Record<string, any>;
}

export class ChatAssistantService {
  private openai: OpenAI;
  private sessions: Map<string, ChatSession> = new Map();
  private maxSessionMessages = 50;

  constructor() {
    this.openai = new OpenAI({ apiKey: config.openaiApiKey });
  }

  /**
   * Get or create chat session
   */
  getOrCreateSession(userId: string, sessionId?: string): ChatSession {
    const id = sessionId || `chat_${Date.now()}_${Math.random().toString(36).slice(2)}`;

    if (!this.sessions.has(id)) {
      const session: ChatSession = {
        id,
        userId,
        messages: [],
        context: {},
        createdAt: new Date(),
        lastActivityAt: new Date(),
      };
      this.sessions.set(id, session);
      logger.info({ msg: 'New chat session created', sessionId: id, userId });
    }

    return this.sessions.get(id)!;
  }

  /**
   * Process user message
   */
  async chat(params: {
    userId: string;
    sessionId?: string;
    message: string;
    emailContext?: SessionContext['currentEmail'];
  }): Promise<ChatResponse> {
    const session = this.getOrCreateSession(params.userId, params.sessionId);

    // Update context if provided
    if (params.emailContext) {
      session.context.currentEmail = params.emailContext;
    }

    // Add user message
    session.messages.push({
      role: 'user',
      content: params.message,
      timestamp: new Date(),
    });

    // Trim old messages
    if (session.messages.length > this.maxSessionMessages) {
      session.messages = session.messages.slice(-this.maxSessionMessages);
    }

    // Detect intent
    const intent = await this.detectIntent(params.message, session.context);
    logger.debug({ msg: 'Intent detected', intent });

    // Handle pending action confirmation
    if (session.context.pendingAction) {
      if (intent.type === 'confirm_action') {
        return this.executePendingAction(session);
      } else if (intent.type === 'cancel_action') {
        return this.cancelPendingAction(session);
      }
    }

    // Process based on intent
    const response = await this.processIntent(intent, session);

    // Add assistant message
    session.messages.push({
      role: 'assistant',
      content: response.message,
      timestamp: new Date(),
      metadata: {
        action: intent.type,
        parameters: intent.parameters,
        result: response.action?.result,
      },
    });

    session.lastActivityAt = new Date();
    return response;
  }

  /**
   * Detect user intent from message
   */
  private async detectIntent(message: string, context: SessionContext): Promise<DetectedIntent> {
    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: `Detect the user's intent from their message about email management. Return JSON:
{
  "type": "compose_email|reply_email|summarize_email|translate_email|improve_text|schedule_meeting|check_calendar|search_knowledge|set_preference|help|confirm_action|cancel_action|general_question",
  "confidence": number (0-1),
  "parameters": {
    // For compose_email: recipient, subject, description
    // For reply_email: tone, length
    // For translate_email: targetLanguage
    // For improve_text: action (grammar/professional/expand/shorten)
    // For schedule_meeting: title, date, time, attendees
    // For set_preference: preference, value
    // Others as needed
  }
}

Context:
- Has current email: ${!!context.currentEmail}
- Current email subject: ${context.currentEmail?.subject || 'N/A'}
- Has pending action: ${!!context.pendingAction}`,
          },
          { role: 'user', content: message },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.1,
      });

      return JSON.parse(response.choices[0]?.message?.content || '{}');
    } catch (error) {
      logger.error({ msg: 'Intent detection failed', error });
      return { type: 'general_question', confidence: 0.5, parameters: {} };
    }
  }

  /**
   * Process detected intent
   */
  private async processIntent(intent: DetectedIntent, session: ChatSession): Promise<ChatResponse> {
    switch (intent.type) {
      case 'compose_email':
        return this.handleComposeEmail(intent.parameters, session);

      case 'reply_email':
        return this.handleReplyEmail(intent.parameters, session);

      case 'summarize_email':
        return this.handleSummarizeEmail(session);

      case 'translate_email':
        return this.handleTranslateEmail(intent.parameters, session);

      case 'improve_text':
        return this.handleImproveText(intent.parameters, session);

      case 'schedule_meeting':
        return this.handleScheduleMeeting(intent.parameters, session);

      case 'check_calendar':
        return this.handleCheckCalendar(intent.parameters, session);

      case 'search_knowledge':
        return this.handleSearchKnowledge(intent.parameters, session);

      case 'set_preference':
        return this.handleSetPreference(intent.parameters, session);

      case 'help':
        return this.handleHelp();

      default:
        return this.handleGeneralQuestion(session);
    }
  }

  /**
   * Handle compose email request
   */
  private async handleComposeEmail(
    params: Record<string, any>,
    session: ChatSession
  ): Promise<ChatResponse> {
    const { recipient, subject, description } = params;

    if (!description) {
      return {
        message: "What would you like the email to say? Please describe the content you want.",
        suggestions: [
          "Write a follow-up email to discuss the project",
          "Request a meeting for next week",
          "Thank them for the opportunity",
        ],
      };
    }

    try {
      const result = await aiService.compose({
        description,
        tone: session.context.preferences?.tone || 'formal',
        length: 'medium',
        language: session.context.preferences?.language,
      });

      return {
        message: `I've drafted an email for you:\n\n**Subject:** ${result.subject}\n\n${result.body}\n\nWould you like me to make any changes?`,
        action: { type: 'compose_email', success: true, result },
        suggestions: [
          "Make it more formal",
          "Make it shorter",
          "Add more details",
        ],
      };
    } catch (error) {
      return {
        message: "I'm sorry, I couldn't generate the email. Could you please try again with more details?",
        action: { type: 'compose_email', success: false, error: String(error) },
      };
    }
  }

  /**
   * Handle reply email request
   */
  private async handleReplyEmail(
    params: Record<string, any>,
    session: SessionContext & { context: SessionContext }
  ): Promise<ChatResponse> {
    const email = session.context?.currentEmail;

    if (!email) {
      return {
        message: "I don't see any email selected. Please open an email first, and I'll help you reply to it.",
      };
    }

    try {
      const result = await aiService.generateReply({
        emailContent: email.body,
        tone: params.tone || session.context?.preferences?.tone || 'formal',
        length: params.length || 'medium',
      });

      const reply = result.replies[0];
      return {
        message: `Here's a suggested reply:\n\n${reply?.content}\n\nWould you like me to adjust the tone or length?`,
        action: { type: 'reply_email', success: true, result },
        suggestions: [
          "Make it friendlier",
          "Make it more concise",
          "Give me another option",
        ],
      };
    } catch (error) {
      return {
        message: "I couldn't generate a reply. Please try again.",
        action: { type: 'reply_email', success: false, error: String(error) },
      };
    }
  }

  /**
   * Handle summarize email request
   */
  private async handleSummarizeEmail(session: ChatSession): Promise<ChatResponse> {
    const email = session.context.currentEmail;

    if (!email) {
      return {
        message: "Please open an email first, and I'll summarize it for you.",
      };
    }

    try {
      const result = await aiService.summarize({
        emailContent: email.body,
        type: 'single',
      });

      let message = `**Summary:** ${result.summary}\n\n`;
      if (result.keyPoints.length > 0) {
        message += `**Key Points:**\n${result.keyPoints.map(p => `• ${p}`).join('\n')}\n\n`;
      }
      if (result.actionItems.length > 0) {
        message += `**Action Items:**\n${result.actionItems.map(a => `☐ ${a}`).join('\n')}`;
      }

      return {
        message,
        action: { type: 'summarize_email', success: true, result },
        suggestions: [
          "Draft a reply",
          "Create a task from this",
          "Schedule a follow-up",
        ],
      };
    } catch (error) {
      return {
        message: "I couldn't summarize the email. Please try again.",
        action: { type: 'summarize_email', success: false, error: String(error) },
      };
    }
  }

  /**
   * Handle translate email request
   */
  private async handleTranslateEmail(
    params: Record<string, any>,
    session: ChatSession
  ): Promise<ChatResponse> {
    const email = session.context.currentEmail;
    const targetLanguage = params.targetLanguage || 'English';

    if (!email) {
      return {
        message: "Please open an email first, and I'll translate it for you.",
      };
    }

    try {
      const result = await aiService.improve({
        content: email.body,
        action: 'translate',
        targetLanguage,
      });

      return {
        message: `**Translated to ${targetLanguage}:**\n\n${result.improvedContent}`,
        action: { type: 'translate_email', success: true, result },
      };
    } catch (error) {
      return {
        message: "I couldn't translate the email. Please try again.",
        action: { type: 'translate_email', success: false, error: String(error) },
      };
    }
  }

  /**
   * Handle improve text request
   */
  private async handleImproveText(
    params: Record<string, any>,
    session: ChatSession
  ): Promise<ChatResponse> {
    const email = session.context.currentEmail;
    const action = params.action || 'grammar';

    const content = email?.body || '';
    if (!content) {
      return {
        message: "Please provide text to improve, or open an email first.",
      };
    }

    try {
      const result = await aiService.improve({
        content,
        action,
      });

      const actionLabels: Record<string, string> = {
        grammar: 'Grammar corrected',
        professional: 'Made professional',
        expand: 'Expanded',
        shorten: 'Shortened',
      };

      return {
        message: `**${actionLabels[action] || 'Improved'}:**\n\n${result.improvedContent}`,
        action: { type: 'improve_text', success: true, result },
      };
    } catch (error) {
      return {
        message: "I couldn't improve the text. Please try again.",
        action: { type: 'improve_text', success: false, error: String(error) },
      };
    }
  }

  /**
   * Handle schedule meeting request
   */
  private async handleScheduleMeeting(
    params: Record<string, any>,
    session: ChatSession
  ): Promise<ChatResponse> {
    const { title, date, time, attendees } = params;

    if (!title) {
      return {
        message: "What should we call this meeting?",
        suggestions: [
          "Project sync",
          "Weekly check-in",
          "Planning session",
        ],
      };
    }

    // Store pending action for confirmation
    session.context.pendingAction = {
      type: 'create_calendar_event',
      parameters: { title, date, time, attendees },
      requiresConfirmation: true,
    };

    let message = `I'll create a meeting:\n\n`;
    message += `**Title:** ${title}\n`;
    message += `**Date:** ${date || 'TBD'}\n`;
    message += `**Time:** ${time || 'TBD'}\n`;
    if (attendees?.length) {
      message += `**Attendees:** ${attendees.join(', ')}\n`;
    }
    message += `\nShould I create this event?`;

    return {
      message,
      requiresConfirmation: true,
      confirmationPrompt: "Say 'yes' to confirm or 'no' to cancel.",
      suggestions: ["Yes, create it", "No, cancel", "Change the time"],
    };
  }

  /**
   * Handle check calendar request
   */
  private async handleCheckCalendar(
    params: Record<string, any>,
    session: ChatSession
  ): Promise<ChatResponse> {
    try {
      const summary = await calendarService.getTodaySummary(session.userId);

      let message = `📅 **Today's Schedule**\n\n${summary.summary}\n\n`;

      if (summary.events.length > 0) {
        message += `**Events:**\n`;
        for (const event of summary.events) {
          const time = new Date(event.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          message += `• ${time} - ${event.title}\n`;
        }
      }

      if (summary.freeSlots.length > 0) {
        message += `\n**Free Slots:** ${summary.freeSlots.length} available`;
      }

      return {
        message,
        action: { type: 'check_calendar', success: true, result: summary },
        suggestions: [
          "Schedule a new meeting",
          "Check tomorrow",
          "Find time for a 1-hour meeting",
        ],
      };
    } catch (error) {
      return {
        message: "I couldn't check your calendar. Please try again.",
        action: { type: 'check_calendar', success: false, error: String(error) },
      };
    }
  }

  /**
   * Handle search knowledge request
   */
  private async handleSearchKnowledge(
    params: Record<string, any>,
    session: ChatSession
  ): Promise<ChatResponse> {
    const { query } = params;

    if (!query) {
      return {
        message: "What would you like to search for in the knowledge base?",
      };
    }

    if (!session.context.knowledgeBaseId) {
      return {
        message: "No knowledge base is connected. Would you like to set one up?",
        suggestions: [
          "Connect a knowledge base",
          "Import documents",
        ],
      };
    }

    try {
      const result = await ragService.generateWithRAG({
        kbId: session.context.knowledgeBaseId,
        query,
        emailContext: session.context.currentEmail?.body,
      });

      let message = result.response;
      if (result.sources.length > 0) {
        message += `\n\n**Sources:**\n`;
        for (const source of result.sources) {
          message += `• ${source.metadata.title || source.metadata.source}\n`;
        }
      }

      return {
        message,
        action: { type: 'search_knowledge', success: true, result },
      };
    } catch (error) {
      return {
        message: "I couldn't search the knowledge base. Please try again.",
        action: { type: 'search_knowledge', success: false, error: String(error) },
      };
    }
  }

  /**
   * Handle set preference request
   */
  private async handleSetPreference(
    params: Record<string, any>,
    session: ChatSession
  ): Promise<ChatResponse> {
    const { preference, value } = params;

    if (!session.context.preferences) {
      session.context.preferences = { tone: 'formal', language: 'en' };
    }

    if (preference === 'tone') {
      session.context.preferences.tone = value;
      return {
        message: `Got it! I'll use a ${value} tone for your emails from now on.`,
        action: { type: 'set_preference', success: true },
      };
    }

    if (preference === 'language') {
      session.context.preferences.language = value;
      return {
        message: `I'll now compose emails in ${value}.`,
        action: { type: 'set_preference', success: true },
      };
    }

    return {
      message: "What preference would you like to change?",
      suggestions: [
        "Use a friendly tone",
        "Use a formal tone",
        "Write in Spanish",
      ],
    };
  }

  /**
   * Handle help request
   */
  private handleHelp(): ChatResponse {
    return {
      message: `Here's what I can help you with:

📧 **Email Management**
• "Help me write an email to [person] about [topic]"
• "Reply to this email"
• "Summarize this email"
• "Translate this to [language]"
• "Make this more professional"

📅 **Calendar**
• "Schedule a meeting with [person] tomorrow at 2pm"
• "What's on my calendar today?"
• "Find time for a 30-minute meeting"

🔍 **Knowledge Base**
• "Search for [topic] in our docs"
• "What's our policy on [topic]?"

⚙️ **Preferences**
• "Use a friendly tone"
• "Write in Spanish"

Just ask naturally, and I'll help!`,
      suggestions: [
        "Help me write an email",
        "What's on my calendar?",
        "Summarize this email",
      ],
    };
  }

  /**
   * Handle general questions
   */
  private async handleGeneralQuestion(session: ChatSession): Promise<ChatResponse> {
    try {
      // Build conversation history for context
      const recentMessages = session.messages.slice(-10).map(m => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      }));

      const response = await this.openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: `You are a helpful email assistant. Answer the user's question helpfully and concisely.
Current context:
- Has email open: ${!!session.context.currentEmail}
- Email subject: ${session.context.currentEmail?.subject || 'N/A'}
- Preferred tone: ${session.context.preferences?.tone || 'formal'}`,
          },
          ...recentMessages,
        ],
        temperature: 0.7,
        max_tokens: 500,
      });

      return {
        message: response.choices[0]?.message?.content || "I'm not sure how to help with that. Could you rephrase?",
        suggestions: [
          "Help me with email",
          "Check my calendar",
          "What can you do?",
        ],
      };
    } catch (error) {
      return {
        message: "I'm having trouble understanding. Could you try asking in a different way?",
      };
    }
  }

  /**
   * Execute pending action after confirmation
   */
  private async executePendingAction(session: ChatSession): Promise<ChatResponse> {
    const action = session.context.pendingAction;
    if (!action) {
      return { message: "There's no pending action to confirm." };
    }

    try {
      let result: any;

      if (action.type === 'create_calendar_event') {
        // Create the calendar event
        const { title, date, time, attendees } = action.parameters;
        // In production, actually create the event
        result = { eventId: 'new_event_123', title, date, time };
      }

      session.context.pendingAction = undefined;

      return {
        message: `Done! I've completed the action.`,
        action: { type: action.type, success: true, result },
      };
    } catch (error) {
      session.context.pendingAction = undefined;
      return {
        message: "Sorry, I couldn't complete that action. Please try again.",
        action: { type: action.type, success: false, error: String(error) },
      };
    }
  }

  /**
   * Cancel pending action
   */
  private cancelPendingAction(session: ChatSession): ChatResponse {
    session.context.pendingAction = undefined;
    return {
      message: "Okay, I've cancelled that. What else can I help you with?",
    };
  }

  /**
   * Get chat history
   */
  getChatHistory(sessionId: string): ChatMessage[] {
    const session = this.sessions.get(sessionId);
    return session?.messages || [];
  }

  /**
   * Clear chat session
   */
  clearSession(sessionId: string): boolean {
    return this.sessions.delete(sessionId);
  }

  /**
   * Set email context for session
   */
  setEmailContext(sessionId: string, email: SessionContext['currentEmail']): void {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.context.currentEmail = email;
    }
  }
}

export const chatAssistantService = new ChatAssistantService();
