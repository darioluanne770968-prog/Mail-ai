/**
 * Compliance Checker Service
 * Ensure emails meet regulatory and company policy requirements
 */

import { AIService } from '../ai/index.js';

export type ComplianceStandard =
  | 'gdpr'           // EU General Data Protection Regulation
  | 'ccpa'           // California Consumer Privacy Act
  | 'hipaa'          // Health Insurance Portability and Accountability Act
  | 'pci_dss'        // Payment Card Industry Data Security Standard
  | 'sox'            // Sarbanes-Oxley Act
  | 'sec'            // Securities and Exchange Commission
  | 'finra'          // Financial Industry Regulatory Authority
  | 'company_policy' // Internal company policies
  | 'legal'          // General legal requirements
  | 'confidential';  // Confidentiality requirements

export type ViolationSeverity = 'info' | 'warning' | 'violation' | 'critical';

export interface ComplianceViolation {
  id: string;
  standard: ComplianceStandard;
  severity: ViolationSeverity;
  title: string;
  description: string;
  location: {
    type: 'subject' | 'body' | 'attachment' | 'recipient';
    start?: number;
    end?: number;
    text?: string;
  };
  suggestedFix?: string;
  autoFixAvailable: boolean;
}

export interface ComplianceCheckResult {
  emailId: string;
  timestamp: Date;
  overallStatus: 'pass' | 'warning' | 'fail';
  score: number; // 0-100
  violations: ComplianceViolation[];
  checkedStandards: ComplianceStandard[];
  recommendations: string[];
  sensitiveDataFound: Array<{
    type: string;
    count: number;
    redacted: boolean;
  }>;
}

export interface ComplianceRule {
  id: string;
  name: string;
  standard: ComplianceStandard;
  description: string;
  pattern?: RegExp;
  keywords?: string[];
  severity: ViolationSeverity;
  enabled: boolean;
  autoFix?: {
    type: 'redact' | 'remove' | 'replace';
    replacement?: string;
  };
}

export interface CompliancePolicy {
  id: string;
  name: string;
  description: string;
  standards: ComplianceStandard[];
  rules: ComplianceRule[];
  createdAt: Date;
  updatedAt: Date;
  isActive: boolean;
}

export interface ComplianceReport {
  periodStart: Date;
  periodEnd: Date;
  totalChecked: number;
  passRate: number;
  violationsByStandard: Record<ComplianceStandard, number>;
  violationsBySeverity: Record<ViolationSeverity, number>;
  topViolations: Array<{
    ruleId: string;
    ruleName: string;
    count: number;
  }>;
  trends: {
    previousPeriod: number;
    currentPeriod: number;
    change: number;
  };
  recommendations: string[];
}

export interface SensitiveDataPattern {
  name: string;
  type: 'pii' | 'phi' | 'financial' | 'confidential' | 'credential';
  pattern: RegExp;
  description: string;
  redactionPattern: string;
}

// In-memory storage
const policies = new Map<string, CompliancePolicy>();
const checkHistory = new Map<string, ComplianceCheckResult[]>();

// Sensitive data patterns
const sensitivePatterns: SensitiveDataPattern[] = [
  {
    name: '信用卡号',
    type: 'financial',
    pattern: /\b(?:4[0-9]{12}(?:[0-9]{3})?|5[1-5][0-9]{14}|3[47][0-9]{13}|6(?:011|5[0-9]{2})[0-9]{12})\b/g,
    description: '检测信用卡号（Visa, MasterCard, Amex, Discover）',
    redactionPattern: '****-****-****-$1',
  },
  {
    name: '身份证号',
    type: 'pii',
    pattern: /\b[1-9]\d{5}(?:19|20)\d{2}(?:0[1-9]|1[0-2])(?:0[1-9]|[12]\d|3[01])\d{3}[\dXx]\b/g,
    description: '检测中国大陆身份证号',
    redactionPattern: '***************$1',
  },
  {
    name: 'SSN',
    type: 'pii',
    pattern: /\b\d{3}-\d{2}-\d{4}\b/g,
    description: '检测美国社会安全号',
    redactionPattern: '***-**-$1',
  },
  {
    name: '手机号码',
    type: 'pii',
    pattern: /\b1[3-9]\d{9}\b/g,
    description: '检测中国手机号码',
    redactionPattern: '****$1',
  },
  {
    name: '银行账号',
    type: 'financial',
    pattern: /\b\d{16,19}\b/g,
    description: '检测银行账号',
    redactionPattern: '************$1',
  },
  {
    name: '密码',
    type: 'credential',
    pattern: /(?:password|密码|pwd|pass)\s*[:=]\s*['"]?([^\s'"]+)/gi,
    description: '检测明文密码',
    redactionPattern: '[REDACTED]',
  },
  {
    name: 'API密钥',
    type: 'credential',
    pattern: /(?:api[_-]?key|apikey|secret[_-]?key)\s*[:=]\s*['"]?([a-zA-Z0-9_-]{20,})/gi,
    description: '检测API密钥',
    redactionPattern: '[REDACTED]',
  },
  {
    name: '电子邮箱',
    type: 'pii',
    pattern: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
    description: '检测电子邮箱地址',
    redactionPattern: '****@****.com',
  },
  {
    name: '医疗信息',
    type: 'phi',
    pattern: /(?:诊断|病历|处方|药物|治疗|手术|病情|医保号|患者)\s*[:：]\s*[^\n]+/gi,
    description: '检测医疗健康信息',
    redactionPattern: '[PHI REDACTED]',
  },
  {
    name: '薪资信息',
    type: 'confidential',
    pattern: /(?:salary|薪资|工资|年薪|月薪|奖金|收入)\s*[:：]?\s*(?:¥|\$|RMB|CNY)?\s*[\d,]+/gi,
    description: '检测薪资信息',
    redactionPattern: '[CONFIDENTIAL]',
  },
];

// Default compliance rules
const defaultRules: ComplianceRule[] = [
  {
    id: 'rule_gdpr_personal_data',
    name: 'GDPR 个人数据保护',
    standard: 'gdpr',
    description: '检测未经保护的个人数据',
    severity: 'violation',
    enabled: true,
    keywords: ['personal data', 'individual data', '个人数据', '个人信息'],
  },
  {
    id: 'rule_hipaa_phi',
    name: 'HIPAA 健康信息保护',
    standard: 'hipaa',
    description: '检测受保护的健康信息',
    severity: 'critical',
    enabled: true,
    keywords: ['patient', 'diagnosis', 'prescription', '患者', '诊断', '处方', '病历'],
  },
  {
    id: 'rule_pci_card',
    name: 'PCI-DSS 信用卡信息',
    standard: 'pci_dss',
    description: '检测信用卡号等支付信息',
    severity: 'critical',
    enabled: true,
  },
  {
    id: 'rule_confidential',
    name: '机密信息标记',
    standard: 'confidential',
    description: '检测机密或保密标记的内容',
    severity: 'warning',
    enabled: true,
    keywords: ['confidential', 'secret', 'internal only', '机密', '保密', '内部', '仅供内部'],
  },
  {
    id: 'rule_legal_disclaimer',
    name: '法律免责声明',
    standard: 'legal',
    description: '检查是否包含必要的法律免责声明',
    severity: 'info',
    enabled: true,
    keywords: ['disclaimer', 'legal notice', '免责声明', '法律声明'],
  },
  {
    id: 'rule_external_recipient',
    name: '外部收件人警告',
    standard: 'company_policy',
    description: '向外部收件人发送时警告',
    severity: 'warning',
    enabled: true,
  },
  {
    id: 'rule_attachment_size',
    name: '附件大小限制',
    standard: 'company_policy',
    description: '检查附件大小是否超过限制',
    severity: 'info',
    enabled: true,
  },
  {
    id: 'rule_financial_data',
    name: '财务数据保护',
    standard: 'sox',
    description: '检测未加密的财务数据',
    severity: 'violation',
    enabled: true,
    keywords: ['financial report', 'earnings', 'revenue', '财务报告', '营收', '利润'],
  },
];

export class ComplianceCheckerService {
  private aiService: AIService;

  constructor() {
    this.aiService = new AIService();
    this.initializeDefaultPolicy();
  }

  /**
   * Initialize default compliance policy
   */
  private initializeDefaultPolicy(): void {
    const defaultPolicy: CompliancePolicy = {
      id: 'policy_default',
      name: '默认合规政策',
      description: '包含常见合规要求的默认政策',
      standards: ['gdpr', 'company_policy', 'confidential', 'legal'],
      rules: defaultRules,
      createdAt: new Date(),
      updatedAt: new Date(),
      isActive: true,
    };

    policies.set(defaultPolicy.id, defaultPolicy);
  }

  /**
   * Check email for compliance issues
   */
  async checkCompliance(
    email: {
      id: string;
      subject: string;
      body: string;
      to: string[];
      cc?: string[];
      attachments?: Array<{ name: string; size: number }>;
    },
    policyId?: string
  ): Promise<ComplianceCheckResult> {
    const policy = policies.get(policyId || 'policy_default');
    if (!policy) {
      throw new Error('Policy not found');
    }

    const violations: ComplianceViolation[] = [];
    const sensitiveDataFound: ComplianceCheckResult['sensitiveDataFound'] = [];
    const content = `${email.subject}\n${email.body}`;

    // Check for sensitive data patterns
    for (const pattern of sensitivePatterns) {
      const matches = content.match(pattern.pattern);
      if (matches && matches.length > 0) {
        sensitiveDataFound.push({
          type: pattern.name,
          count: matches.length,
          redacted: false,
        });

        // Create violation based on data type
        const severity = this.getSeverityForDataType(pattern.type);
        violations.push({
          id: `v_${Date.now()}_${pattern.name}`,
          standard: this.getStandardForDataType(pattern.type),
          severity,
          title: `检测到${pattern.name}`,
          description: `邮件中包含 ${matches.length} 处${pattern.name}`,
          location: { type: 'body', text: matches[0] },
          suggestedFix: `建议使用 ${pattern.redactionPattern} 格式脱敏`,
          autoFixAvailable: true,
        });
      }
    }

    // Check against policy rules
    for (const rule of policy.rules.filter(r => r.enabled)) {
      const ruleViolations = await this.checkRule(rule, email, content);
      violations.push(...ruleViolations);
    }

    // Check external recipients
    const externalViolations = this.checkExternalRecipients(email.to, email.cc);
    violations.push(...externalViolations);

    // AI-powered deep analysis for complex compliance
    if (violations.length > 0 || this.needsDeepAnalysis(content)) {
      const aiViolations = await this.deepComplianceAnalysis(email, policy.standards);
      violations.push(...aiViolations);
    }

    // Calculate score
    const score = this.calculateComplianceScore(violations);
    const overallStatus = this.determineOverallStatus(violations);

    // Generate recommendations
    const recommendations = this.generateRecommendations(violations, sensitiveDataFound);

    const result: ComplianceCheckResult = {
      emailId: email.id,
      timestamp: new Date(),
      overallStatus,
      score,
      violations,
      checkedStandards: policy.standards,
      recommendations,
      sensitiveDataFound,
    };

    // Store in history
    const history = checkHistory.get(email.id) || [];
    history.push(result);
    checkHistory.set(email.id, history);

    return result;
  }

  /**
   * Check a single rule
   */
  private async checkRule(
    rule: ComplianceRule,
    email: { subject: string; body: string },
    content: string
  ): Promise<ComplianceViolation[]> {
    const violations: ComplianceViolation[] = [];

    // Pattern matching
    if (rule.pattern) {
      const matches = content.match(rule.pattern);
      if (matches) {
        violations.push({
          id: `v_${Date.now()}_${rule.id}`,
          standard: rule.standard,
          severity: rule.severity,
          title: rule.name,
          description: rule.description,
          location: { type: 'body', text: matches[0] },
          suggestedFix: rule.autoFix?.replacement,
          autoFixAvailable: !!rule.autoFix,
        });
      }
    }

    // Keyword matching
    if (rule.keywords) {
      const lowerContent = content.toLowerCase();
      for (const keyword of rule.keywords) {
        if (lowerContent.includes(keyword.toLowerCase())) {
          violations.push({
            id: `v_${Date.now()}_${rule.id}_${keyword}`,
            standard: rule.standard,
            severity: rule.severity,
            title: rule.name,
            description: `检测到关键词: "${keyword}"`,
            location: { type: 'body', text: keyword },
            autoFixAvailable: false,
          });
          break; // Only report once per rule
        }
      }
    }

    return violations;
  }

  /**
   * Check external recipients
   */
  private checkExternalRecipients(
    to: string[],
    cc?: string[]
  ): ComplianceViolation[] {
    const violations: ComplianceViolation[] = [];
    const allRecipients = [...to, ...(cc || [])];

    // Get company domain (would be configured in real implementation)
    const companyDomains = ['company.com', 'company.cn'];

    const externalRecipients = allRecipients.filter(email => {
      const domain = email.split('@')[1];
      return domain && !companyDomains.some(d => domain.includes(d));
    });

    if (externalRecipients.length > 0) {
      violations.push({
        id: `v_${Date.now()}_external`,
        standard: 'company_policy',
        severity: 'warning',
        title: '外部收件人',
        description: `邮件将发送给 ${externalRecipients.length} 个外部收件人`,
        location: { type: 'recipient' },
        suggestedFix: '请确认是否需要发送给外部收件人，并检查邮件内容是否适合外发',
        autoFixAvailable: false,
      });
    }

    return violations;
  }

  /**
   * Determine if deep analysis is needed
   */
  private needsDeepAnalysis(content: string): boolean {
    const sensitiveKeywords = [
      'confidential', 'secret', 'internal', 'private',
      '机密', '保密', '内部', '敏感', '私密',
      'merger', 'acquisition', 'lawsuit', 'settlement',
      '合并', '收购', '诉讼', '和解',
    ];

    const lowerContent = content.toLowerCase();
    return sensitiveKeywords.some(k => lowerContent.includes(k));
  }

  /**
   * AI-powered deep compliance analysis
   */
  private async deepComplianceAnalysis(
    email: { subject: string; body: string },
    standards: ComplianceStandard[]
  ): Promise<ComplianceViolation[]> {
    const prompt = `作为合规专家，分析以下邮件是否存在合规问题：

主题: ${email.subject}
正文:
${email.body.slice(0, 2000)}

检查标准: ${standards.join(', ')}

分析以下方面：
1. 个人信息保护 (GDPR/CCPA)
2. 机密信息泄露风险
3. 内部信息外发风险
4. 法律合规问题
5. 公司政策违规

返回 JSON 数组：
[
  {
    "standard": "标准类型",
    "severity": "info|warning|violation|critical",
    "title": "问题标题",
    "description": "问题描述",
    "suggestedFix": "建议修复方式"
  }
]

如果没有发现问题，返回空数组 []`;

    try {
      const response = await this.aiService.generateReply({
        emailContent: prompt,
        tone: 'professional',
        length: 'detailed',
      });

      const results = JSON.parse(response.replies[0].content);

      return results.map((r: any, index: number) => ({
        id: `v_ai_${Date.now()}_${index}`,
        standard: r.standard || 'company_policy',
        severity: r.severity || 'warning',
        title: r.title,
        description: r.description,
        location: { type: 'body' as const },
        suggestedFix: r.suggestedFix,
        autoFixAvailable: false,
      }));
    } catch {
      return [];
    }
  }

  /**
   * Get severity for data type
   */
  private getSeverityForDataType(type: SensitiveDataPattern['type']): ViolationSeverity {
    switch (type) {
      case 'phi':
      case 'credential':
        return 'critical';
      case 'financial':
      case 'pii':
        return 'violation';
      case 'confidential':
        return 'warning';
      default:
        return 'info';
    }
  }

  /**
   * Get standard for data type
   */
  private getStandardForDataType(type: SensitiveDataPattern['type']): ComplianceStandard {
    switch (type) {
      case 'phi':
        return 'hipaa';
      case 'financial':
        return 'pci_dss';
      case 'pii':
        return 'gdpr';
      case 'credential':
        return 'company_policy';
      case 'confidential':
        return 'confidential';
      default:
        return 'company_policy';
    }
  }

  /**
   * Calculate compliance score
   */
  private calculateComplianceScore(violations: ComplianceViolation[]): number {
    if (violations.length === 0) return 100;

    const severityWeights = {
      info: 2,
      warning: 5,
      violation: 15,
      critical: 30,
    };

    const totalPenalty = violations.reduce(
      (sum, v) => sum + severityWeights[v.severity],
      0
    );

    return Math.max(0, 100 - totalPenalty);
  }

  /**
   * Determine overall status
   */
  private determineOverallStatus(
    violations: ComplianceViolation[]
  ): 'pass' | 'warning' | 'fail' {
    if (violations.some(v => v.severity === 'critical' || v.severity === 'violation')) {
      return 'fail';
    }
    if (violations.some(v => v.severity === 'warning')) {
      return 'warning';
    }
    return 'pass';
  }

  /**
   * Generate recommendations
   */
  private generateRecommendations(
    violations: ComplianceViolation[],
    sensitiveData: ComplianceCheckResult['sensitiveDataFound']
  ): string[] {
    const recommendations: string[] = [];

    if (sensitiveData.length > 0) {
      recommendations.push('建议对敏感数据进行脱敏处理后再发送');
    }

    if (violations.some(v => v.standard === 'gdpr')) {
      recommendations.push('确保已获得数据主体的同意或有合法处理依据');
    }

    if (violations.some(v => v.standard === 'hipaa')) {
      recommendations.push('使用加密方式传输健康信息，或通过安全的医疗信息系统');
    }

    if (violations.some(v => v.standard === 'pci_dss')) {
      recommendations.push('切勿通过邮件发送完整的支付卡信息');
    }

    if (violations.some(v => v.severity === 'critical')) {
      recommendations.push('此邮件包含严重合规风险，建议咨询法务或合规部门');
    }

    return recommendations;
  }

  /**
   * Auto-fix violations
   */
  autoFixContent(
    content: string,
    violations: ComplianceViolation[]
  ): { content: string; fixedCount: number } {
    let fixedContent = content;
    let fixedCount = 0;

    for (const violation of violations.filter(v => v.autoFixAvailable)) {
      for (const pattern of sensitivePatterns) {
        if (violation.title.includes(pattern.name)) {
          fixedContent = fixedContent.replace(
            pattern.pattern,
            pattern.redactionPattern
          );
          fixedCount++;
        }
      }
    }

    return { content: fixedContent, fixedCount };
  }

  /**
   * Get or create policy
   */
  getPolicy(policyId: string): CompliancePolicy | null {
    return policies.get(policyId) || null;
  }

  /**
   * Create new policy
   */
  createPolicy(
    policy: Omit<CompliancePolicy, 'id' | 'createdAt' | 'updatedAt'>
  ): CompliancePolicy {
    const newPolicy: CompliancePolicy = {
      ...policy,
      id: `policy_${Date.now()}`,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    policies.set(newPolicy.id, newPolicy);
    return newPolicy;
  }

  /**
   * Update policy
   */
  updatePolicy(
    policyId: string,
    updates: Partial<Omit<CompliancePolicy, 'id' | 'createdAt'>>
  ): CompliancePolicy | null {
    const policy = policies.get(policyId);
    if (!policy) return null;

    Object.assign(policy, updates, { updatedAt: new Date() });
    return policy;
  }

  /**
   * Get all policies
   */
  getAllPolicies(): CompliancePolicy[] {
    return Array.from(policies.values());
  }

  /**
   * Generate compliance report
   */
  generateReport(periodDays: number = 30): ComplianceReport {
    const now = new Date();
    const periodStart = new Date(now.getTime() - periodDays * 24 * 60 * 60 * 1000);
    const previousPeriodStart = new Date(periodStart.getTime() - periodDays * 24 * 60 * 60 * 1000);

    // Collect all checks in period
    const allChecks: ComplianceCheckResult[] = [];
    const previousChecks: ComplianceCheckResult[] = [];

    checkHistory.forEach(checks => {
      checks.forEach(check => {
        if (check.timestamp >= periodStart) {
          allChecks.push(check);
        } else if (check.timestamp >= previousPeriodStart) {
          previousChecks.push(check);
        }
      });
    });

    // Calculate metrics
    const totalChecked = allChecks.length;
    const passCount = allChecks.filter(c => c.overallStatus === 'pass').length;
    const passRate = totalChecked > 0 ? (passCount / totalChecked) * 100 : 100;

    // Count by standard
    const violationsByStandard: Record<string, number> = {} as any;
    const violationsBySeverity: Record<string, number> = {} as any;
    const ruleViolationCount = new Map<string, { name: string; count: number }>();

    allChecks.forEach(check => {
      check.violations.forEach(v => {
        violationsByStandard[v.standard] = (violationsByStandard[v.standard] || 0) + 1;
        violationsBySeverity[v.severity] = (violationsBySeverity[v.severity] || 0) + 1;

        const ruleKey = v.title;
        const existing = ruleViolationCount.get(ruleKey) || { name: v.title, count: 0 };
        existing.count++;
        ruleViolationCount.set(ruleKey, existing);
      });
    });

    // Top violations
    const topViolations = Array.from(ruleViolationCount.entries())
      .map(([id, data]) => ({ ruleId: id, ruleName: data.name, count: data.count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Trends
    const currentViolations = allChecks.reduce((sum, c) => sum + c.violations.length, 0);
    const previousViolations = previousChecks.reduce((sum, c) => sum + c.violations.length, 0);
    const change = previousViolations > 0
      ? ((currentViolations - previousViolations) / previousViolations) * 100
      : 0;

    // Recommendations
    const recommendations: string[] = [];
    if (passRate < 80) {
      recommendations.push('合规通过率较低，建议加强员工合规培训');
    }
    if (violationsBySeverity['critical'] > 0) {
      recommendations.push('存在严重违规，建议立即进行合规审查');
    }
    if (topViolations.length > 0) {
      recommendations.push(`最常见问题: ${topViolations[0].ruleName}，建议重点关注`);
    }

    return {
      periodStart,
      periodEnd: now,
      totalChecked,
      passRate,
      violationsByStandard: violationsByStandard as Record<ComplianceStandard, number>,
      violationsBySeverity: violationsBySeverity as Record<ViolationSeverity, number>,
      topViolations,
      trends: {
        previousPeriod: previousViolations,
        currentPeriod: currentViolations,
        change,
      },
      recommendations,
    };
  }

  /**
   * Get check history for an email
   */
  getCheckHistory(emailId: string): ComplianceCheckResult[] {
    return checkHistory.get(emailId) || [];
  }
}

export const complianceCheckerService = new ComplianceCheckerService();
