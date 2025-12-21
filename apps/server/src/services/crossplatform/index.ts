/**
 * Cross-Platform Communication Hub Service
 * Unified inbox for email, Slack, Teams, etc.
 */

import { AIService } from '../ai/index.js';

export type Platform = 'email' | 'slack' | 'teams' | 'wechat' | 'dingtalk' | 'telegram' | 'whatsapp';

export interface PlatformConfig {
  platform: Platform;
  enabled: boolean;
  credentials?: Record<string, string>;
  syncEnabled: boolean;
  notificationsEnabled: boolean;
  autoRoute: boolean;
}

export interface UnifiedMessage {
  id: string;
  platform: Platform;
  platformMessageId: string;
  threadId?: string;
  from: {
    id: string;
    name: string;
    avatar?: string;
    email?: string;
  };
  to: Array<{
    id: string;
    name: string;
    email?: string;
  }>;
  subject?: string;
  content: string;
  contentType: 'text' | 'html' | 'markdown';
  attachments: Array<{
    name: string;
    url: string;
    size: number;
    type: string;
  }>;
  timestamp: Date;
  read: boolean;
  starred: boolean;
  labels: string[];
  metadata: Record<string, any>;
}

export interface UnifiedThread {
  id: string;
  subject: string;
  participants: UnifiedMessage['from'][];
  messages: UnifiedMessage[];
  platforms: Platform[];
  lastActivity: Date;
  unreadCount: number;
  labels: string[];
}

export interface ContactProfile {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  avatar?: string;
  platforms: Array<{
    platform: Platform;
    handle: string;
    verified: boolean;
  }>;
  preferredPlatform: Platform;
  responsePatterns: {
    platform: Platform;
    avgResponseTime: number;
    availability: string[];
  }[];
  lastSeen: Record<Platform, Date>;
}

export interface RouteRecommendation {
  contactId: string;
  recommendedPlatform: Platform;
  reason: string;
  confidence: number;
  alternatives: Array<{
    platform: Platform;
    reason: string;
  }>;
}

export interface CrossPlatformSearch {
  query: string;
  platforms?: Platform[];
  dateRange?: {
    start: Date;
    end: Date;
  };
  from?: string;
  hasAttachment?: boolean;
}

export interface SearchResult {
  message: UnifiedMessage;
  relevanceScore: number;
  matchedFields: string[];
  snippet: string;
}

// In-memory storage
const platformConfigs = new Map<string, Map<Platform, PlatformConfig>>();
const messages = new Map<string, UnifiedMessage>();
const threads = new Map<string, UnifiedThread>();
const contacts = new Map<string, ContactProfile>();

export class CrossPlatformService {
  private aiService: AIService;

  constructor() {
    this.aiService = new AIService();
  }

  /**
   * Get platform configurations for a user
   */
  getPlatformConfigs(userId: string): Map<Platform, PlatformConfig> {
    let configs = platformConfigs.get(userId);

    if (!configs) {
      configs = new Map();
      // Initialize with defaults
      const platforms: Platform[] = ['email', 'slack', 'teams', 'wechat', 'dingtalk', 'telegram', 'whatsapp'];
      platforms.forEach(platform => {
        configs!.set(platform, {
          platform,
          enabled: platform === 'email', // Only email enabled by default
          syncEnabled: true,
          notificationsEnabled: true,
          autoRoute: false,
        });
      });
      platformConfigs.set(userId, configs);
    }

    return configs;
  }

  /**
   * Update platform configuration
   */
  updatePlatformConfig(
    userId: string,
    platform: Platform,
    updates: Partial<PlatformConfig>
  ): PlatformConfig {
    const configs = this.getPlatformConfigs(userId);
    const current = configs.get(platform) || {
      platform,
      enabled: false,
      syncEnabled: true,
      notificationsEnabled: true,
      autoRoute: false,
    };

    const updated = { ...current, ...updates };
    configs.set(platform, updated);

    return updated;
  }

  /**
   * Import message from a platform
   */
  importMessage(
    userId: string,
    message: Omit<UnifiedMessage, 'id'>
  ): UnifiedMessage {
    const newMessage: UnifiedMessage = {
      ...message,
      id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    };

    messages.set(newMessage.id, newMessage);

    // Update or create thread
    this.updateThread(newMessage);

    // Update contact
    this.updateContact(newMessage.from);

    return newMessage;
  }

  /**
   * Update or create thread from message
   */
  private updateThread(message: UnifiedMessage): UnifiedThread {
    let thread = message.threadId ? threads.get(message.threadId) : null;

    if (!thread) {
      // Create new thread
      thread = {
        id: message.threadId || `thread_${Date.now()}`,
        subject: message.subject || '(No Subject)',
        participants: [message.from],
        messages: [message],
        platforms: [message.platform],
        lastActivity: message.timestamp,
        unreadCount: message.read ? 0 : 1,
        labels: message.labels,
      };
    } else {
      // Update existing thread
      thread.messages.push(message);
      thread.lastActivity = message.timestamp;

      // Add participant if new
      if (!thread.participants.find(p => p.id === message.from.id)) {
        thread.participants.push(message.from);
      }

      // Add platform if new
      if (!thread.platforms.includes(message.platform)) {
        thread.platforms.push(message.platform);
      }

      if (!message.read) {
        thread.unreadCount++;
      }
    }

    threads.set(thread.id, thread);
    return thread;
  }

  /**
   * Update contact from message
   */
  private updateContact(from: UnifiedMessage['from']): void {
    let contact = contacts.get(from.id);

    if (!contact) {
      contact = {
        id: from.id,
        name: from.name,
        email: from.email,
        avatar: from.avatar,
        platforms: [],
        preferredPlatform: 'email',
        responsePatterns: [],
        lastSeen: {},
      };
    }

    contacts.set(contact.id, contact);
  }

  /**
   * Get unified inbox
   */
  getUnifiedInbox(
    userId: string,
    options: {
      platforms?: Platform[];
      unreadOnly?: boolean;
      starredOnly?: boolean;
      labels?: string[];
      limit?: number;
      offset?: number;
    } = {}
  ): UnifiedThread[] {
    let result = Array.from(threads.values());

    // Filter by platforms
    if (options.platforms && options.platforms.length > 0) {
      result = result.filter(t =>
        t.platforms.some(p => options.platforms!.includes(p))
      );
    }

    // Filter by unread
    if (options.unreadOnly) {
      result = result.filter(t => t.unreadCount > 0);
    }

    // Filter by labels
    if (options.labels && options.labels.length > 0) {
      result = result.filter(t =>
        options.labels!.some(l => t.labels.includes(l))
      );
    }

    // Sort by last activity
    result.sort((a, b) => b.lastActivity.getTime() - a.lastActivity.getTime());

    // Pagination
    const offset = options.offset || 0;
    const limit = options.limit || 50;
    result = result.slice(offset, offset + limit);

    return result;
  }

  /**
   * Search across all platforms
   */
  async search(
    userId: string,
    searchParams: CrossPlatformSearch
  ): Promise<SearchResult[]> {
    const allMessages = Array.from(messages.values());
    const results: SearchResult[] = [];

    for (const message of allMessages) {
      // Platform filter
      if (searchParams.platforms && !searchParams.platforms.includes(message.platform)) {
        continue;
      }

      // Date filter
      if (searchParams.dateRange) {
        if (message.timestamp < searchParams.dateRange.start ||
            message.timestamp > searchParams.dateRange.end) {
          continue;
        }
      }

      // From filter
      if (searchParams.from &&
          !message.from.name.toLowerCase().includes(searchParams.from.toLowerCase()) &&
          !message.from.email?.toLowerCase().includes(searchParams.from.toLowerCase())) {
        continue;
      }

      // Attachment filter
      if (searchParams.hasAttachment && message.attachments.length === 0) {
        continue;
      }

      // Content search
      const query = searchParams.query.toLowerCase();
      const matchedFields: string[] = [];
      let relevanceScore = 0;

      if (message.subject?.toLowerCase().includes(query)) {
        matchedFields.push('subject');
        relevanceScore += 0.4;
      }

      if (message.content.toLowerCase().includes(query)) {
        matchedFields.push('content');
        relevanceScore += 0.4;
      }

      if (message.from.name.toLowerCase().includes(query)) {
        matchedFields.push('from');
        relevanceScore += 0.2;
      }

      if (matchedFields.length > 0) {
        // Generate snippet
        const contentLower = message.content.toLowerCase();
        const queryIndex = contentLower.indexOf(query);
        let snippet = message.content;

        if (queryIndex !== -1) {
          const start = Math.max(0, queryIndex - 50);
          const end = Math.min(message.content.length, queryIndex + query.length + 50);
          snippet = (start > 0 ? '...' : '') +
                   message.content.slice(start, end) +
                   (end < message.content.length ? '...' : '');
        } else {
          snippet = message.content.slice(0, 100) + '...';
        }

        results.push({
          message,
          relevanceScore,
          matchedFields,
          snippet,
        });
      }
    }

    // Sort by relevance
    results.sort((a, b) => b.relevanceScore - a.relevanceScore);

    return results.slice(0, 50);
  }

  /**
   * Get route recommendation for contacting someone
   */
  async getRouteRecommendation(
    userId: string,
    contactId: string,
    messageType: 'urgent' | 'normal' | 'casual'
  ): Promise<RouteRecommendation> {
    const contact = contacts.get(contactId);

    if (!contact) {
      return {
        contactId,
        recommendedPlatform: 'email',
        reason: '未知联系人，使用邮件作为默认方式',
        confidence: 0.5,
        alternatives: [],
      };
    }

    // Analyze contact's platform activity
    const platformActivity = contact.platforms.map(p => ({
      platform: p.platform,
      lastSeen: contact.lastSeen[p.platform],
      avgResponseTime: contact.responsePatterns.find(r => r.platform === p.platform)?.avgResponseTime || 0,
    }));

    // Use AI to recommend
    const prompt = `为以下联系人推荐最佳沟通渠道：

联系人: ${contact.name}
可用平台: ${contact.platforms.map(p => p.platform).join(', ')}
消息类型: ${messageType}
平台活跃度: ${JSON.stringify(platformActivity)}

返回 JSON:
{
  "recommendedPlatform": "platform_name",
  "reason": "推荐原因",
  "confidence": 0.85,
  "alternatives": [
    {"platform": "alt_platform", "reason": "备选原因"}
  ]
}`;

    try {
      const response = await this.aiService.generateReply({
        emailContent: prompt,
        tone: 'professional',
        length: 'concise',
      });

      const result = JSON.parse(response.replies[0].content);
      return {
        contactId,
        ...result,
      };
    } catch {
      return {
        contactId,
        recommendedPlatform: contact.preferredPlatform || 'email',
        reason: '基于联系人偏好',
        confidence: 0.6,
        alternatives: [],
      };
    }
  }

  /**
   * Send message to optimal platform
   */
  async sendToOptimalPlatform(
    userId: string,
    contactId: string,
    content: string,
    options: {
      messageType?: 'urgent' | 'normal' | 'casual';
      preferredPlatform?: Platform;
      subject?: string;
    } = {}
  ): Promise<{
    sent: boolean;
    platform: Platform;
    messageId: string;
    reason: string;
  }> {
    let platform = options.preferredPlatform;

    if (!platform) {
      const recommendation = await this.getRouteRecommendation(
        userId,
        contactId,
        options.messageType || 'normal'
      );
      platform = recommendation.recommendedPlatform;
    }

    // Simulate sending (in reality would use platform APIs)
    const messageId = `sent_${Date.now()}`;

    return {
      sent: true,
      platform,
      messageId,
      reason: `消息已通过 ${platform} 发送`,
    };
  }

  /**
   * Get cross-platform conversation context
   */
  getConversationContext(contactId: string): UnifiedThread[] {
    return Array.from(threads.values())
      .filter(t => t.participants.some(p => p.id === contactId))
      .sort((a, b) => b.lastActivity.getTime() - a.lastActivity.getTime())
      .slice(0, 10);
  }

  /**
   * Sync messages from all platforms
   */
  async syncAllPlatforms(userId: string): Promise<{
    synced: Record<Platform, number>;
    errors: Record<Platform, string>;
  }> {
    const configs = this.getPlatformConfigs(userId);
    const synced: Record<Platform, number> = {} as Record<Platform, number>;
    const errors: Record<Platform, string> = {} as Record<Platform, string>;

    for (const [platform, config] of configs) {
      if (!config.enabled || !config.syncEnabled) continue;

      try {
        // Simulate sync (would use actual platform APIs)
        synced[platform] = Math.floor(Math.random() * 10); // Random number of messages
      } catch (error) {
        errors[platform] = `Failed to sync: ${error}`;
      }
    }

    return { synced, errors };
  }

  /**
   * Get platform statistics
   */
  getPlatformStats(userId: string): Record<Platform, {
    totalMessages: number;
    unreadMessages: number;
    lastSync: Date | null;
  }> {
    const stats: Record<Platform, any> = {} as any;
    const platforms: Platform[] = ['email', 'slack', 'teams', 'wechat', 'dingtalk', 'telegram', 'whatsapp'];

    for (const platform of platforms) {
      const platformMessages = Array.from(messages.values())
        .filter(m => m.platform === platform);

      stats[platform] = {
        totalMessages: platformMessages.length,
        unreadMessages: platformMessages.filter(m => !m.read).length,
        lastSync: platformMessages.length > 0
          ? new Date(Math.max(...platformMessages.map(m => m.timestamp.getTime())))
          : null,
      };
    }

    return stats;
  }

  /**
   * Mark thread as read
   */
  markThreadRead(threadId: string): void {
    const thread = threads.get(threadId);
    if (thread) {
      thread.messages.forEach(m => m.read = true);
      thread.unreadCount = 0;
    }
  }

  /**
   * Get contact by email or ID
   */
  getContact(identifier: string): ContactProfile | null {
    // Try by ID first
    const byId = contacts.get(identifier);
    if (byId) return byId;

    // Try by email
    for (const contact of contacts.values()) {
      if (contact.email?.toLowerCase() === identifier.toLowerCase()) {
        return contact;
      }
    }

    return null;
  }

  /**
   * Update contact profile
   */
  updateContact(contactId: string, updates: Partial<ContactProfile>): ContactProfile | null {
    const contact = contacts.get(contactId);
    if (!contact) return null;

    const updated = { ...contact, ...updates };
    contacts.set(contactId, updated);
    return updated;
  }
}

export const crossPlatformService = new CrossPlatformService();
