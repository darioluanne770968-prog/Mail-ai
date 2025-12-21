/**
 * AI Agent Network - Multi-Agent Collaboration System
 * Specialized AI agents working together for complex email tasks
 */

import { AIService } from '../ai/index.js';

// Agent Types
export type AgentType =
  | 'negotiator'      // 谈判专家
  | 'legal'           // 法务专家
  | 'emotional'       // 情商专家
  | 'relationship'    // 关系管理
  | 'scheduler'       // 日程协调
  | 'researcher'      // 信息研究
  | 'translator'      // 多语言专家
  | 'summarizer'      // 摘要专家
  | 'coordinator';    // 协调总监

export interface AgentConfig {
  type: AgentType;
  name: string;
  description: string;
  capabilities: string[];
  systemPrompt: string;
  priority: number;
}

export interface AgentTask {
  id: string;
  type: 'analyze' | 'generate' | 'review' | 'recommend';
  input: any;
  context?: any;
  requiredAgents: AgentType[];
}

export interface AgentResult {
  agentType: AgentType;
  agentName: string;
  analysis: any;
  recommendations: string[];
  confidence: number;
  processingTime: number;
}

export interface CollaborationResult {
  taskId: string;
  agentResults: AgentResult[];
  synthesis: {
    summary: string;
    finalRecommendation: string;
    actionItems: string[];
    riskAssessment: {
      level: 'low' | 'medium' | 'high';
      factors: string[];
    };
  };
  totalProcessingTime: number;
}

// Agent Configurations
const AGENT_CONFIGS: Record<AgentType, AgentConfig> = {
  negotiator: {
    type: 'negotiator',
    name: '谈判专家',
    description: '专业处理薪资谈判、商务议价、合同条款协商',
    capabilities: ['salary_negotiation', 'price_bargaining', 'terms_discussion', 'win_win_strategy'],
    systemPrompt: `你是一位资深谈判专家，擅长：
- 分析谈判双方的利益点和底线
- 识别谈判中的关键筹码
- 提供双赢策略建议
- 起草有说服力的谈判邮件
- 预测对方可能的回应并准备应对方案

分析邮件时，关注：价格/薪资数字、条款变化、让步信号、deadline压力、替代方案暗示`,
    priority: 1,
  },
  legal: {
    type: 'legal',
    name: '法务顾问',
    description: '检测合同条款、法律风险、隐私承诺、合规问题',
    capabilities: ['contract_review', 'risk_detection', 'compliance_check', 'legal_language'],
    systemPrompt: `你是一位法务顾问，专注于：
- 识别邮件中的法律约束力语言
- 检测潜在的合同陷阱和不平等条款
- 评估隐私和数据保护风险
- 识别合规要求和deadline
- 建议需要法律专业人士审核的内容

重点关注：shall/must/agree/consent/waive/indemnify 等法律词汇，以及日期、金额、责任条款`,
    priority: 2,
  },
  emotional: {
    type: 'emotional',
    name: '情商专家',
    description: '分析情绪、建议沟通策略、避免冲突',
    capabilities: ['emotion_detection', 'empathy_suggestion', 'conflict_resolution', 'timing_advice'],
    systemPrompt: `你是一位情商专家，擅长：
- 深度分析文字背后的真实情绪（愤怒可能是焦虑、冷淡可能是受伤）
- 识别情绪触发点和敏感话题
- 建议最佳回复时机和情感基调
- 提供同理心回复建议
- 预警可能引起误解的措辞

分析维度：情绪强度(1-10)、情绪类型、隐藏情绪、建议回复情感温度`,
    priority: 3,
  },
  relationship: {
    type: 'relationship',
    name: '关系管理师',
    description: '维护人脉、追踪互动历史、提醒重要事项',
    capabilities: ['relationship_tracking', 'interaction_history', 'reminder_setting', 'network_analysis'],
    systemPrompt: `你是一位人脉关系管理专家，专注于：
- 分析联系人的重要程度和关系类型
- 追踪互动频率和质量变化
- 识别关系冷却或加强的信号
- 建议维护关系的最佳方式
- 提醒重要日期（生日、纪念日、项目节点）

关注：称呼变化、回复速度变化、邮件长度变化、话题深度变化`,
    priority: 4,
  },
  scheduler: {
    type: 'scheduler',
    name: '日程协调师',
    description: '处理会议安排、时间协调、日程冲突',
    capabilities: ['meeting_extraction', 'availability_check', 'timezone_handling', 'conflict_resolution'],
    systemPrompt: `你是一位日程协调专家，擅长：
- 从邮件中提取会议/活动信息
- 分析时间建议的优先级
- 处理跨时区协调
- 识别日程冲突
- 建议最优时间方案

提取信息：日期时间、时长、地点、参与者、议程、准备事项`,
    priority: 5,
  },
  researcher: {
    type: 'researcher',
    name: '信息研究员',
    description: '收集背景信息、验证事实、提供参考资料',
    capabilities: ['background_research', 'fact_checking', 'reference_finding', 'context_building'],
    systemPrompt: `你是一位信息研究专家，专注于：
- 识别邮件中需要验证的事实声明
- 提供相关背景信息和上下文
- 识别信息缺口和需要追问的问题
- 建议需要查阅的参考资料
- 总结关键数据点和统计信息

分析：提及的人物/公司/项目、数据声明、历史引用、行业术语`,
    priority: 6,
  },
  translator: {
    type: 'translator',
    name: '多语言专家',
    description: '翻译、本地化、跨文化沟通建议',
    capabilities: ['translation', 'localization', 'cultural_advice', 'tone_adaptation'],
    systemPrompt: `你是一位多语言沟通专家，擅长：
- 高质量翻译（保持语气和专业度）
- 文化差异提醒和本地化建议
- 识别可能引起跨文化误解的表达
- 建议适合目标文化的沟通方式
- 处理正式/非正式语域转换

关注：敬语使用、文化禁忌、幽默翻译、商务礼仪差异`,
    priority: 7,
  },
  summarizer: {
    type: 'summarizer',
    name: '摘要专家',
    description: '长邮件摘要、要点提取、结构化总结',
    capabilities: ['summarization', 'key_points', 'action_items', 'structured_output'],
    systemPrompt: `你是一位摘要专家，专注于：
- 提取长邮件的核心要点
- 识别和整理行动项
- 创建结构化的邮件摘要
- 区分重要信息和次要信息
- 生成决策所需的关键信息

输出格式：一句话总结、关键要点(3-5个)、行动项、deadline、待确认事项`,
    priority: 8,
  },
  coordinator: {
    type: 'coordinator',
    name: '协调总监',
    description: '协调各专家意见、综合分析、给出最终建议',
    capabilities: ['synthesis', 'conflict_resolution', 'priority_setting', 'final_recommendation'],
    systemPrompt: `你是 Agent 团队的协调总监，负责：
- 综合各专家的分析结果
- 解决专家意见冲突
- 权衡不同维度的建议
- 给出优先级排序
- 生成最终行动建议

你的输出应该：简洁明确、可执行、考虑全面、有优先级`,
    priority: 0,
  },
};

export class AgentNetworkService {
  private aiService: AIService;
  private agents: Map<AgentType, AgentConfig>;

  constructor() {
    this.aiService = new AIService();
    this.agents = new Map(Object.entries(AGENT_CONFIGS) as [AgentType, AgentConfig][]);
  }

  /**
   * Get all available agents
   */
  getAvailableAgents(): AgentConfig[] {
    return Array.from(this.agents.values()).sort((a, b) => a.priority - b.priority);
  }

  /**
   * Determine which agents should handle a task
   */
  async selectAgents(emailContent: string, taskType: string): Promise<AgentType[]> {
    const prompt = `分析以下邮件内容，确定需要哪些专家参与分析。

邮件内容：
${emailContent}

任务类型：${taskType}

可用专家：
${Array.from(this.agents.values()).map(a => `- ${a.type}: ${a.description}`).join('\n')}

返回 JSON 格式：
{
  "selectedAgents": ["agent_type1", "agent_type2"],
  "reasoning": "选择原因"
}`;

    try {
      const response = await this.aiService.generateReply({
        emailContent: prompt,
        tone: 'professional',
        length: 'concise',
      });

      const parsed = JSON.parse(response.replies[0].content);
      return parsed.selectedAgents as AgentType[];
    } catch {
      // Default to common agents
      return ['summarizer', 'emotional', 'coordinator'];
    }
  }

  /**
   * Run a single agent analysis
   */
  async runAgent(
    agentType: AgentType,
    emailContent: string,
    context?: any
  ): Promise<AgentResult> {
    const startTime = Date.now();
    const agent = this.agents.get(agentType);

    if (!agent) {
      throw new Error(`Unknown agent type: ${agentType}`);
    }

    const prompt = `${agent.systemPrompt}

---
邮件内容：
${emailContent}

${context ? `上下文信息：${JSON.stringify(context)}` : ''}

请以 JSON 格式返回你的分析：
{
  "analysis": {
    // 你的专业分析结果
  },
  "recommendations": ["建议1", "建议2"],
  "confidence": 0.85,  // 0-1 之间
  "keyFindings": ["发现1", "发现2"],
  "warnings": ["警告1"]  // 如有
}`;

    try {
      const response = await this.aiService.generateReply({
        emailContent: prompt,
        tone: 'professional',
        length: 'detailed',
      });

      const parsed = JSON.parse(response.replies[0].content);

      return {
        agentType,
        agentName: agent.name,
        analysis: parsed.analysis,
        recommendations: parsed.recommendations || [],
        confidence: parsed.confidence || 0.7,
        processingTime: Date.now() - startTime,
      };
    } catch (error) {
      return {
        agentType,
        agentName: agent.name,
        analysis: { error: 'Analysis failed' },
        recommendations: [],
        confidence: 0,
        processingTime: Date.now() - startTime,
      };
    }
  }

  /**
   * Run collaborative analysis with multiple agents
   */
  async collaborate(
    emailContent: string,
    requestedAgents?: AgentType[],
    context?: any
  ): Promise<CollaborationResult> {
    const taskId = `task_${Date.now()}`;
    const startTime = Date.now();

    // Select agents if not specified
    const agents = requestedAgents || await this.selectAgents(emailContent, 'general_analysis');

    // Run all agents in parallel
    const agentPromises = agents
      .filter(a => a !== 'coordinator')
      .map(agentType => this.runAgent(agentType, emailContent, context));

    const agentResults = await Promise.all(agentPromises);

    // Run coordinator to synthesize results
    const synthesis = await this.synthesizeResults(emailContent, agentResults);

    return {
      taskId,
      agentResults,
      synthesis,
      totalProcessingTime: Date.now() - startTime,
    };
  }

  /**
   * Synthesize results from multiple agents
   */
  private async synthesizeResults(
    emailContent: string,
    agentResults: AgentResult[]
  ): Promise<CollaborationResult['synthesis']> {
    const coordinator = this.agents.get('coordinator')!;

    const prompt = `${coordinator.systemPrompt}

---
原始邮件：
${emailContent}

各专家分析结果：
${agentResults.map(r => `
【${r.agentName}】(置信度: ${(r.confidence * 100).toFixed(0)}%)
分析：${JSON.stringify(r.analysis)}
建议：${r.recommendations.join('; ')}
`).join('\n')}

请综合以上分析，给出最终建议。以 JSON 格式返回：
{
  "summary": "一句话总结",
  "finalRecommendation": "最终建议行动",
  "actionItems": ["行动1", "行动2"],
  "riskAssessment": {
    "level": "low|medium|high",
    "factors": ["风险因素1", "风险因素2"]
  },
  "priorityOrder": ["最重要的事", "次重要的事"]
}`;

    try {
      const response = await this.aiService.generateReply({
        emailContent: prompt,
        tone: 'professional',
        length: 'detailed',
      });

      return JSON.parse(response.replies[0].content);
    } catch {
      return {
        summary: '分析完成，请查看各专家意见',
        finalRecommendation: agentResults[0]?.recommendations[0] || '需要更多信息',
        actionItems: agentResults.flatMap(r => r.recommendations).slice(0, 5),
        riskAssessment: {
          level: 'medium',
          factors: ['综合分析失败，建议人工审核'],
        },
      };
    }
  }

  /**
   * Negotiation-specific analysis
   */
  async analyzeNegotiation(emailContent: string, context: {
    myPosition?: string;
    targetOutcome?: string;
    deadline?: string;
    alternatives?: string[];
  }): Promise<{
    currentPosition: string;
    counterpartyPosition: string;
    leveragePoints: string[];
    suggestedResponse: string;
    tactics: string[];
    riskLevel: 'low' | 'medium' | 'high';
  }> {
    const result = await this.collaborate(
      emailContent,
      ['negotiator', 'emotional', 'legal', 'coordinator'],
      context
    );

    const negotiatorResult = result.agentResults.find(r => r.agentType === 'negotiator');

    return {
      currentPosition: negotiatorResult?.analysis?.currentPosition || 'Unknown',
      counterpartyPosition: negotiatorResult?.analysis?.counterpartyPosition || 'Unknown',
      leveragePoints: negotiatorResult?.analysis?.leveragePoints || [],
      suggestedResponse: result.synthesis.finalRecommendation,
      tactics: negotiatorResult?.recommendations || [],
      riskLevel: result.synthesis.riskAssessment.level,
    };
  }

  /**
   * Legal review
   */
  async legalReview(emailContent: string): Promise<{
    hasLegalImplications: boolean;
    contractualTerms: string[];
    risks: Array<{ type: string; severity: string; description: string }>;
    requiredActions: string[];
    needsLawyer: boolean;
  }> {
    const result = await this.runAgent('legal', emailContent);

    return {
      hasLegalImplications: result.analysis?.hasLegalImplications || false,
      contractualTerms: result.analysis?.contractualTerms || [],
      risks: result.analysis?.risks || [],
      requiredActions: result.recommendations,
      needsLawyer: result.analysis?.needsLawyer || false,
    };
  }
}

export const agentNetworkService = new AgentNetworkService();
