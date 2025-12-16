/**
 * Batch Email Processing Service
 *
 * Efficiently process multiple emails at once with
 * smart classification and priority sorting.
 */

import OpenAI from 'openai';
import { config } from '../../config/index.js';
import { logger } from '../../utils/logger.js';

interface Email {
  id: string;
  subject: string;
  from: string;
  to: string[];
  body: string;
  receivedAt: Date;
  isRead: boolean;
  hasAttachment: boolean;
  threadId?: string;
}

interface ClassifiedEmail extends Email {
  classification: EmailClassification;
  summary?: string;
  suggestedAction?: string;
}

interface EmailClassification {
  category: EmailCategory;
  priority: Priority;
  sentiment: Sentiment;
  isActionRequired: boolean;
  confidence: number;
  tags: string[];
}

type EmailCategory =
  | 'important'
  | 'work'
  | 'personal'
  | 'newsletter'
  | 'promotional'
  | 'social'
  | 'transactional'
  | 'spam'
  | 'support'
  | 'meeting'
  | 'finance';

type Priority = 'critical' | 'high' | 'medium' | 'low' | 'none';
type Sentiment = 'positive' | 'neutral' | 'negative' | 'urgent';

interface BatchProcessResult {
  totalProcessed: number;
  processingTime: number;
  categories: Record<EmailCategory, ClassifiedEmail[]>;
  priorityGroups: Record<Priority, ClassifiedEmail[]>;
  actionRequired: ClassifiedEmail[];
  summaries: EmailSummary[];
  insights: BatchInsights;
}

interface EmailSummary {
  emailId: string;
  oneSentence: string;
  keyPoints: string[];
  actionItems: string[];
}

interface BatchInsights {
  totalUnread: number;
  urgentCount: number;
  topSenders: { email: string; count: number }[];
  categoryDistribution: Record<string, number>;
  averageSentiment: number;
  suggestedFocus: string[];
}

export class BatchProcessingService {
  private openai: OpenAI;
  private batchSize = 10; // Process in batches for efficiency

  constructor() {
    this.openai = new OpenAI({ apiKey: config.openaiApiKey });
  }

  /**
   * Process a batch of emails
   */
  async processBatch(emails: Email[]): Promise<BatchProcessResult> {
    const startTime = Date.now();
    logger.info({ msg: 'Starting batch processing', count: emails.length });

    // Process in smaller batches for API efficiency
    const classifiedEmails: ClassifiedEmail[] = [];
    for (let i = 0; i < emails.length; i += this.batchSize) {
      const batch = emails.slice(i, i + this.batchSize);
      const classified = await this.classifyBatch(batch);
      classifiedEmails.push(...classified);
    }

    // Generate summaries for important emails
    const importantEmails = classifiedEmails.filter(
      e => e.classification.priority === 'critical' ||
           e.classification.priority === 'high' ||
           e.classification.isActionRequired
    );
    const summaries = await this.generateSummaries(importantEmails);

    // Organize results
    const result = this.organizeResults(classifiedEmails, summaries);
    result.processingTime = Date.now() - startTime;
    result.totalProcessed = emails.length;

    logger.info({
      msg: 'Batch processing complete',
      count: emails.length,
      duration: result.processingTime
    });

    return result;
  }

  /**
   * Classify a batch of emails using AI
   */
  private async classifyBatch(emails: Email[]): Promise<ClassifiedEmail[]> {
    const emailSummaries = emails.map((e, i) =>
      `[${i}] From: ${e.from}\nSubject: ${e.subject}\nPreview: ${e.body.slice(0, 200)}...`
    ).join('\n\n---\n\n');

    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: `Classify these emails. For each email index, provide:
- category: important|work|personal|newsletter|promotional|social|transactional|spam|support|meeting|finance
- priority: critical|high|medium|low|none
- sentiment: positive|neutral|negative|urgent
- isActionRequired: boolean
- tags: relevant keywords
- suggestedAction: brief action suggestion

Return JSON array matching email indices:
{ "classifications": [{ "index": 0, "category": "", "priority": "", "sentiment": "", "isActionRequired": false, "tags": [], "suggestedAction": "" }] }`,
          },
          { role: 'user', content: emailSummaries },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.3,
      });

      const result = JSON.parse(response.choices[0]?.message?.content || '{}');
      const classifications = result.classifications || [];

      return emails.map((email, i) => {
        const classification = classifications.find((c: any) => c.index === i) || {
          category: 'work',
          priority: 'medium',
          sentiment: 'neutral',
          isActionRequired: false,
          tags: [],
          suggestedAction: '',
        };

        return {
          ...email,
          classification: {
            category: classification.category,
            priority: classification.priority,
            sentiment: classification.sentiment,
            isActionRequired: classification.isActionRequired,
            confidence: 0.8,
            tags: classification.tags || [],
          },
          suggestedAction: classification.suggestedAction,
        };
      });
    } catch (error) {
      logger.error({ msg: 'Batch classification failed', error });
      // Return with default classification
      return emails.map(email => ({
        ...email,
        classification: {
          category: 'work' as EmailCategory,
          priority: 'medium' as Priority,
          sentiment: 'neutral' as Sentiment,
          isActionRequired: false,
          confidence: 0,
          tags: [],
        },
      }));
    }
  }

  /**
   * Generate summaries for important emails
   */
  private async generateSummaries(emails: ClassifiedEmail[]): Promise<EmailSummary[]> {
    if (emails.length === 0) return [];

    const summaries: EmailSummary[] = [];

    // Process in parallel with limit
    const batchPromises = emails.slice(0, 20).map(async (email) => {
      try {
        const response = await this.openai.chat.completions.create({
          model: 'gpt-3.5-turbo',
          messages: [
            {
              role: 'system',
              content: `Summarize this email. Return JSON:
{
  "oneSentence": "One sentence summary",
  "keyPoints": ["key point 1", "key point 2"],
  "actionItems": ["action if any"]
}`,
            },
            {
              role: 'user',
              content: `Subject: ${email.subject}\nFrom: ${email.from}\n\n${email.body.slice(0, 2000)}`
            },
          ],
          response_format: { type: 'json_object' },
          temperature: 0.3,
        });

        const result = JSON.parse(response.choices[0]?.message?.content || '{}');
        return {
          emailId: email.id,
          oneSentence: result.oneSentence || '',
          keyPoints: result.keyPoints || [],
          actionItems: result.actionItems || [],
        };
      } catch (error) {
        return {
          emailId: email.id,
          oneSentence: email.subject,
          keyPoints: [],
          actionItems: [],
        };
      }
    });

    const results = await Promise.all(batchPromises);
    summaries.push(...results);

    return summaries;
  }

  /**
   * Organize results into useful groups
   */
  private organizeResults(
    emails: ClassifiedEmail[],
    summaries: EmailSummary[]
  ): BatchProcessResult {
    // Group by category
    const categories: Record<EmailCategory, ClassifiedEmail[]> = {
      important: [],
      work: [],
      personal: [],
      newsletter: [],
      promotional: [],
      social: [],
      transactional: [],
      spam: [],
      support: [],
      meeting: [],
      finance: [],
    };

    // Group by priority
    const priorityGroups: Record<Priority, ClassifiedEmail[]> = {
      critical: [],
      high: [],
      medium: [],
      low: [],
      none: [],
    };

    const actionRequired: ClassifiedEmail[] = [];
    const categoryDistribution: Record<string, number> = {};
    let sentimentSum = 0;

    for (const email of emails) {
      const { category, priority, sentiment, isActionRequired } = email.classification;

      // Add to category group
      if (categories[category]) {
        categories[category].push(email);
      }

      // Add to priority group
      if (priorityGroups[priority]) {
        priorityGroups[priority].push(email);
      }

      // Track action required
      if (isActionRequired) {
        actionRequired.push(email);
      }

      // Track distribution
      categoryDistribution[category] = (categoryDistribution[category] || 0) + 1;

      // Calculate sentiment score
      const sentimentScore = sentiment === 'positive' ? 1 : sentiment === 'negative' ? -1 : sentiment === 'urgent' ? -0.5 : 0;
      sentimentSum += sentimentScore;
    }

    // Calculate top senders
    const senderCounts: Record<string, number> = {};
    for (const email of emails) {
      senderCounts[email.from] = (senderCounts[email.from] || 0) + 1;
    }
    const topSenders = Object.entries(senderCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([email, count]) => ({ email, count }));

    // Generate suggested focus areas
    const suggestedFocus: string[] = [];
    if (priorityGroups.critical.length > 0) {
      suggestedFocus.push(`${priorityGroups.critical.length} critical email(s) need immediate attention`);
    }
    if (actionRequired.length > 0) {
      suggestedFocus.push(`${actionRequired.length} email(s) require action`);
    }
    if (categories.meeting.length > 0) {
      suggestedFocus.push(`${categories.meeting.length} meeting-related email(s)`);
    }

    const insights: BatchInsights = {
      totalUnread: emails.filter(e => !e.isRead).length,
      urgentCount: priorityGroups.critical.length + priorityGroups.high.length,
      topSenders,
      categoryDistribution,
      averageSentiment: emails.length > 0 ? sentimentSum / emails.length : 0,
      suggestedFocus,
    };

    return {
      totalProcessed: 0,
      processingTime: 0,
      categories,
      priorityGroups,
      actionRequired,
      summaries,
      insights,
    };
  }

  /**
   * Smart inbox zero - suggest actions for all emails
   */
  async suggestInboxZeroActions(emails: Email[]): Promise<{
    archive: Email[];
    reply: { email: Email; suggestedReply: string }[];
    delegate: { email: Email; suggestedDelegate: string }[];
    schedule: { email: Email; suggestedTime: string }[];
    delete: Email[];
  }> {
    const result = await this.processBatch(emails);

    return {
      archive: [
        ...result.categories.newsletter,
        ...result.categories.promotional,
        ...result.categories.transactional.filter(e => !e.classification.isActionRequired),
      ],
      reply: result.actionRequired
        .filter(e => e.classification.category !== 'spam')
        .map(e => ({
          email: e,
          suggestedReply: e.suggestedAction || 'Reply needed',
        })),
      delegate: result.priorityGroups.high
        .filter(e => e.classification.tags.includes('delegate'))
        .map(e => ({
          email: e,
          suggestedDelegate: 'Team member',
        })),
      schedule: result.categories.meeting.map(e => ({
        email: e,
        suggestedTime: 'Review calendar for availability',
      })),
      delete: result.categories.spam,
    };
  }

  /**
   * Get daily email digest
   */
  async generateDailyDigest(emails: Email[]): Promise<{
    summary: string;
    highlights: string[];
    actionItems: string[];
    stats: {
      total: number;
      unread: number;
      urgent: number;
      needsReply: number;
    };
  }> {
    const result = await this.processBatch(emails);

    // Combine all action items
    const allActionItems = result.summaries
      .flatMap(s => s.actionItems)
      .filter(Boolean)
      .slice(0, 10);

    // Generate highlights
    const highlights = [
      ...result.priorityGroups.critical.map(e => `🔴 CRITICAL: ${e.subject}`),
      ...result.priorityGroups.high.slice(0, 3).map(e => `🟡 Important: ${e.subject}`),
    ];

    // Generate summary
    const summaryText = `Today you received ${emails.length} emails. ` +
      `${result.insights.urgentCount} need urgent attention. ` +
      `Top sender: ${result.insights.topSenders[0]?.email || 'N/A'}. ` +
      `${result.actionRequired.length} emails require action.`;

    return {
      summary: summaryText,
      highlights,
      actionItems: allActionItems,
      stats: {
        total: emails.length,
        unread: result.insights.totalUnread,
        urgent: result.insights.urgentCount,
        needsReply: result.actionRequired.length,
      },
    };
  }

  /**
   * Find similar emails (for threading or deduplication)
   */
  async findSimilarEmails(targetEmail: Email, allEmails: Email[]): Promise<{
    email: Email;
    similarity: number;
    relationship: 'duplicate' | 'thread' | 'related' | 'different';
  }[]> {
    const targetText = `${targetEmail.subject} ${targetEmail.body.slice(0, 500)}`;

    const results = await Promise.all(
      allEmails
        .filter(e => e.id !== targetEmail.id)
        .slice(0, 50) // Limit for performance
        .map(async (email) => {
          const emailText = `${email.subject} ${email.body.slice(0, 500)}`;

          // Simple similarity check (in production, use embeddings)
          const similarity = this.calculateTextSimilarity(targetText, emailText);

          let relationship: 'duplicate' | 'thread' | 'related' | 'different';
          if (similarity > 0.9) relationship = 'duplicate';
          else if (email.threadId === targetEmail.threadId || similarity > 0.7) relationship = 'thread';
          else if (similarity > 0.4) relationship = 'related';
          else relationship = 'different';

          return { email, similarity, relationship };
        })
    );

    return results
      .filter(r => r.relationship !== 'different')
      .sort((a, b) => b.similarity - a.similarity);
  }

  /**
   * Simple text similarity (Jaccard index)
   */
  private calculateTextSimilarity(text1: string, text2: string): number {
    const words1 = new Set(text1.toLowerCase().split(/\s+/));
    const words2 = new Set(text2.toLowerCase().split(/\s+/));

    const intersection = new Set([...words1].filter(w => words2.has(w)));
    const union = new Set([...words1, ...words2]);

    return intersection.size / union.size;
  }
}

export const batchProcessingService = new BatchProcessingService();
