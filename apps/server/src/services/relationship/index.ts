/**
 * Relationship Intelligence Graph Service
 * Visualize and manage contact networks
 */

import { AIService } from '../ai/index.js';

export interface Contact {
  id: string;
  email: string;
  name: string;
  company?: string;
  title?: string;
  avatarUrl?: string;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface Relationship {
  id: string;
  userId: string;
  contactId: string;
  contact: Contact;
  type: 'colleague' | 'client' | 'vendor' | 'friend' | 'family' | 'acquaintance' | 'unknown';
  strength: number; // 0-1
  sentiment: number; // -1 to 1
  stats: {
    totalEmails: number;
    emailsSent: number;
    emailsReceived: number;
    avgResponseTime: number; // minutes
    lastContact: Date;
    firstContact: Date;
  };
  healthMetrics: {
    score: number; // 0-100
    trend: 'improving' | 'stable' | 'declining';
    riskFactors: string[];
  };
  milestones: Array<{
    date: Date;
    type: string;
    description: string;
  }>;
  reminders: Array<{
    id: string;
    type: 'birthday' | 'anniversary' | 'follow_up' | 'custom';
    date: Date;
    message: string;
    recurring: boolean;
  }>;
}

export interface NetworkNode {
  id: string;
  label: string;
  email: string;
  type: Relationship['type'];
  strength: number;
  health: number;
  x?: number;
  y?: number;
  size: number;
  color: string;
}

export interface NetworkEdge {
  source: string;
  target: string;
  weight: number;
  type: 'direct' | 'mutual' | 'introduced';
}

export interface NetworkGraph {
  nodes: NetworkNode[];
  edges: NetworkEdge[];
  clusters: Array<{
    id: string;
    name: string;
    nodeIds: string[];
    color: string;
  }>;
  stats: {
    totalContacts: number;
    activeContacts: number;
    atRiskContacts: number;
    averageStrength: number;
  };
}

export interface RelationshipInsight {
  type: 'warning' | 'opportunity' | 'suggestion' | 'celebration';
  contactId: string;
  contactName: string;
  title: string;
  message: string;
  suggestedAction?: string;
  priority: 'low' | 'medium' | 'high';
  createdAt: Date;
}

export interface IntroductionSuggestion {
  person1: Contact;
  person2: Contact;
  reason: string;
  mutualConnections: Contact[];
  suggestedMessage: string;
  probability: number;
}

// In-memory storage
const contacts = new Map<string, Contact>();
const relationships = new Map<string, Relationship>();
const insights: RelationshipInsight[] = [];

export class RelationshipService {
  private aiService: AIService;

  constructor() {
    this.aiService = new AIService();
  }

  /**
   * Add or update a contact
   */
  upsertContact(contact: Omit<Contact, 'id' | 'createdAt' | 'updatedAt'>): Contact {
    const existing = Array.from(contacts.values()).find(c =>
      c.email.toLowerCase() === contact.email.toLowerCase()
    );

    if (existing) {
      const updated = {
        ...existing,
        ...contact,
        updatedAt: new Date(),
      };
      contacts.set(existing.id, updated);
      return updated;
    }

    const newContact: Contact = {
      ...contact,
      id: `contact_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    contacts.set(newContact.id, newContact);
    return newContact;
  }

  /**
   * Record email interaction
   */
  async recordInteraction(
    userId: string,
    email: {
      from: string;
      to: string[];
      subject: string;
      body: string;
      date: Date;
      direction: 'sent' | 'received';
    }
  ): Promise<Relationship[]> {
    const updatedRelationships: Relationship[] = [];

    // Get all involved contacts
    const emails = email.direction === 'sent' ? email.to : [email.from];

    for (const contactEmail of emails) {
      // Ensure contact exists
      let contact = Array.from(contacts.values()).find(c =>
        c.email.toLowerCase() === contactEmail.toLowerCase()
      );

      if (!contact) {
        contact = this.upsertContact({
          email: contactEmail,
          name: contactEmail.split('@')[0],
          tags: [],
        });
      }

      // Get or create relationship
      let relationship = Array.from(relationships.values()).find(r =>
        r.userId === userId && r.contactId === contact!.id
      );

      if (!relationship) {
        relationship = this.createRelationship(userId, contact);
      }

      // Update stats
      relationship.stats.totalEmails++;
      if (email.direction === 'sent') {
        relationship.stats.emailsSent++;
      } else {
        relationship.stats.emailsReceived++;
      }
      relationship.stats.lastContact = email.date;

      // Calculate response time if this is a reply
      if (email.subject.toLowerCase().startsWith('re:')) {
        // Simplified - would need actual thread data
        relationship.stats.avgResponseTime = (relationship.stats.avgResponseTime + 60) / 2;
      }

      // Analyze sentiment
      const sentiment = await this.analyzeSentiment(email.body);
      relationship.sentiment = (relationship.sentiment + sentiment) / 2;

      // Update strength
      relationship.strength = this.calculateStrength(relationship);

      // Update health
      relationship.healthMetrics = this.calculateHealth(relationship);

      relationships.set(relationship.id, relationship);
      updatedRelationships.push(relationship);
    }

    return updatedRelationships;
  }

  /**
   * Create new relationship
   */
  private createRelationship(userId: string, contact: Contact): Relationship {
    const relationship: Relationship = {
      id: `rel_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userId,
      contactId: contact.id,
      contact,
      type: 'unknown',
      strength: 0.1,
      sentiment: 0,
      stats: {
        totalEmails: 0,
        emailsSent: 0,
        emailsReceived: 0,
        avgResponseTime: 0,
        lastContact: new Date(),
        firstContact: new Date(),
      },
      healthMetrics: {
        score: 50,
        trend: 'stable',
        riskFactors: [],
      },
      milestones: [],
      reminders: [],
    };

    relationships.set(relationship.id, relationship);
    return relationship;
  }

  /**
   * Analyze sentiment of email content
   */
  private async analyzeSentiment(content: string): Promise<number> {
    const prompt = `分析以下文本的情感倾向，返回 -1 到 1 之间的数值：
- -1 表示非常负面
- 0 表示中性
- 1 表示非常正面

文本: ${content.slice(0, 500)}

只返回数字，例如: 0.5`;

    try {
      const response = await this.aiService.generateReply({
        emailContent: prompt,
        tone: 'professional',
        length: 'concise',
      });

      return parseFloat(response.replies[0].content) || 0;
    } catch {
      return 0;
    }
  }

  /**
   * Calculate relationship strength
   */
  private calculateStrength(relationship: Relationship): number {
    const { stats } = relationship;

    // Factors: email count, recency, balance
    const emailScore = Math.min(stats.totalEmails / 100, 1) * 0.3;

    const daysSinceContact = (Date.now() - stats.lastContact.getTime()) / (1000 * 60 * 60 * 24);
    const recencyScore = Math.max(0, 1 - daysSinceContact / 90) * 0.3;

    const balance = stats.emailsSent > 0
      ? Math.min(stats.emailsReceived / stats.emailsSent, stats.emailsSent / stats.emailsReceived)
      : 0;
    const balanceScore = balance * 0.2;

    const responseScore = stats.avgResponseTime > 0
      ? Math.max(0, 1 - stats.avgResponseTime / (24 * 60)) * 0.2
      : 0.1;

    return Math.min(1, emailScore + recencyScore + balanceScore + responseScore);
  }

  /**
   * Calculate relationship health
   */
  private calculateHealth(relationship: Relationship): Relationship['healthMetrics'] {
    const riskFactors: string[] = [];
    let score = 50;

    const { stats, sentiment, strength } = relationship;

    // Check for declining contact
    const daysSinceContact = (Date.now() - stats.lastContact.getTime()) / (1000 * 60 * 60 * 24);
    if (daysSinceContact > 30) {
      riskFactors.push('超过30天未联系');
      score -= 15;
    }
    if (daysSinceContact > 60) {
      riskFactors.push('关系可能正在疏远');
      score -= 10;
    }

    // Check for one-sided communication
    if (stats.emailsSent > stats.emailsReceived * 3) {
      riskFactors.push('沟通不平衡：对方回复较少');
      score -= 10;
    }
    if (stats.emailsReceived > stats.emailsSent * 3) {
      riskFactors.push('沟通不平衡：你回复较少');
      score -= 5;
    }

    // Check sentiment
    if (sentiment < -0.3) {
      riskFactors.push('最近沟通语气偏负面');
      score -= 15;
    }

    // Add positive factors
    if (strength > 0.7) score += 20;
    if (sentiment > 0.3) score += 10;
    if (daysSinceContact < 7) score += 10;

    score = Math.max(0, Math.min(100, score));

    // Determine trend
    let trend: Relationship['healthMetrics']['trend'] = 'stable';
    if (daysSinceContact > 30 && stats.totalEmails > 5) {
      trend = 'declining';
    } else if (daysSinceContact < 7 && sentiment > 0) {
      trend = 'improving';
    }

    return { score, trend, riskFactors };
  }

  /**
   * Get network graph for visualization
   */
  getNetworkGraph(userId: string): NetworkGraph {
    const userRelationships = Array.from(relationships.values())
      .filter(r => r.userId === userId);

    const nodes: NetworkNode[] = userRelationships.map(r => ({
      id: r.contactId,
      label: r.contact.name,
      email: r.contact.email,
      type: r.type,
      strength: r.strength,
      health: r.healthMetrics.score,
      size: 10 + r.strength * 20,
      color: this.getNodeColor(r.type, r.healthMetrics.score),
    }));

    // Generate edges based on shared emails (simplified)
    const edges: NetworkEdge[] = [];
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        // Check if contacts might know each other (same domain, same company, etc.)
        const node1 = nodes[i];
        const node2 = nodes[j];
        const domain1 = node1.email.split('@')[1];
        const domain2 = node2.email.split('@')[1];

        if (domain1 === domain2) {
          edges.push({
            source: node1.id,
            target: node2.id,
            weight: 0.5,
            type: 'mutual',
          });
        }
      }
    }

    // Create clusters by type
    const clusterColors: Record<string, string> = {
      colleague: '#4CAF50',
      client: '#2196F3',
      vendor: '#FF9800',
      friend: '#E91E63',
      family: '#9C27B0',
      acquaintance: '#607D8B',
      unknown: '#9E9E9E',
    };

    const clusters = Object.entries(
      userRelationships.reduce((acc, r) => {
        if (!acc[r.type]) acc[r.type] = [];
        acc[r.type].push(r.contactId);
        return acc;
      }, {} as Record<string, string[]>)
    ).map(([type, nodeIds]) => ({
      id: type,
      name: this.getTypeName(type as Relationship['type']),
      nodeIds,
      color: clusterColors[type] || '#9E9E9E',
    }));

    // Calculate stats
    const activeContacts = userRelationships.filter(r => {
      const daysSince = (Date.now() - r.stats.lastContact.getTime()) / (1000 * 60 * 60 * 24);
      return daysSince < 30;
    }).length;

    const atRiskContacts = userRelationships.filter(r =>
      r.healthMetrics.trend === 'declining'
    ).length;

    return {
      nodes,
      edges,
      clusters,
      stats: {
        totalContacts: nodes.length,
        activeContacts,
        atRiskContacts,
        averageStrength: nodes.reduce((s, n) => s + n.strength, 0) / nodes.length || 0,
      },
    };
  }

  /**
   * Get node color based on type and health
   */
  private getNodeColor(type: Relationship['type'], health: number): string {
    const baseColors: Record<string, string> = {
      colleague: '#4CAF50',
      client: '#2196F3',
      vendor: '#FF9800',
      friend: '#E91E63',
      family: '#9C27B0',
      acquaintance: '#607D8B',
      unknown: '#9E9E9E',
    };

    // Darken color if health is low
    if (health < 40) {
      return '#f44336'; // Red for at-risk
    }

    return baseColors[type] || '#9E9E9E';
  }

  /**
   * Get type display name
   */
  private getTypeName(type: Relationship['type']): string {
    const names: Record<string, string> = {
      colleague: '同事',
      client: '客户',
      vendor: '供应商',
      friend: '朋友',
      family: '家人',
      acquaintance: '熟人',
      unknown: '未分类',
    };
    return names[type] || type;
  }

  /**
   * Generate relationship insights
   */
  async generateInsights(userId: string): Promise<RelationshipInsight[]> {
    const userRelationships = Array.from(relationships.values())
      .filter(r => r.userId === userId);

    const newInsights: RelationshipInsight[] = [];

    for (const rel of userRelationships) {
      // Check for at-risk relationships
      if (rel.healthMetrics.trend === 'declining') {
        newInsights.push({
          type: 'warning',
          contactId: rel.contactId,
          contactName: rel.contact.name,
          title: '关系正在疏远',
          message: `你与 ${rel.contact.name} 的联系正在减少。${rel.healthMetrics.riskFactors.join('，')}`,
          suggestedAction: '发送一封问候邮件重新建立联系',
          priority: 'high',
          createdAt: new Date(),
        });
      }

      // Check for birthdays (if we had that data)
      // Check for opportunities
      if (rel.strength > 0.7 && rel.sentiment > 0.5) {
        newInsights.push({
          type: 'opportunity',
          contactId: rel.contactId,
          contactName: rel.contact.name,
          title: '强关系可以利用',
          message: `你与 ${rel.contact.name} 关系很好，可以考虑请求推荐或合作`,
          priority: 'low',
          createdAt: new Date(),
        });
      }
    }

    insights.push(...newInsights);
    return newInsights;
  }

  /**
   * Get introduction suggestions
   */
  async getIntroductionSuggestions(userId: string): Promise<IntroductionSuggestion[]> {
    const userRelationships = Array.from(relationships.values())
      .filter(r => r.userId === userId && r.strength > 0.5);

    const suggestions: IntroductionSuggestion[] = [];

    // Find potential introductions
    for (let i = 0; i < userRelationships.length; i++) {
      for (let j = i + 1; j < userRelationships.length; j++) {
        const rel1 = userRelationships[i];
        const rel2 = userRelationships[j];

        // Check if they're in related fields
        if (rel1.contact.company && rel2.contact.company) {
          // Could add more sophisticated matching
          const sameIndustry = false; // Would need industry data

          if (sameIndustry || Math.random() < 0.1) { // Random for demo
            suggestions.push({
              person1: rel1.contact,
              person2: rel2.contact,
              reason: '他们可能有共同的业务兴趣',
              mutualConnections: [],
              suggestedMessage: `Hi ${rel1.contact.name} and ${rel2.contact.name}, I thought you two should connect...`,
              probability: 0.6,
            });
          }
        }
      }
    }

    return suggestions.slice(0, 5);
  }

  /**
   * Add reminder for a relationship
   */
  addReminder(
    relationshipId: string,
    reminder: Omit<Relationship['reminders'][0], 'id'>
  ): Relationship | null {
    const relationship = relationships.get(relationshipId);
    if (!relationship) return null;

    relationship.reminders.push({
      ...reminder,
      id: `rem_${Date.now()}`,
    });

    return relationship;
  }

  /**
   * Get upcoming reminders
   */
  getUpcomingReminders(userId: string, daysAhead: number = 7): Array<{
    reminder: Relationship['reminders'][0];
    contact: Contact;
  }> {
    const userRelationships = Array.from(relationships.values())
      .filter(r => r.userId === userId);

    const upcoming: Array<{ reminder: Relationship['reminders'][0]; contact: Contact }> = [];
    const futureDate = new Date(Date.now() + daysAhead * 24 * 60 * 60 * 1000);

    for (const rel of userRelationships) {
      for (const reminder of rel.reminders) {
        if (reminder.date <= futureDate) {
          upcoming.push({
            reminder,
            contact: rel.contact,
          });
        }
      }
    }

    return upcoming.sort((a, b) => a.reminder.date.getTime() - b.reminder.date.getTime());
  }

  /**
   * Get relationship by contact email
   */
  getRelationship(userId: string, contactEmail: string): Relationship | null {
    return Array.from(relationships.values()).find(r =>
      r.userId === userId &&
      r.contact.email.toLowerCase() === contactEmail.toLowerCase()
    ) || null;
  }

  /**
   * Update relationship type
   */
  updateRelationType(relationshipId: string, type: Relationship['type']): Relationship | null {
    const relationship = relationships.get(relationshipId);
    if (!relationship) return null;

    relationship.type = type;
    return relationship;
  }
}

export const relationshipService = new RelationshipService();
