/**
 * Personalized Learning Engine
 *
 * Learns user's writing style, preferences, and patterns
 * to generate more personalized email responses.
 */

import OpenAI from 'openai';
import { config } from '../../config/index.js';
import { logger } from '../../utils/logger.js';

interface WritingStyle {
  // Tone patterns
  formalityLevel: number; // 0-1, 0=casual, 1=formal
  friendlinessLevel: number; // 0-1
  verbosityLevel: number; // 0-1, 0=concise, 1=verbose

  // Common patterns
  greetings: string[];
  signOffs: string[];
  commonPhrases: string[];

  // Vocabulary
  preferredWords: Map<string, string>; // e.g., "utilize" -> "use"
  avoidedWords: string[];

  // Structure
  averageSentenceLength: number;
  paragraphStyle: 'short' | 'medium' | 'long';
  usesLists: boolean;
  usesEmojis: boolean;
}

interface UserProfile {
  userId: string;
  writingStyle: WritingStyle;
  emailHistory: EmailSample[];
  recipientPreferences: Map<string, RecipientPreference>;
  lastUpdated: Date;
  trainingCount: number;
}

interface EmailSample {
  id: string;
  content: string;
  recipient?: string;
  subject?: string;
  timestamp: Date;
  tone?: string;
}

interface RecipientPreference {
  email: string;
  name?: string;
  relationship: 'formal' | 'professional' | 'friendly' | 'casual';
  preferredTone: string;
  lastContact: Date;
  interactionCount: number;
}

interface StyleAnalysis {
  formalityScore: number;
  friendlinessScore: number;
  verbosityScore: number;
  commonPatterns: string[];
  suggestions: string[];
}

export class LearningService {
  private openai: OpenAI;
  private userProfiles: Map<string, UserProfile> = new Map();

  constructor() {
    this.openai = new OpenAI({ apiKey: config.openaiApiKey });
  }

  /**
   * Initialize or get user profile
   */
  getOrCreateProfile(userId: string): UserProfile {
    if (!this.userProfiles.has(userId)) {
      const profile: UserProfile = {
        userId,
        writingStyle: this.getDefaultStyle(),
        emailHistory: [],
        recipientPreferences: new Map(),
        lastUpdated: new Date(),
        trainingCount: 0,
      };
      this.userProfiles.set(userId, profile);
    }
    return this.userProfiles.get(userId)!;
  }

  /**
   * Default writing style
   */
  private getDefaultStyle(): WritingStyle {
    return {
      formalityLevel: 0.6,
      friendlinessLevel: 0.5,
      verbosityLevel: 0.5,
      greetings: ['Hi', 'Hello', 'Dear'],
      signOffs: ['Best regards', 'Thanks', 'Best'],
      commonPhrases: [],
      preferredWords: new Map(),
      avoidedWords: [],
      averageSentenceLength: 15,
      paragraphStyle: 'medium',
      usesLists: false,
      usesEmojis: false,
    };
  }

  /**
   * Learn from a user's email
   */
  async learnFromEmail(userId: string, email: EmailSample): Promise<StyleAnalysis> {
    const profile = this.getOrCreateProfile(userId);

    // Add to history (keep last 100)
    profile.emailHistory.unshift(email);
    if (profile.emailHistory.length > 100) {
      profile.emailHistory.pop();
    }

    // Analyze the email
    const analysis = await this.analyzeEmail(email.content);

    // Update writing style with weighted average
    const weight = Math.min(0.1, 1 / (profile.trainingCount + 1));
    profile.writingStyle.formalityLevel =
      profile.writingStyle.formalityLevel * (1 - weight) + analysis.formalityScore * weight;
    profile.writingStyle.friendlinessLevel =
      profile.writingStyle.friendlinessLevel * (1 - weight) + analysis.friendlinessScore * weight;
    profile.writingStyle.verbosityLevel =
      profile.writingStyle.verbosityLevel * (1 - weight) + analysis.verbosityScore * weight;

    // Extract patterns
    this.extractPatterns(profile, email.content);

    // Update recipient preference if available
    if (email.recipient) {
      this.updateRecipientPreference(profile, email.recipient, analysis);
    }

    profile.trainingCount++;
    profile.lastUpdated = new Date();

    logger.info({ msg: 'Learned from email', userId, trainingCount: profile.trainingCount });
    return analysis;
  }

  /**
   * Analyze email content using AI
   */
  private async analyzeEmail(content: string): Promise<StyleAnalysis> {
    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: `Analyze the writing style of this email. Return JSON with:
- formalityScore (0-1): How formal is the writing
- friendlinessScore (0-1): How friendly/warm is the tone
- verbosityScore (0-1): How verbose vs concise
- commonPatterns: Array of notable phrases or patterns
- suggestions: Array of style observations`,
          },
          { role: 'user', content },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.3,
      });

      return JSON.parse(response.choices[0]?.message?.content || '{}');
    } catch (error) {
      logger.error({ msg: 'Failed to analyze email', error });
      return {
        formalityScore: 0.5,
        friendlinessScore: 0.5,
        verbosityScore: 0.5,
        commonPatterns: [],
        suggestions: [],
      };
    }
  }

  /**
   * Extract greeting, sign-off, and common phrases
   */
  private extractPatterns(profile: UserProfile, content: string): void {
    const lines = content.split('\n').filter(l => l.trim());

    // Extract greeting (first non-empty line)
    if (lines.length > 0) {
      const firstLine = lines[0].trim();
      const greetingMatch = firstLine.match(/^(Hi|Hello|Dear|Hey|Good\s+\w+)[,\s]*/i);
      if (greetingMatch && !profile.writingStyle.greetings.includes(greetingMatch[1])) {
        profile.writingStyle.greetings.push(greetingMatch[1]);
        // Keep only top 5 most recent
        if (profile.writingStyle.greetings.length > 5) {
          profile.writingStyle.greetings.shift();
        }
      }
    }

    // Extract sign-off (last few lines)
    const lastLines = lines.slice(-3).join(' ');
    const signOffPatterns = [
      /Best\s+regards?/i, /Thanks/i, /Thank\s+you/i, /Sincerely/i,
      /Cheers/i, /Best/i, /Regards/i, /Kind\s+regards/i,
    ];
    for (const pattern of signOffPatterns) {
      const match = lastLines.match(pattern);
      if (match && !profile.writingStyle.signOffs.includes(match[0])) {
        profile.writingStyle.signOffs.push(match[0]);
        if (profile.writingStyle.signOffs.length > 5) {
          profile.writingStyle.signOffs.shift();
        }
        break;
      }
    }

    // Detect emoji usage
    if (/[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]/u.test(content)) {
      profile.writingStyle.usesEmojis = true;
    }

    // Detect list usage
    if (/^[\s]*[-*•]\s/m.test(content) || /^\s*\d+\.\s/m.test(content)) {
      profile.writingStyle.usesLists = true;
    }

    // Calculate average sentence length
    const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 0);
    if (sentences.length > 0) {
      const avgWords = sentences.reduce((sum, s) => sum + s.trim().split(/\s+/).length, 0) / sentences.length;
      profile.writingStyle.averageSentenceLength =
        profile.writingStyle.averageSentenceLength * 0.9 + avgWords * 0.1;
    }
  }

  /**
   * Update recipient-specific preferences
   */
  private updateRecipientPreference(
    profile: UserProfile,
    recipientEmail: string,
    analysis: StyleAnalysis
  ): void {
    const existing = profile.recipientPreferences.get(recipientEmail);

    // Determine relationship based on formality
    let relationship: RecipientPreference['relationship'] = 'professional';
    if (analysis.formalityScore > 0.8) relationship = 'formal';
    else if (analysis.formalityScore < 0.3 && analysis.friendlinessScore > 0.7) relationship = 'casual';
    else if (analysis.friendlinessScore > 0.6) relationship = 'friendly';

    const pref: RecipientPreference = {
      email: recipientEmail,
      relationship,
      preferredTone: relationship,
      lastContact: new Date(),
      interactionCount: (existing?.interactionCount || 0) + 1,
    };

    profile.recipientPreferences.set(recipientEmail, pref);
  }

  /**
   * Generate personalized reply using learned style
   */
  async generatePersonalizedReply(params: {
    userId: string;
    emailContent: string;
    recipientEmail?: string;
    baseTone: string;
  }): Promise<string> {
    const profile = this.getOrCreateProfile(params.userId);
    const style = profile.writingStyle;

    // Get recipient-specific preferences
    const recipientPref = params.recipientEmail
      ? profile.recipientPreferences.get(params.recipientEmail)
      : undefined;

    // Build style instructions
    const styleInstructions = this.buildStyleInstructions(style, recipientPref);

    const response = await this.openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: `You are writing an email reply in the user's personal style.

${styleInstructions}

Base tone requested: ${params.baseTone}
${recipientPref ? `Relationship with recipient: ${recipientPref.relationship}` : ''}

Write naturally, matching the user's typical patterns and vocabulary.`,
        },
        {
          role: 'user',
          content: `Original email:\n${params.emailContent}\n\nWrite a reply in my style.`,
        },
      ],
      temperature: 0.8,
      max_tokens: 1000,
    });

    return response.choices[0]?.message?.content || '';
  }

  /**
   * Build style instructions from profile
   */
  private buildStyleInstructions(style: WritingStyle, recipientPref?: RecipientPreference): string {
    const instructions: string[] = [];

    // Formality
    if (style.formalityLevel > 0.7) {
      instructions.push('- Use formal, professional language');
    } else if (style.formalityLevel < 0.3) {
      instructions.push('- Use casual, relaxed language');
    }

    // Verbosity
    if (style.verbosityLevel > 0.7) {
      instructions.push('- Be detailed and thorough');
    } else if (style.verbosityLevel < 0.3) {
      instructions.push('- Be concise and to the point');
    }

    // Greetings and sign-offs
    if (style.greetings.length > 0) {
      instructions.push(`- Preferred greetings: ${style.greetings.slice(-3).join(', ')}`);
    }
    if (style.signOffs.length > 0) {
      instructions.push(`- Preferred sign-offs: ${style.signOffs.slice(-3).join(', ')}`);
    }

    // Other patterns
    if (style.usesEmojis) {
      instructions.push('- Can include occasional emojis if appropriate');
    } else {
      instructions.push('- Avoid emojis');
    }

    if (style.usesLists) {
      instructions.push('- Use bullet points for clarity when listing items');
    }

    instructions.push(`- Average sentence length: ~${Math.round(style.averageSentenceLength)} words`);

    return `## Writing Style:\n${instructions.join('\n')}`;
  }

  /**
   * Get user's style summary
   */
  getStyleSummary(userId: string): {
    style: WritingStyle;
    trainingCount: number;
    topRecipients: RecipientPreference[];
  } {
    const profile = this.getOrCreateProfile(userId);

    const topRecipients = Array.from(profile.recipientPreferences.values())
      .sort((a, b) => b.interactionCount - a.interactionCount)
      .slice(0, 10);

    return {
      style: profile.writingStyle,
      trainingCount: profile.trainingCount,
      topRecipients,
    };
  }

  /**
   * Predict next sentence/phrase
   */
  async predictNextPhrase(userId: string, currentText: string): Promise<string[]> {
    const profile = this.getOrCreateProfile(userId);

    // Use common phrases from history
    const predictions: string[] = [];

    // Check if any common phrases match the current context
    for (const phrase of profile.writingStyle.commonPhrases) {
      if (currentText.toLowerCase().includes(phrase.split(' ')[0].toLowerCase())) {
        predictions.push(phrase);
      }
    }

    // AI-powered prediction
    if (predictions.length < 3) {
      try {
        const response = await this.openai.chat.completions.create({
          model: 'gpt-3.5-turbo',
          messages: [
            {
              role: 'system',
              content: 'Suggest 3 natural completions for this email text. Return JSON: { "suggestions": ["...", "...", "..."] }',
            },
            { role: 'user', content: currentText },
          ],
          response_format: { type: 'json_object' },
          temperature: 0.7,
          max_tokens: 200,
        });

        const result = JSON.parse(response.choices[0]?.message?.content || '{}');
        predictions.push(...(result.suggestions || []));
      } catch (error) {
        logger.error({ msg: 'Failed to predict phrase', error });
      }
    }

    return predictions.slice(0, 5);
  }
}

export const learningService = new LearningService();
