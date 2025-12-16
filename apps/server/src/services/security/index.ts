/**
 * Security Detection Service
 *
 * Detects phishing attempts, sensitive information,
 * and potential security risks in emails.
 */

import OpenAI from 'openai';
import { config } from '../../config/index.js';
import { logger } from '../../utils/logger.js';

interface SecurityScanResult {
  overallRisk: 'safe' | 'low' | 'medium' | 'high' | 'critical';
  phishing: PhishingAnalysis;
  sensitiveData: SensitiveDataResult;
  maliciousContent: MaliciousContentResult;
  recommendations: string[];
  score: number; // 0-100, 100 = safest
}

interface PhishingAnalysis {
  isPhishing: boolean;
  confidence: number;
  indicators: PhishingIndicator[];
  legitimacyScore: number;
}

interface PhishingIndicator {
  type: 'urgency' | 'impersonation' | 'suspicious_link' | 'request_credentials' | 'grammatical_errors' | 'mismatched_urls' | 'generic_greeting' | 'threat';
  description: string;
  severity: 'low' | 'medium' | 'high';
  location?: string;
}

interface SensitiveDataResult {
  found: boolean;
  items: SensitiveDataItem[];
  redactedContent?: string;
}

interface SensitiveDataItem {
  type: 'credit_card' | 'ssn' | 'password' | 'api_key' | 'phone' | 'email' | 'address' | 'bank_account' | 'passport' | 'medical';
  value: string;
  masked: string;
  location: { start: number; end: number };
  risk: 'low' | 'medium' | 'high';
}

interface MaliciousContentResult {
  hasMaliciousLinks: boolean;
  suspiciousLinks: SuspiciousLink[];
  hasAttachmentRisk: boolean;
  attachmentWarnings: string[];
}

interface SuspiciousLink {
  url: string;
  displayText?: string;
  risk: 'low' | 'medium' | 'high';
  reasons: string[];
}

export class SecurityService {
  private openai: OpenAI;

  // Regex patterns for sensitive data detection
  private patterns = {
    creditCard: /\b(?:\d{4}[-\s]?){3}\d{4}\b/g,
    ssn: /\b\d{3}[-\s]?\d{2}[-\s]?\d{4}\b/g,
    phone: /\b(?:\+?1[-.\s]?)?(?:\(?\d{3}\)?[-.\s]?)?\d{3}[-.\s]?\d{4}\b/g,
    email: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
    apiKey: /\b(?:sk[-_]|api[-_]?key|token)[-\w]{20,}\b/gi,
    password: /(?:password|pwd|passwd)[\s:=]+\S+/gi,
    bankAccount: /\b\d{8,17}\b/g,
    passport: /\b[A-Z]{1,2}\d{6,9}\b/g,
  };

  // Known phishing patterns
  private phishingPatterns = {
    urgencyPhrases: [
      'act now', 'urgent', 'immediate action', 'account suspended',
      'verify immediately', 'within 24 hours', 'limited time',
      'expires today', 'last chance', 'final warning',
    ],
    impersonationPhrases: [
      'official notice', 'security team', 'account verification',
      'confirm your identity', 'update your information',
    ],
    threatPhrases: [
      'will be terminated', 'legal action', 'report to authorities',
      'account will be closed', 'suspended permanently',
    ],
    credentialRequests: [
      'enter your password', 'confirm your password', 'login credentials',
      'social security', 'credit card number', 'bank details',
    ],
  };

  // Suspicious TLDs often used in phishing
  private suspiciousTLDs = [
    '.xyz', '.top', '.club', '.work', '.click', '.link',
    '.info', '.online', '.site', '.website', '.space',
  ];

  constructor() {
    this.openai = new OpenAI({ apiKey: config.openaiApiKey });
  }

  /**
   * Comprehensive security scan of email content
   */
  async scanEmail(params: {
    content: string;
    subject?: string;
    sender?: string;
    links?: string[];
    attachments?: string[];
  }): Promise<SecurityScanResult> {
    const { content, subject, sender, links, attachments } = params;
    const fullContent = `${subject || ''}\n${content}`;

    // Run all checks in parallel
    const [phishing, sensitiveData, maliciousContent] = await Promise.all([
      this.detectPhishing(fullContent, sender, links),
      this.detectSensitiveData(content),
      this.checkMaliciousContent(links || [], attachments || []),
    ]);

    // Calculate overall risk
    const { overallRisk, score } = this.calculateOverallRisk(phishing, sensitiveData, maliciousContent);

    // Generate recommendations
    const recommendations = this.generateRecommendations(phishing, sensitiveData, maliciousContent);

    const result: SecurityScanResult = {
      overallRisk,
      score,
      phishing,
      sensitiveData,
      maliciousContent,
      recommendations,
    };

    logger.info({ msg: 'Security scan completed', risk: overallRisk, score });
    return result;
  }

  /**
   * Detect phishing attempts
   */
  private async detectPhishing(
    content: string,
    sender?: string,
    links?: string[]
  ): Promise<PhishingAnalysis> {
    const indicators: PhishingIndicator[] = [];
    const contentLower = content.toLowerCase();

    // Check urgency phrases
    for (const phrase of this.phishingPatterns.urgencyPhrases) {
      if (contentLower.includes(phrase.toLowerCase())) {
        indicators.push({
          type: 'urgency',
          description: `Urgency language detected: "${phrase}"`,
          severity: 'medium',
        });
      }
    }

    // Check threat phrases
    for (const phrase of this.phishingPatterns.threatPhrases) {
      if (contentLower.includes(phrase.toLowerCase())) {
        indicators.push({
          type: 'threat',
          description: `Threatening language detected: "${phrase}"`,
          severity: 'high',
        });
      }
    }

    // Check credential requests
    for (const phrase of this.phishingPatterns.credentialRequests) {
      if (contentLower.includes(phrase.toLowerCase())) {
        indicators.push({
          type: 'request_credentials',
          description: `Credential request detected: "${phrase}"`,
          severity: 'high',
        });
      }
    }

    // Check for generic greetings
    if (/^(dear\s+(customer|user|member|valued|sir|madam))/i.test(content.trim())) {
      indicators.push({
        type: 'generic_greeting',
        description: 'Generic greeting suggests mass-sent email',
        severity: 'low',
      });
    }

    // Check sender domain
    if (sender) {
      const senderDomain = sender.split('@')[1]?.toLowerCase();
      if (senderDomain) {
        // Check for lookalike domains
        const commonDomains = ['google.com', 'microsoft.com', 'apple.com', 'amazon.com', 'paypal.com', 'netflix.com'];
        for (const domain of commonDomains) {
          if (senderDomain !== domain && this.isSimilarDomain(senderDomain, domain)) {
            indicators.push({
              type: 'impersonation',
              description: `Sender domain "${senderDomain}" looks similar to "${domain}"`,
              severity: 'high',
            });
          }
        }
      }
    }

    // Check links for mismatches
    if (links) {
      for (const link of links) {
        try {
          const url = new URL(link);
          // Check for suspicious TLDs
          if (this.suspiciousTLDs.some(tld => url.hostname.endsWith(tld))) {
            indicators.push({
              type: 'suspicious_link',
              description: `Suspicious TLD in link: ${url.hostname}`,
              severity: 'medium',
              location: link,
            });
          }
          // Check for IP-based URLs
          if (/^\d+\.\d+\.\d+\.\d+/.test(url.hostname)) {
            indicators.push({
              type: 'suspicious_link',
              description: 'Link uses IP address instead of domain',
              severity: 'high',
              location: link,
            });
          }
        } catch {
          // Invalid URL
        }
      }
    }

    // Use AI for deeper analysis
    const aiAnalysis = await this.aiPhishingAnalysis(content);

    // Combine indicators
    indicators.push(...aiAnalysis.additionalIndicators);

    // Calculate legitimacy score
    const highSeverity = indicators.filter(i => i.severity === 'high').length;
    const mediumSeverity = indicators.filter(i => i.severity === 'medium').length;
    const lowSeverity = indicators.filter(i => i.severity === 'low').length;

    const deduction = highSeverity * 25 + mediumSeverity * 10 + lowSeverity * 5;
    const legitimacyScore = Math.max(0, 100 - deduction);

    return {
      isPhishing: legitimacyScore < 50,
      confidence: aiAnalysis.confidence,
      indicators,
      legitimacyScore,
    };
  }

  /**
   * AI-powered phishing analysis
   */
  private async aiPhishingAnalysis(content: string): Promise<{
    confidence: number;
    additionalIndicators: PhishingIndicator[];
  }> {
    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: `Analyze this email for phishing indicators. Return JSON:
{
  "isPhishing": boolean,
  "confidence": number (0-1),
  "indicators": [{ "type": string, "description": string, "severity": "low"|"medium"|"high" }]
}`,
          },
          { role: 'user', content },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.1,
      });

      const result = JSON.parse(response.choices[0]?.message?.content || '{}');
      return {
        confidence: result.confidence || 0.5,
        additionalIndicators: result.indicators || [],
      };
    } catch (error) {
      logger.error({ msg: 'AI phishing analysis failed', error });
      return { confidence: 0.5, additionalIndicators: [] };
    }
  }

  /**
   * Check if two domains are visually similar (typosquatting)
   */
  private isSimilarDomain(domain1: string, domain2: string): boolean {
    const d1 = domain1.replace(/\.(com|org|net|io)$/, '');
    const d2 = domain2.replace(/\.(com|org|net|io)$/, '');

    // Check Levenshtein distance
    const distance = this.levenshteinDistance(d1, d2);
    return distance > 0 && distance <= 2;
  }

  /**
   * Calculate Levenshtein distance between strings
   */
  private levenshteinDistance(s1: string, s2: string): number {
    const m = s1.length, n = s2.length;
    const dp: number[][] = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));

    for (let i = 0; i <= m; i++) dp[i][0] = i;
    for (let j = 0; j <= n; j++) dp[0][j] = j;

    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        if (s1[i-1] === s2[j-1]) {
          dp[i][j] = dp[i-1][j-1];
        } else {
          dp[i][j] = 1 + Math.min(dp[i-1][j], dp[i][j-1], dp[i-1][j-1]);
        }
      }
    }
    return dp[m][n];
  }

  /**
   * Detect sensitive data in content
   */
  private async detectSensitiveData(content: string): Promise<SensitiveDataResult> {
    const items: SensitiveDataItem[] = [];

    // Credit card detection
    const ccMatches = content.matchAll(this.patterns.creditCard);
    for (const match of ccMatches) {
      if (this.isValidCreditCard(match[0])) {
        items.push({
          type: 'credit_card',
          value: match[0],
          masked: this.maskCreditCard(match[0]),
          location: { start: match.index!, end: match.index! + match[0].length },
          risk: 'high',
        });
      }
    }

    // SSN detection
    const ssnMatches = content.matchAll(this.patterns.ssn);
    for (const match of ssnMatches) {
      items.push({
        type: 'ssn',
        value: match[0],
        masked: 'XXX-XX-' + match[0].slice(-4),
        location: { start: match.index!, end: match.index! + match[0].length },
        risk: 'high',
      });
    }

    // API key detection
    const apiKeyMatches = content.matchAll(this.patterns.apiKey);
    for (const match of apiKeyMatches) {
      items.push({
        type: 'api_key',
        value: match[0],
        masked: match[0].slice(0, 8) + '...' + match[0].slice(-4),
        location: { start: match.index!, end: match.index! + match[0].length },
        risk: 'high',
      });
    }

    // Password detection
    const pwdMatches = content.matchAll(this.patterns.password);
    for (const match of pwdMatches) {
      items.push({
        type: 'password',
        value: match[0],
        masked: match[0].split(/[:=]/)[0] + ': ********',
        location: { start: match.index!, end: match.index! + match[0].length },
        risk: 'high',
      });
    }

    // Generate redacted content if sensitive data found
    let redactedContent: string | undefined;
    if (items.length > 0) {
      redactedContent = content;
      // Sort by location descending to replace from end
      items.sort((a, b) => b.location.start - a.location.start);
      for (const item of items) {
        redactedContent =
          redactedContent.slice(0, item.location.start) +
          item.masked +
          redactedContent.slice(item.location.end);
      }
    }

    return {
      found: items.length > 0,
      items,
      redactedContent,
    };
  }

  /**
   * Validate credit card using Luhn algorithm
   */
  private isValidCreditCard(number: string): boolean {
    const digits = number.replace(/\D/g, '');
    if (digits.length < 13 || digits.length > 19) return false;

    let sum = 0;
    let isEven = false;

    for (let i = digits.length - 1; i >= 0; i--) {
      let digit = parseInt(digits[i], 10);
      if (isEven) {
        digit *= 2;
        if (digit > 9) digit -= 9;
      }
      sum += digit;
      isEven = !isEven;
    }

    return sum % 10 === 0;
  }

  /**
   * Mask credit card number
   */
  private maskCreditCard(number: string): string {
    const digits = number.replace(/\D/g, '');
    return '**** **** **** ' + digits.slice(-4);
  }

  /**
   * Check for malicious content in links and attachments
   */
  private async checkMaliciousContent(
    links: string[],
    attachments: string[]
  ): Promise<MaliciousContentResult> {
    const suspiciousLinks: SuspiciousLink[] = [];
    const attachmentWarnings: string[] = [];

    // Analyze links
    for (const link of links) {
      const reasons: string[] = [];

      try {
        const url = new URL(link);

        // Check for suspicious patterns
        if (url.hostname.includes('-') && url.hostname.split('-').length > 3) {
          reasons.push('Domain contains many hyphens (common in phishing)');
        }

        if (url.pathname.includes('@')) {
          reasons.push('URL contains @ symbol (potential URL spoofing)');
        }

        if (/login|signin|account|verify|secure|update/i.test(url.href)) {
          reasons.push('URL contains sensitive keywords');
        }

        if (url.protocol === 'http:') {
          reasons.push('Uses insecure HTTP instead of HTTPS');
        }

        if (reasons.length > 0) {
          suspiciousLinks.push({
            url: link,
            risk: reasons.length >= 2 ? 'high' : 'medium',
            reasons,
          });
        }
      } catch {
        suspiciousLinks.push({
          url: link,
          risk: 'high',
          reasons: ['Invalid or malformed URL'],
        });
      }
    }

    // Check attachments
    const dangerousExtensions = [
      '.exe', '.bat', '.cmd', '.scr', '.pif', '.js', '.vbs',
      '.wsf', '.msi', '.jar', '.ps1', '.hta', '.dll',
    ];

    for (const attachment of attachments) {
      const ext = attachment.toLowerCase().slice(attachment.lastIndexOf('.'));
      if (dangerousExtensions.includes(ext)) {
        attachmentWarnings.push(`Potentially dangerous file type: ${attachment}`);
      }
      if (attachment.includes('.') && attachment.lastIndexOf('.') !== attachment.indexOf('.')) {
        attachmentWarnings.push(`Double extension detected (possible masking): ${attachment}`);
      }
    }

    return {
      hasMaliciousLinks: suspiciousLinks.some(l => l.risk === 'high'),
      suspiciousLinks,
      hasAttachmentRisk: attachmentWarnings.length > 0,
      attachmentWarnings,
    };
  }

  /**
   * Calculate overall risk score
   */
  private calculateOverallRisk(
    phishing: PhishingAnalysis,
    sensitiveData: SensitiveDataResult,
    malicious: MaliciousContentResult
  ): { overallRisk: SecurityScanResult['overallRisk']; score: number } {
    let score = 100;

    // Deduct for phishing
    score -= (100 - phishing.legitimacyScore) * 0.5;

    // Deduct for sensitive data
    const highRiskData = sensitiveData.items.filter(i => i.risk === 'high').length;
    score -= highRiskData * 15;

    // Deduct for malicious content
    if (malicious.hasMaliciousLinks) score -= 30;
    score -= malicious.suspiciousLinks.filter(l => l.risk === 'high').length * 10;
    if (malicious.hasAttachmentRisk) score -= 20;

    score = Math.max(0, Math.min(100, score));

    let overallRisk: SecurityScanResult['overallRisk'];
    if (score >= 80) overallRisk = 'safe';
    else if (score >= 60) overallRisk = 'low';
    else if (score >= 40) overallRisk = 'medium';
    else if (score >= 20) overallRisk = 'high';
    else overallRisk = 'critical';

    return { overallRisk, score };
  }

  /**
   * Generate security recommendations
   */
  private generateRecommendations(
    phishing: PhishingAnalysis,
    sensitiveData: SensitiveDataResult,
    malicious: MaliciousContentResult
  ): string[] {
    const recommendations: string[] = [];

    if (phishing.isPhishing) {
      recommendations.push('⚠️ This email shows signs of phishing. Do not click any links or provide personal information.');
      recommendations.push('Verify the sender through official channels before responding.');
    }

    if (phishing.indicators.some(i => i.type === 'suspicious_link')) {
      recommendations.push('Hover over links to verify URLs before clicking.');
    }

    if (sensitiveData.found) {
      recommendations.push('🔒 This email contains sensitive information. Consider if it needs to be shared.');
      if (sensitiveData.items.some(i => i.type === 'password')) {
        recommendations.push('Never share passwords via email. Use a secure password manager.');
      }
      if (sensitiveData.items.some(i => i.type === 'credit_card')) {
        recommendations.push('Avoid sending credit card information via email. Use secure payment methods.');
      }
    }

    if (malicious.hasAttachmentRisk) {
      recommendations.push('⚠️ Attachments may be dangerous. Only open if you trust the sender.');
    }

    if (malicious.suspiciousLinks.length > 0) {
      recommendations.push('Some links in this email appear suspicious. Exercise caution.');
    }

    if (recommendations.length === 0) {
      recommendations.push('✅ No security issues detected.');
    }

    return recommendations;
  }

  /**
   * Quick scan for sensitive data only (for before sending)
   */
  async scanBeforeSend(content: string): Promise<{
    safe: boolean;
    warnings: string[];
    sensitiveData: SensitiveDataItem[];
  }> {
    const result = await this.detectSensitiveData(content);
    const warnings: string[] = [];

    if (result.items.some(i => i.type === 'credit_card')) {
      warnings.push('Your email contains credit card information');
    }
    if (result.items.some(i => i.type === 'ssn')) {
      warnings.push('Your email contains a Social Security Number');
    }
    if (result.items.some(i => i.type === 'password')) {
      warnings.push('Your email contains password information');
    }
    if (result.items.some(i => i.type === 'api_key')) {
      warnings.push('Your email contains an API key or token');
    }

    return {
      safe: warnings.length === 0,
      warnings,
      sensitiveData: result.items,
    };
  }
}

export const securityService = new SecurityService();
