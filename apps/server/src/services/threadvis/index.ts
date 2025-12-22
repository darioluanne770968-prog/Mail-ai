/**
 * Thread Visualization Service
 * Interactive email thread visualization with relationship mapping
 */

import { AIService } from '../ai/index.js';

export interface ThreadParticipant {
  email: string;
  name: string;
  role: 'initiator' | 'primary' | 'cc' | 'late_joiner' | 'dropped';
  messageCount: number;
  firstAppearance: Date;
  lastAppearance: Date;
  avgResponseTime: number; // hours
  sentiment: 'positive' | 'negative' | 'neutral';
}

export interface ThreadMessage {
  id: string;
  from: string;
  to: string[];
  cc: string[];
  subject: string;
  timestamp: Date;
  snippet: string;
  wordCount: number;
  hasAttachment: boolean;
  sentiment: 'positive' | 'negative' | 'neutral';
  keyPoints: string[];
  replyToId?: string;
  depth: number;
}

export interface ThreadNode {
  id: string;
  messageId: string;
  from: string;
  timestamp: Date;
  snippet: string;
  children: ThreadNode[];
  sentiment: 'positive' | 'negative' | 'neutral';
  isKeyMessage: boolean;
}

export interface ThreadTimeline {
  threadId: string;
  subject: string;
  startDate: Date;
  endDate: Date;
  duration: number; // hours
  messageCount: number;
  participantCount: number;
  events: Array<{
    type: 'message' | 'participant_joined' | 'participant_left' | 'topic_change' | 'decision' | 'action_item';
    timestamp: Date;
    description: string;
    actor?: string;
    data?: any;
  }>;
}

export interface ThreadSummary {
  threadId: string;
  subject: string;
  overview: string;
  participants: ThreadParticipant[];
  keyDecisions: string[];
  actionItems: Array<{
    task: string;
    assignee: string;
    deadline?: string;
    status: 'pending' | 'in_progress' | 'completed' | 'unknown';
  }>;
  openQuestions: string[];
  sentiment: {
    overall: 'positive' | 'negative' | 'neutral' | 'mixed';
    trend: 'improving' | 'worsening' | 'stable';
  };
  topics: string[];
  suggestedNextSteps: string[];
}

export interface ThreadVisualization {
  type: 'tree' | 'timeline' | 'network' | 'heatmap';
  data: {
    nodes: Array<{
      id: string;
      label: string;
      type: string;
      x?: number;
      y?: number;
      size?: number;
      color?: string;
      metadata?: any;
    }>;
    edges: Array<{
      source: string;
      target: string;
      weight?: number;
      label?: string;
      type?: string;
    }>;
  };
  layout: {
    type: string;
    direction?: 'TB' | 'LR' | 'BT' | 'RL';
    spacing?: number;
  };
}

// In-memory storage
const threadCache = new Map<string, {
  messages: ThreadMessage[];
  participants: ThreadParticipant[];
  summary?: ThreadSummary;
  cachedAt: Date;
}>();

export class ThreadVisualizationService {
  private aiService: AIService;

  constructor() {
    this.aiService = new AIService();
  }

  /**
   * Process email thread for visualization
   */
  async processThread(
    emails: Array<{
      id: string;
      from: string;
      to: string[];
      cc: string[];
      subject: string;
      body: string;
      timestamp: Date;
      replyToId?: string;
    }>
  ): Promise<{ threadId: string; messages: ThreadMessage[]; participants: ThreadParticipant[] }> {
    const threadId = `thread_${Date.now()}`;
    const messages: ThreadMessage[] = [];
    const participantMap = new Map<string, ThreadParticipant>();

    // Sort by timestamp
    const sortedEmails = [...emails].sort((a, b) =>
      new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );

    // Process each email
    for (let i = 0; i < sortedEmails.length; i++) {
      const email = sortedEmails[i];
      const depth = this.calculateDepth(email, sortedEmails);

      // Analyze sentiment
      const sentiment = await this.analyzeSentiment(email.body);

      // Extract key points
      const keyPoints = await this.extractKeyPoints(email.body);

      const message: ThreadMessage = {
        id: email.id,
        from: email.from,
        to: email.to,
        cc: email.cc,
        subject: email.subject,
        timestamp: new Date(email.timestamp),
        snippet: email.body.slice(0, 200),
        wordCount: email.body.split(/\s+/).length,
        hasAttachment: false, // Would need actual attachment data
        sentiment,
        keyPoints,
        replyToId: email.replyToId,
        depth,
      };
      messages.push(message);

      // Update participant info
      this.updateParticipant(participantMap, email.from, message, 'sender');
      email.to.forEach(to => this.updateParticipant(participantMap, to, message, 'recipient'));
      email.cc.forEach(cc => this.updateParticipant(participantMap, cc, message, 'cc'));
    }

    // Determine participant roles
    const participants = this.finalizeParticipants(participantMap, sortedEmails);

    // Cache results
    threadCache.set(threadId, {
      messages,
      participants,
      cachedAt: new Date(),
    });

    return { threadId, messages, participants };
  }

  /**
   * Calculate message depth in thread
   */
  private calculateDepth(
    email: { id: string; replyToId?: string },
    allEmails: Array<{ id: string; replyToId?: string }>
  ): number {
    if (!email.replyToId) return 0;

    const parent = allEmails.find(e => e.id === email.replyToId);
    if (!parent) return 0;

    return 1 + this.calculateDepth(parent, allEmails);
  }

  /**
   * Analyze sentiment of text
   */
  private async analyzeSentiment(text: string): Promise<'positive' | 'negative' | 'neutral'> {
    // Simple keyword-based sentiment for performance
    const positiveWords = ['thanks', 'great', 'excellent', 'happy', 'pleased', 'appreciate',
      '感谢', '好', '棒', '高兴', '满意', '感激'];
    const negativeWords = ['problem', 'issue', 'concern', 'disappointed', 'urgent', 'failed',
      '问题', '困难', '担心', '失望', '紧急', '失败'];

    const lowerText = text.toLowerCase();
    const positiveCount = positiveWords.filter(w => lowerText.includes(w)).length;
    const negativeCount = negativeWords.filter(w => lowerText.includes(w)).length;

    if (positiveCount > negativeCount) return 'positive';
    if (negativeCount > positiveCount) return 'negative';
    return 'neutral';
  }

  /**
   * Extract key points from text
   */
  private async extractKeyPoints(text: string): Promise<string[]> {
    // Simple extraction - look for actionable items and decisions
    const points: string[] = [];
    const lines = text.split('\n');

    for (const line of lines) {
      const trimmed = line.trim();
      if (
        trimmed.startsWith('- ') ||
        trimmed.startsWith('• ') ||
        trimmed.match(/^\d+\./) ||
        trimmed.includes('决定') ||
        trimmed.includes('同意') ||
        trimmed.includes('请') ||
        trimmed.includes('需要') ||
        trimmed.toLowerCase().includes('action') ||
        trimmed.toLowerCase().includes('decision') ||
        trimmed.toLowerCase().includes('please') ||
        trimmed.toLowerCase().includes('need')
      ) {
        points.push(trimmed.slice(0, 100));
      }
    }

    return points.slice(0, 5);
  }

  /**
   * Update participant information
   */
  private updateParticipant(
    participantMap: Map<string, ThreadParticipant>,
    email: string,
    message: ThreadMessage,
    role: 'sender' | 'recipient' | 'cc'
  ): void {
    const existing = participantMap.get(email);

    if (!existing) {
      participantMap.set(email, {
        email,
        name: email.split('@')[0],
        role: role === 'cc' ? 'cc' : 'primary',
        messageCount: role === 'sender' ? 1 : 0,
        firstAppearance: message.timestamp,
        lastAppearance: message.timestamp,
        avgResponseTime: 0,
        sentiment: message.sentiment,
      });
    } else {
      if (role === 'sender') {
        existing.messageCount++;
      }
      if (message.timestamp < existing.firstAppearance) {
        existing.firstAppearance = message.timestamp;
      }
      if (message.timestamp > existing.lastAppearance) {
        existing.lastAppearance = message.timestamp;
      }
    }
  }

  /**
   * Finalize participant roles
   */
  private finalizeParticipants(
    participantMap: Map<string, ThreadParticipant>,
    emails: Array<{ from: string; timestamp: Date }>
  ): ThreadParticipant[] {
    const participants = Array.from(participantMap.values());

    if (emails.length > 0) {
      const initiator = emails[0].from;
      const participant = participants.find(p => p.email === initiator);
      if (participant) {
        participant.role = 'initiator';
      }
    }

    // Mark late joiners (appeared after 50% of thread)
    if (emails.length > 2) {
      const midPoint = emails[Math.floor(emails.length / 2)].timestamp;
      participants.forEach(p => {
        if (p.role !== 'initiator' && p.firstAppearance > midPoint) {
          p.role = 'late_joiner';
        }
      });
    }

    return participants.sort((a, b) => b.messageCount - a.messageCount);
  }

  /**
   * Generate thread tree structure
   */
  buildThreadTree(messages: ThreadMessage[]): ThreadNode[] {
    const nodeMap = new Map<string, ThreadNode>();
    const roots: ThreadNode[] = [];

    // Create nodes
    messages.forEach(msg => {
      nodeMap.set(msg.id, {
        id: msg.id,
        messageId: msg.id,
        from: msg.from,
        timestamp: msg.timestamp,
        snippet: msg.snippet,
        children: [],
        sentiment: msg.sentiment,
        isKeyMessage: msg.keyPoints.length > 2,
      });
    });

    // Build tree
    messages.forEach(msg => {
      const node = nodeMap.get(msg.id)!;
      if (msg.replyToId && nodeMap.has(msg.replyToId)) {
        nodeMap.get(msg.replyToId)!.children.push(node);
      } else {
        roots.push(node);
      }
    });

    return roots;
  }

  /**
   * Generate timeline visualization
   */
  async generateTimeline(threadId: string): Promise<ThreadTimeline | null> {
    const cached = threadCache.get(threadId);
    if (!cached) return null;

    const { messages, participants } = cached;
    if (messages.length === 0) return null;

    const events: ThreadTimeline['events'] = [];

    // Add message events
    messages.forEach(msg => {
      events.push({
        type: 'message',
        timestamp: msg.timestamp,
        description: `${msg.from} 发送了消息`,
        actor: msg.from,
        data: { messageId: msg.id, snippet: msg.snippet },
      });
    });

    // Detect participant joins
    const participantFirstMsg = new Map<string, Date>();
    messages.forEach(msg => {
      [msg.from, ...msg.to, ...msg.cc].forEach(email => {
        if (!participantFirstMsg.has(email)) {
          participantFirstMsg.set(email, msg.timestamp);
        }
      });
    });

    participantFirstMsg.forEach((timestamp, email) => {
      if (timestamp !== messages[0].timestamp) {
        events.push({
          type: 'participant_joined',
          timestamp,
          description: `${email} 加入对话`,
          actor: email,
        });
      }
    });

    // Sort events by timestamp
    events.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

    const startDate = messages[0].timestamp;
    const endDate = messages[messages.length - 1].timestamp;

    return {
      threadId,
      subject: messages[0].subject,
      startDate,
      endDate,
      duration: (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60),
      messageCount: messages.length,
      participantCount: participants.length,
      events,
    };
  }

  /**
   * Generate comprehensive thread summary
   */
  async generateSummary(threadId: string): Promise<ThreadSummary | null> {
    const cached = threadCache.get(threadId);
    if (!cached) return null;

    // Return cached summary if available
    if (cached.summary) return cached.summary;

    const { messages, participants } = cached;
    if (messages.length === 0) return null;

    const allContent = messages.map(m => `${m.from}: ${m.snippet}`).join('\n\n');

    const prompt = `分析以下邮件线程并提供综合摘要：

主题: ${messages[0].subject}
参与者: ${participants.map(p => p.email).join(', ')}
消息数: ${messages.length}

内容:
${allContent.slice(0, 3000)}

返回 JSON：
{
  "overview": "线程概述（2-3句话）",
  "keyDecisions": ["决定1", "决定2"],
  "actionItems": [
    {
      "task": "任务描述",
      "assignee": "负责人邮箱",
      "deadline": "截止日期（如有）",
      "status": "pending|in_progress|completed|unknown"
    }
  ],
  "openQuestions": ["未解决问题1", "未解决问题2"],
  "sentiment": {
    "overall": "positive|negative|neutral|mixed",
    "trend": "improving|worsening|stable"
  },
  "topics": ["主题1", "主题2"],
  "suggestedNextSteps": ["建议1", "建议2"]
}`;

    try {
      const response = await this.aiService.generateReply({
        emailContent: prompt,
        tone: 'professional',
        length: 'detailed',
      });

      const result = JSON.parse(response.replies[0].content);

      const summary: ThreadSummary = {
        threadId,
        subject: messages[0].subject,
        overview: result.overview || '邮件线程摘要',
        participants,
        keyDecisions: result.keyDecisions || [],
        actionItems: result.actionItems || [],
        openQuestions: result.openQuestions || [],
        sentiment: result.sentiment || { overall: 'neutral', trend: 'stable' },
        topics: result.topics || [],
        suggestedNextSteps: result.suggestedNextSteps || [],
      };

      // Cache summary
      cached.summary = summary;

      return summary;
    } catch {
      return {
        threadId,
        subject: messages[0].subject,
        overview: `包含 ${messages.length} 封邮件的线程`,
        participants,
        keyDecisions: [],
        actionItems: [],
        openQuestions: [],
        sentiment: { overall: 'neutral', trend: 'stable' },
        topics: [],
        suggestedNextSteps: ['继续阅读完整邮件了解详情'],
      };
    }
  }

  /**
   * Generate visualization data
   */
  generateVisualization(
    threadId: string,
    type: 'tree' | 'timeline' | 'network' | 'heatmap'
  ): ThreadVisualization | null {
    const cached = threadCache.get(threadId);
    if (!cached) return null;

    const { messages, participants } = cached;

    switch (type) {
      case 'tree':
        return this.generateTreeVisualization(messages);
      case 'timeline':
        return this.generateTimelineVisualization(messages);
      case 'network':
        return this.generateNetworkVisualization(messages, participants);
      case 'heatmap':
        return this.generateHeatmapVisualization(messages);
      default:
        return null;
    }
  }

  /**
   * Generate tree visualization
   */
  private generateTreeVisualization(messages: ThreadMessage[]): ThreadVisualization {
    const nodes = messages.map((msg, index) => ({
      id: msg.id,
      label: `${msg.from.split('@')[0]}: ${msg.snippet.slice(0, 30)}...`,
      type: 'message',
      y: index * 80,
      x: msg.depth * 200,
      size: Math.min(20 + msg.wordCount / 10, 50),
      color: msg.sentiment === 'positive' ? '#10B981' :
             msg.sentiment === 'negative' ? '#EF4444' : '#6B7280',
      metadata: { from: msg.from, timestamp: msg.timestamp },
    }));

    const edges = messages
      .filter(msg => msg.replyToId)
      .map(msg => ({
        source: msg.replyToId!,
        target: msg.id,
        type: 'reply',
      }));

    return {
      type: 'tree',
      data: { nodes, edges },
      layout: { type: 'hierarchical', direction: 'TB', spacing: 100 },
    };
  }

  /**
   * Generate timeline visualization
   */
  private generateTimelineVisualization(messages: ThreadMessage[]): ThreadVisualization {
    const startTime = messages[0].timestamp.getTime();
    const endTime = messages[messages.length - 1].timestamp.getTime();
    const duration = endTime - startTime || 1;

    const nodes = messages.map(msg => ({
      id: msg.id,
      label: msg.from.split('@')[0],
      type: 'message',
      x: ((msg.timestamp.getTime() - startTime) / duration) * 1000,
      y: 100,
      size: 20,
      color: msg.sentiment === 'positive' ? '#10B981' :
             msg.sentiment === 'negative' ? '#EF4444' : '#6B7280',
      metadata: { timestamp: msg.timestamp, snippet: msg.snippet },
    }));

    const edges = messages
      .slice(1)
      .map((msg, index) => ({
        source: messages[index].id,
        target: msg.id,
        type: 'sequence',
      }));

    return {
      type: 'timeline',
      data: { nodes, edges },
      layout: { type: 'timeline', direction: 'LR' },
    };
  }

  /**
   * Generate network visualization
   */
  private generateNetworkVisualization(
    messages: ThreadMessage[],
    participants: ThreadParticipant[]
  ): ThreadVisualization {
    // Create participant nodes
    const nodes = participants.map((p, index) => {
      const angle = (2 * Math.PI * index) / participants.length;
      return {
        id: p.email,
        label: p.name,
        type: 'participant',
        x: 400 + Math.cos(angle) * 200,
        y: 300 + Math.sin(angle) * 200,
        size: 20 + p.messageCount * 5,
        color: p.role === 'initiator' ? '#8B5CF6' :
               p.role === 'primary' ? '#3B82F6' :
               p.role === 'cc' ? '#9CA3AF' : '#F59E0B',
        metadata: { role: p.role, messageCount: p.messageCount },
      };
    });

    // Create edges based on message flow
    const edgeMap = new Map<string, number>();
    messages.forEach(msg => {
      [...msg.to, ...msg.cc].forEach(recipient => {
        const key = `${msg.from}|${recipient}`;
        edgeMap.set(key, (edgeMap.get(key) || 0) + 1);
      });
    });

    const edges = Array.from(edgeMap.entries()).map(([key, weight]) => {
      const [source, target] = key.split('|');
      return {
        source,
        target,
        weight,
        label: `${weight} 封`,
        type: 'communication',
      };
    });

    return {
      type: 'network',
      data: { nodes, edges },
      layout: { type: 'force', spacing: 150 },
    };
  }

  /**
   * Generate heatmap visualization
   */
  private generateHeatmapVisualization(messages: ThreadMessage[]): ThreadVisualization {
    // Group by day and hour
    const heatmapData = new Map<string, number>();

    messages.forEach(msg => {
      const date = msg.timestamp;
      const day = date.getDay();
      const hour = date.getHours();
      const key = `${day}-${hour}`;
      heatmapData.set(key, (heatmapData.get(key) || 0) + 1);
    });

    const nodes: ThreadVisualization['data']['nodes'] = [];
    const maxCount = Math.max(...heatmapData.values(), 1);

    for (let day = 0; day < 7; day++) {
      for (let hour = 0; hour < 24; hour++) {
        const key = `${day}-${hour}`;
        const count = heatmapData.get(key) || 0;
        const intensity = count / maxCount;

        nodes.push({
          id: key,
          label: `${count}`,
          type: 'heatmap_cell',
          x: hour * 40,
          y: day * 40,
          size: 35,
          color: `rgba(59, 130, 246, ${0.1 + intensity * 0.9})`,
          metadata: { day, hour, count },
        });
      }
    }

    return {
      type: 'heatmap',
      data: { nodes, edges: [] },
      layout: { type: 'grid' },
    };
  }

  /**
   * Get cached thread data
   */
  getThreadData(threadId: string): {
    messages: ThreadMessage[];
    participants: ThreadParticipant[];
  } | null {
    const cached = threadCache.get(threadId);
    if (!cached) return null;
    return { messages: cached.messages, participants: cached.participants };
  }

  /**
   * Clear thread cache
   */
  clearCache(threadId?: string): void {
    if (threadId) {
      threadCache.delete(threadId);
    } else {
      threadCache.clear();
    }
  }
}

export const threadVisualizationService = new ThreadVisualizationService();
