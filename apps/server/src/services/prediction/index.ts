/**
 * Predictive Email Intelligence Service
 * Predict incoming emails and prepare responses in advance
 */

import { AIService } from '../ai/index.js';

export interface EmailPrediction {
  id: string;
  predictedAt: Date;
  expectedArrival: {
    from: Date;
    to: Date;
  };
  probability: number;
  sender: {
    email: string;
    name: string;
    relationship: string;
  };
  subject: {
    predicted: string;
    confidence: number;
  };
  content: {
    topics: string[];
    tone: string;
    urgency: 'low' | 'medium' | 'high';
    expectedLength: 'short' | 'medium' | 'long';
  };
  context: {
    triggerEvent: string;
    relatedEmails: string[];
    relatedCalendarEvents: string[];
  };
  preparedResponses: Array<{
    scenario: string;
    response: string;
    probability: number;
  }>;
  status: 'pending' | 'fulfilled' | 'expired' | 'missed';
  actualEmailId?: string;
}

export interface PredictionContext {
  recentEmails: Array<{
    id: string;
    from: string;
    subject: string;
    date: Date;
    isAwaitingReply: boolean;
  }>;
  calendarEvents: Array<{
    id: string;
    title: string;
    date: Date;
    participants: string[];
  }>;
  pendingTasks: Array<{
    description: string;
    deadline?: Date;
    relatedContacts: string[];
  }>;
  userPatterns: {
    typicalResponseTime: Record<string, number>;
    importantContacts: string[];
    activeProjects: string[];
  };
}

export interface PredictionStats {
  totalPredictions: number;
  fulfilledPredictions: number;
  accuracy: number;
  averageLeadTime: number; // minutes before email actually arrives
  topPredictedSenders: Array<{ email: string; count: number }>;
}

// In-memory storage
const predictions = new Map<string, EmailPrediction>();
const predictionHistory: EmailPrediction[] = [];

export class PredictionService {
  private aiService: AIService;

  constructor() {
    this.aiService = new AIService();
  }

  /**
   * Generate predictions based on context
   */
  async generatePredictions(
    userId: string,
    context: PredictionContext
  ): Promise<EmailPrediction[]> {
    const newPredictions: EmailPrediction[] = [];

    // 1. Predict follow-ups to awaiting replies
    for (const email of context.recentEmails.filter(e => e.isAwaitingReply)) {
      const prediction = await this.predictFollowUp(userId, email, context);
      if (prediction) {
        newPredictions.push(prediction);
        predictions.set(prediction.id, prediction);
      }
    }

    // 2. Predict calendar-related emails
    for (const event of context.calendarEvents) {
      const prediction = await this.predictCalendarRelated(userId, event, context);
      if (prediction) {
        newPredictions.push(prediction);
        predictions.set(prediction.id, prediction);
      }
    }

    // 3. Predict deadline-related emails
    for (const task of context.pendingTasks.filter(t => t.deadline)) {
      const prediction = await this.predictDeadlineRelated(userId, task, context);
      if (prediction) {
        newPredictions.push(prediction);
        predictions.set(prediction.id, prediction);
      }
    }

    // 4. AI-powered pattern prediction
    const patternPredictions = await this.predictFromPatterns(userId, context);
    for (const prediction of patternPredictions) {
      newPredictions.push(prediction);
      predictions.set(prediction.id, prediction);
    }

    return newPredictions;
  }

  /**
   * Predict follow-up email
   */
  private async predictFollowUp(
    userId: string,
    email: { id: string; from: string; subject: string; date: Date },
    context: PredictionContext
  ): Promise<EmailPrediction | null> {
    const daysSinceSent = (Date.now() - email.date.getTime()) / (1000 * 60 * 60 * 24);

    // Only predict if reasonable time has passed
    if (daysSinceSent < 1 || daysSinceSent > 14) return null;

    const typicalResponseTime = context.userPatterns.typicalResponseTime[email.from] || 48; // hours
    const expectedArrivalStart = new Date(email.date.getTime() + typicalResponseTime * 60 * 60 * 1000);
    const expectedArrivalEnd = new Date(expectedArrivalStart.getTime() + 24 * 60 * 60 * 1000);

    // Calculate probability based on time passed
    let probability = 0.7;
    if (daysSinceSent > typicalResponseTime / 24) probability -= 0.1;
    if (daysSinceSent > typicalResponseTime / 24 * 2) probability -= 0.2;

    const prediction: EmailPrediction = {
      id: `pred_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      predictedAt: new Date(),
      expectedArrival: {
        from: expectedArrivalStart,
        to: expectedArrivalEnd,
      },
      probability,
      sender: {
        email: email.from,
        name: email.from.split('@')[0],
        relationship: 'contact',
      },
      subject: {
        predicted: `Re: ${email.subject}`,
        confidence: 0.9,
      },
      content: {
        topics: ['回复', email.subject],
        tone: 'professional',
        urgency: 'medium',
        expectedLength: 'medium',
      },
      context: {
        triggerEvent: 'awaiting_reply',
        relatedEmails: [email.id],
        relatedCalendarEvents: [],
      },
      preparedResponses: [],
      status: 'pending',
    };

    // Generate prepared responses
    prediction.preparedResponses = await this.generatePreparedResponses(prediction);

    return prediction;
  }

  /**
   * Predict calendar-related email
   */
  private async predictCalendarRelated(
    userId: string,
    event: { id: string; title: string; date: Date; participants: string[] },
    context: PredictionContext
  ): Promise<EmailPrediction | null> {
    const hoursUntilEvent = (event.date.getTime() - Date.now()) / (1000 * 60 * 60);

    // Predict reminder emails 24-48 hours before
    if (hoursUntilEvent < 24 || hoursUntilEvent > 72) return null;

    const prediction: EmailPrediction = {
      id: `pred_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      predictedAt: new Date(),
      expectedArrival: {
        from: new Date(event.date.getTime() - 24 * 60 * 60 * 1000),
        to: event.date,
      },
      probability: 0.6,
      sender: {
        email: event.participants[0] || 'calendar@notification.com',
        name: 'Meeting Organizer',
        relationship: 'meeting_participant',
      },
      subject: {
        predicted: `Reminder: ${event.title}`,
        confidence: 0.7,
      },
      content: {
        topics: ['meeting', 'reminder', event.title],
        tone: 'professional',
        urgency: 'medium',
        expectedLength: 'short',
      },
      context: {
        triggerEvent: 'upcoming_meeting',
        relatedEmails: [],
        relatedCalendarEvents: [event.id],
      },
      preparedResponses: [
        {
          scenario: 'confirm_attendance',
          response: `Hi,\n\nThank you for the reminder. I'll be there.\n\nBest regards`,
          probability: 0.6,
        },
        {
          scenario: 'reschedule_request',
          response: `Hi,\n\nI apologize, but I need to reschedule. Would any of the following times work?\n\n- [Alternative 1]\n- [Alternative 2]\n\nBest regards`,
          probability: 0.2,
        },
        {
          scenario: 'request_agenda',
          response: `Hi,\n\nLooking forward to the meeting. Could you please share the agenda beforehand?\n\nThanks`,
          probability: 0.2,
        },
      ],
      status: 'pending',
    };

    return prediction;
  }

  /**
   * Predict deadline-related email
   */
  private async predictDeadlineRelated(
    userId: string,
    task: { description: string; deadline?: Date; relatedContacts: string[] },
    context: PredictionContext
  ): Promise<EmailPrediction | null> {
    if (!task.deadline) return null;

    const daysUntilDeadline = (task.deadline.getTime() - Date.now()) / (1000 * 60 * 60 * 24);

    // Predict check-in emails 2-5 days before deadline
    if (daysUntilDeadline < 2 || daysUntilDeadline > 7) return null;

    const prediction: EmailPrediction = {
      id: `pred_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      predictedAt: new Date(),
      expectedArrival: {
        from: new Date(),
        to: task.deadline,
      },
      probability: 0.5,
      sender: {
        email: task.relatedContacts[0] || 'unknown@company.com',
        name: 'Project Stakeholder',
        relationship: 'stakeholder',
      },
      subject: {
        predicted: `Status update on: ${task.description}`,
        confidence: 0.6,
      },
      content: {
        topics: ['status', 'deadline', 'progress'],
        tone: 'professional',
        urgency: daysUntilDeadline < 3 ? 'high' : 'medium',
        expectedLength: 'short',
      },
      context: {
        triggerEvent: 'approaching_deadline',
        relatedEmails: [],
        relatedCalendarEvents: [],
      },
      preparedResponses: [
        {
          scenario: 'on_track',
          response: `Hi,\n\nThank you for checking in. We are on track to meet the deadline. Current progress: [X]%.\n\nBest regards`,
          probability: 0.5,
        },
        {
          scenario: 'need_extension',
          response: `Hi,\n\nI wanted to give you an update. We've encountered some challenges and may need a short extension. Could we discuss options?\n\nBest regards`,
          probability: 0.3,
        },
        {
          scenario: 'completed_early',
          response: `Hi,\n\nGreat news! We've completed the work ahead of schedule. Please find attached [deliverables].\n\nBest regards`,
          probability: 0.2,
        },
      ],
      status: 'pending',
    };

    return prediction;
  }

  /**
   * AI-powered pattern prediction
   */
  private async predictFromPatterns(
    userId: string,
    context: PredictionContext
  ): Promise<EmailPrediction[]> {
    const prompt = `基于以下用户邮件模式和上下文，预测可能收到的邮件：

最近邮件：
${context.recentEmails.slice(0, 5).map(e => `- ${e.from}: ${e.subject} (${e.date.toISOString()})`).join('\n')}

日历事件：
${context.calendarEvents.slice(0, 5).map(e => `- ${e.title} at ${e.date.toISOString()}`).join('\n')}

待办任务：
${context.pendingTasks.slice(0, 5).map(t => `- ${t.description}`).join('\n')}

重要联系人：${context.userPatterns.importantContacts.join(', ')}
活跃项目：${context.userPatterns.activeProjects.join(', ')}

返回 JSON 数组，每个预测包含：
{
  "sender": "email@example.com",
  "senderName": "Name",
  "predictedSubject": "Subject",
  "probability": 0.7,
  "expectedWithinHours": 24,
  "topics": ["topic1", "topic2"],
  "urgency": "medium",
  "reason": "预测原因"
}`;

    try {
      const response = await this.aiService.generateReply({
        emailContent: prompt,
        tone: 'professional',
        length: 'detailed',
      });

      const parsed = JSON.parse(response.replies[0].content);

      return (Array.isArray(parsed) ? parsed : [parsed]).map((p: any) => ({
        id: `pred_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        predictedAt: new Date(),
        expectedArrival: {
          from: new Date(),
          to: new Date(Date.now() + (p.expectedWithinHours || 24) * 60 * 60 * 1000),
        },
        probability: p.probability || 0.5,
        sender: {
          email: p.sender,
          name: p.senderName,
          relationship: 'contact',
        },
        subject: {
          predicted: p.predictedSubject,
          confidence: p.probability || 0.5,
        },
        content: {
          topics: p.topics || [],
          tone: 'professional',
          urgency: p.urgency || 'medium',
          expectedLength: 'medium',
        },
        context: {
          triggerEvent: p.reason || 'pattern_analysis',
          relatedEmails: [],
          relatedCalendarEvents: [],
        },
        preparedResponses: [],
        status: 'pending' as const,
      }));
    } catch {
      return [];
    }
  }

  /**
   * Generate prepared responses for a prediction
   */
  private async generatePreparedResponses(
    prediction: EmailPrediction
  ): Promise<EmailPrediction['preparedResponses']> {
    const prompt = `为以下预测的邮件生成3个可能的回复方案：

预测发件人：${prediction.sender.name} <${prediction.sender.email}>
预测主题：${prediction.subject.predicted}
预测话题：${prediction.content.topics.join(', ')}
紧急程度：${prediction.content.urgency}

返回 JSON 数组：
[
  {
    "scenario": "场景名称",
    "response": "回复内容",
    "probability": 0.5
  }
]`;

    try {
      const response = await this.aiService.generateReply({
        emailContent: prompt,
        tone: 'professional',
        length: 'detailed',
      });

      return JSON.parse(response.replies[0].content);
    } catch {
      return [];
    }
  }

  /**
   * Match incoming email to predictions
   */
  matchIncomingEmail(
    from: string,
    subject: string,
    receivedAt: Date
  ): EmailPrediction | null {
    for (const [id, prediction] of predictions) {
      if (prediction.status !== 'pending') continue;

      // Check if sender matches
      const senderMatch = prediction.sender.email.toLowerCase() === from.toLowerCase();

      // Check if subject is similar
      const subjectMatch = this.calculateSubjectSimilarity(
        prediction.subject.predicted.toLowerCase(),
        subject.toLowerCase()
      ) > 0.5;

      // Check if within time window
      const timeMatch = receivedAt >= prediction.expectedArrival.from &&
                       receivedAt <= prediction.expectedArrival.to;

      if (senderMatch && (subjectMatch || timeMatch)) {
        prediction.status = 'fulfilled';
        prediction.actualEmailId = `email_${Date.now()}`;
        predictionHistory.push({ ...prediction });
        return prediction;
      }
    }

    return null;
  }

  /**
   * Calculate subject similarity
   */
  private calculateSubjectSimilarity(predicted: string, actual: string): number {
    const predictedWords = new Set(predicted.split(/\s+/));
    const actualWords = new Set(actual.split(/\s+/));

    let matchCount = 0;
    predictedWords.forEach(word => {
      if (actualWords.has(word)) matchCount++;
    });

    return matchCount / Math.max(predictedWords.size, actualWords.size);
  }

  /**
   * Get active predictions
   */
  getActivePredictions(): EmailPrediction[] {
    const now = new Date();
    return Array.from(predictions.values())
      .filter(p => p.status === 'pending' && p.expectedArrival.to > now)
      .sort((a, b) => a.expectedArrival.from.getTime() - b.expectedArrival.from.getTime());
  }

  /**
   * Get prediction statistics
   */
  getStats(): PredictionStats {
    const fulfilled = predictionHistory.filter(p => p.status === 'fulfilled');
    const senderCounts = new Map<string, number>();

    predictionHistory.forEach(p => {
      const count = senderCounts.get(p.sender.email) || 0;
      senderCounts.set(p.sender.email, count + 1);
    });

    const topSenders = Array.from(senderCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([email, count]) => ({ email, count }));

    return {
      totalPredictions: predictionHistory.length,
      fulfilledPredictions: fulfilled.length,
      accuracy: predictionHistory.length > 0 ? fulfilled.length / predictionHistory.length : 0,
      averageLeadTime: 0, // Would calculate from actual data
      topPredictedSenders: topSenders,
    };
  }

  /**
   * Update expired predictions
   */
  cleanupPredictions(): void {
    const now = new Date();
    for (const [id, prediction] of predictions) {
      if (prediction.status === 'pending' && prediction.expectedArrival.to < now) {
        prediction.status = 'expired';
        predictionHistory.push({ ...prediction });
        predictions.delete(id);
      }
    }
  }
}

export const predictionService = new PredictionService();
