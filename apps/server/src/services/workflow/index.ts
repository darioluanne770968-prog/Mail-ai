/**
 * Workflow Automation System
 *
 * Automates email-related tasks based on triggers and conditions.
 */

import OpenAI from 'openai';
import { config } from '../../config/index.js';
import { logger } from '../../utils/logger.js';

type TriggerType =
  | 'email_received'
  | 'email_sent'
  | 'no_reply_timeout'
  | 'keyword_match'
  | 'sender_match'
  | 'sentiment_match'
  | 'schedule'
  | 'label_added';

type ActionType =
  | 'auto_reply'
  | 'forward'
  | 'add_label'
  | 'archive'
  | 'create_task'
  | 'send_notification'
  | 'create_calendar_event'
  | 'run_ai_analysis'
  | 'escalate';

interface WorkflowTrigger {
  type: TriggerType;
  conditions: TriggerCondition[];
}

interface TriggerCondition {
  field: string;
  operator: 'equals' | 'contains' | 'matches' | 'greater_than' | 'less_than' | 'in_list';
  value: string | number | string[];
}

interface WorkflowAction {
  type: ActionType;
  config: Record<string, any>;
  delay?: number; // milliseconds
}

interface Workflow {
  id: string;
  name: string;
  description?: string;
  userId: string;
  isActive: boolean;
  trigger: WorkflowTrigger;
  actions: WorkflowAction[];
  createdAt: Date;
  updatedAt: Date;
  executionCount: number;
  lastExecutedAt?: Date;
}

interface WorkflowExecution {
  id: string;
  workflowId: string;
  triggeredBy: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  startedAt: Date;
  completedAt?: Date;
  results: ActionResult[];
  error?: string;
}

interface ActionResult {
  actionType: ActionType;
  success: boolean;
  result?: any;
  error?: string;
  executedAt: Date;
}

interface EmailContext {
  id: string;
  subject: string;
  from: string;
  to: string[];
  body: string;
  receivedAt: Date;
  labels?: string[];
  sentiment?: string;
  urgency?: string;
}

export class WorkflowService {
  private openai: OpenAI;
  private workflows: Map<string, Workflow> = new Map();
  private executions: Map<string, WorkflowExecution> = new Map();
  private scheduledJobs: Map<string, NodeJS.Timeout> = new Map();

  constructor() {
    this.openai = new OpenAI({ apiKey: config.openaiApiKey });
  }

  /**
   * Create a new workflow
   */
  createWorkflow(params: {
    name: string;
    description?: string;
    userId: string;
    trigger: WorkflowTrigger;
    actions: WorkflowAction[];
  }): Workflow {
    const workflow: Workflow = {
      id: `wf_${Date.now()}_${Math.random().toString(36).slice(2)}`,
      name: params.name,
      description: params.description,
      userId: params.userId,
      isActive: true,
      trigger: params.trigger,
      actions: params.actions,
      createdAt: new Date(),
      updatedAt: new Date(),
      executionCount: 0,
    };

    this.workflows.set(workflow.id, workflow);

    // Set up scheduled trigger if applicable
    if (params.trigger.type === 'schedule') {
      this.setupScheduledWorkflow(workflow);
    }

    logger.info({ msg: 'Workflow created', workflowId: workflow.id, name: params.name });
    return workflow;
  }

  /**
   * Get workflow templates
   */
  getTemplates(): Partial<Workflow>[] {
    return [
      {
        name: 'Auto-reply to Customer Support',
        description: 'Automatically reply to customer support emails with AI-generated response',
        trigger: {
          type: 'email_received',
          conditions: [
            { field: 'subject', operator: 'contains', value: 'support' },
          ],
        },
        actions: [
          { type: 'run_ai_analysis', config: { analysisType: 'sentiment' } },
          { type: 'auto_reply', config: { tone: 'friendly', useKnowledgeBase: true } },
          { type: 'add_label', config: { label: 'Customer Support' } },
        ],
      },
      {
        name: 'Escalate Urgent Emails',
        description: 'Forward high-priority emails to manager',
        trigger: {
          type: 'sentiment_match',
          conditions: [
            { field: 'urgency', operator: 'equals', value: 'critical' },
          ],
        },
        actions: [
          { type: 'add_label', config: { label: 'Urgent' } },
          { type: 'forward', config: { to: '{{manager_email}}' } },
          { type: 'send_notification', config: { channel: 'slack', message: 'Urgent email received' } },
        ],
      },
      {
        name: 'Follow-up Reminder',
        description: 'Remind if no reply received within 48 hours',
        trigger: {
          type: 'no_reply_timeout',
          conditions: [
            { field: 'timeout_hours', operator: 'greater_than', value: 48 },
          ],
        },
        actions: [
          { type: 'send_notification', config: { message: 'No reply received for email: {{subject}}' } },
          { type: 'create_task', config: { title: 'Follow up: {{subject}}' } },
        ],
      },
      {
        name: 'Meeting Request Handler',
        description: 'Auto-create calendar events from meeting requests',
        trigger: {
          type: 'keyword_match',
          conditions: [
            { field: 'body', operator: 'matches', value: 'meeting|schedule|call' },
          ],
        },
        actions: [
          { type: 'run_ai_analysis', config: { analysisType: 'extract_meeting_details' } },
          { type: 'create_calendar_event', config: { useExtractedDetails: true } },
          { type: 'auto_reply', config: { template: 'meeting_confirmation' } },
        ],
      },
      {
        name: 'VIP Sender Alert',
        description: 'Priority handling for VIP contacts',
        trigger: {
          type: 'sender_match',
          conditions: [
            { field: 'from', operator: 'in_list', value: ['{{vip_list}}'] },
          ],
        },
        actions: [
          { type: 'add_label', config: { label: 'VIP' } },
          { type: 'send_notification', config: { priority: 'high' } },
        ],
      },
    ];
  }

  /**
   * Process incoming email against all workflows
   */
  async processEmail(email: EmailContext, userId: string): Promise<WorkflowExecution[]> {
    const userWorkflows = Array.from(this.workflows.values())
      .filter(w => w.userId === userId && w.isActive);

    const executions: WorkflowExecution[] = [];

    for (const workflow of userWorkflows) {
      if (await this.shouldTrigger(workflow, email)) {
        const execution = await this.executeWorkflow(workflow, email);
        executions.push(execution);
      }
    }

    return executions;
  }

  /**
   * Check if workflow should trigger
   */
  private async shouldTrigger(workflow: Workflow, email: EmailContext): Promise<boolean> {
    const { trigger } = workflow;

    // Check trigger type
    if (trigger.type !== 'email_received' && trigger.type !== 'keyword_match' && trigger.type !== 'sender_match' && trigger.type !== 'sentiment_match') {
      return false;
    }

    // Check all conditions
    for (const condition of trigger.conditions) {
      const value = this.getFieldValue(email, condition.field);
      if (!this.evaluateCondition(value, condition)) {
        return false;
      }
    }

    return true;
  }

  /**
   * Get field value from email context
   */
  private getFieldValue(email: EmailContext, field: string): any {
    switch (field) {
      case 'subject': return email.subject;
      case 'from': return email.from;
      case 'body': return email.body;
      case 'urgency': return email.urgency;
      case 'sentiment': return email.sentiment;
      case 'labels': return email.labels;
      default: return undefined;
    }
  }

  /**
   * Evaluate condition
   */
  private evaluateCondition(value: any, condition: TriggerCondition): boolean {
    switch (condition.operator) {
      case 'equals':
        return value === condition.value;
      case 'contains':
        return String(value).toLowerCase().includes(String(condition.value).toLowerCase());
      case 'matches':
        return new RegExp(String(condition.value), 'i').test(String(value));
      case 'greater_than':
        return Number(value) > Number(condition.value);
      case 'less_than':
        return Number(value) < Number(condition.value);
      case 'in_list':
        return Array.isArray(condition.value) && condition.value.includes(value);
      default:
        return false;
    }
  }

  /**
   * Execute workflow
   */
  async executeWorkflow(workflow: Workflow, context: EmailContext): Promise<WorkflowExecution> {
    const execution: WorkflowExecution = {
      id: `exec_${Date.now()}_${Math.random().toString(36).slice(2)}`,
      workflowId: workflow.id,
      triggeredBy: context.id,
      status: 'running',
      startedAt: new Date(),
      results: [],
    };

    this.executions.set(execution.id, execution);

    try {
      for (const action of workflow.actions) {
        // Apply delay if specified
        if (action.delay) {
          await new Promise(resolve => setTimeout(resolve, action.delay));
        }

        const result = await this.executeAction(action, context, workflow);
        execution.results.push(result);

        if (!result.success) {
          logger.warn({ msg: 'Action failed', workflowId: workflow.id, action: action.type, error: result.error });
        }
      }

      execution.status = 'completed';
      execution.completedAt = new Date();
      workflow.executionCount++;
      workflow.lastExecutedAt = new Date();

    } catch (error) {
      execution.status = 'failed';
      execution.error = error instanceof Error ? error.message : 'Unknown error';
      logger.error({ msg: 'Workflow execution failed', workflowId: workflow.id, error });
    }

    return execution;
  }

  /**
   * Execute individual action
   */
  private async executeAction(
    action: WorkflowAction,
    context: EmailContext,
    workflow: Workflow
  ): Promise<ActionResult> {
    const result: ActionResult = {
      actionType: action.type,
      success: false,
      executedAt: new Date(),
    };

    try {
      switch (action.type) {
        case 'auto_reply':
          result.result = await this.executeAutoReply(action.config, context);
          break;

        case 'forward':
          result.result = await this.executeForward(action.config, context);
          break;

        case 'add_label':
          result.result = await this.executeAddLabel(action.config, context);
          break;

        case 'create_task':
          result.result = await this.executeCreateTask(action.config, context);
          break;

        case 'send_notification':
          result.result = await this.executeSendNotification(action.config, context);
          break;

        case 'create_calendar_event':
          result.result = await this.executeCreateCalendarEvent(action.config, context);
          break;

        case 'run_ai_analysis':
          result.result = await this.executeAIAnalysis(action.config, context);
          break;

        case 'escalate':
          result.result = await this.executeEscalate(action.config, context);
          break;

        default:
          throw new Error(`Unknown action type: ${action.type}`);
      }

      result.success = true;
    } catch (error) {
      result.error = error instanceof Error ? error.message : 'Unknown error';
    }

    return result;
  }

  /**
   * Action: Auto Reply
   */
  private async executeAutoReply(config: Record<string, any>, context: EmailContext): Promise<any> {
    const response = await this.openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: `Generate a ${config.tone || 'professional'} auto-reply for this email. Keep it concise and helpful.`,
        },
        { role: 'user', content: `Subject: ${context.subject}\n\n${context.body}` },
      ],
      max_tokens: 500,
    });

    return {
      generatedReply: response.choices[0]?.message?.content,
      to: context.from,
    };
  }

  /**
   * Action: Forward Email
   */
  private async executeForward(config: Record<string, any>, context: EmailContext): Promise<any> {
    const to = this.interpolateTemplate(config.to, context);
    return {
      action: 'forward',
      to,
      originalFrom: context.from,
      subject: `Fwd: ${context.subject}`,
    };
  }

  /**
   * Action: Add Label
   */
  private async executeAddLabel(config: Record<string, any>, context: EmailContext): Promise<any> {
    return {
      action: 'add_label',
      emailId: context.id,
      label: config.label,
    };
  }

  /**
   * Action: Create Task
   */
  private async executeCreateTask(config: Record<string, any>, context: EmailContext): Promise<any> {
    const title = this.interpolateTemplate(config.title, context);
    return {
      action: 'create_task',
      title,
      description: `Related to email from ${context.from}`,
      dueDate: config.dueDate || new Date(Date.now() + 24 * 60 * 60 * 1000),
      source: 'email_workflow',
      emailId: context.id,
    };
  }

  /**
   * Action: Send Notification
   */
  private async executeSendNotification(config: Record<string, any>, context: EmailContext): Promise<any> {
    const message = this.interpolateTemplate(config.message || 'New email notification', context);
    return {
      action: 'notification',
      channel: config.channel || 'push',
      message,
      priority: config.priority || 'normal',
      emailId: context.id,
    };
  }

  /**
   * Action: Create Calendar Event
   */
  private async executeCreateCalendarEvent(config: Record<string, any>, context: EmailContext): Promise<any> {
    // Extract meeting details using AI
    const response = await this.openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: `Extract meeting details from this email. Return JSON: { "title": "", "date": "", "time": "", "duration": "", "location": "", "attendees": [] }`,
        },
        { role: 'user', content: context.body },
      ],
      response_format: { type: 'json_object' },
    });

    const details = JSON.parse(response.choices[0]?.message?.content || '{}');
    return {
      action: 'create_calendar_event',
      ...details,
      source: 'email_workflow',
      emailId: context.id,
    };
  }

  /**
   * Action: Run AI Analysis
   */
  private async executeAIAnalysis(config: Record<string, any>, context: EmailContext): Promise<any> {
    const analysisType = config.analysisType || 'general';

    const prompts: Record<string, string> = {
      sentiment: 'Analyze the sentiment and urgency. Return JSON: { "sentiment": "positive|neutral|negative", "urgency": "low|medium|high|critical" }',
      extract_meeting_details: 'Extract meeting details. Return JSON: { "hasmeeting": boolean, "date": "", "time": "", "participants": [] }',
      categorize: 'Categorize this email. Return JSON: { "category": "", "tags": [] }',
      general: 'Analyze this email. Return JSON: { "summary": "", "keyPoints": [], "suggestedAction": "" }',
    };

    const response = await this.openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        { role: 'system', content: prompts[analysisType] || prompts.general },
        { role: 'user', content: context.body },
      ],
      response_format: { type: 'json_object' },
    });

    return {
      analysisType,
      result: JSON.parse(response.choices[0]?.message?.content || '{}'),
    };
  }

  /**
   * Action: Escalate
   */
  private async executeEscalate(config: Record<string, any>, context: EmailContext): Promise<any> {
    return {
      action: 'escalate',
      to: config.escalateTo,
      reason: config.reason || 'Automated escalation',
      originalEmail: {
        from: context.from,
        subject: context.subject,
        receivedAt: context.receivedAt,
      },
    };
  }

  /**
   * Interpolate template variables
   */
  private interpolateTemplate(template: string, context: EmailContext): string {
    return template
      .replace('{{subject}}', context.subject)
      .replace('{{from}}', context.from)
      .replace('{{to}}', context.to.join(', '));
  }

  /**
   * Setup scheduled workflow
   */
  private setupScheduledWorkflow(workflow: Workflow): void {
    // Implementation for scheduled triggers
    logger.info({ msg: 'Scheduled workflow setup', workflowId: workflow.id });
  }

  /**
   * Get all workflows for user
   */
  getWorkflows(userId: string): Workflow[] {
    return Array.from(this.workflows.values())
      .filter(w => w.userId === userId);
  }

  /**
   * Update workflow
   */
  updateWorkflow(workflowId: string, updates: Partial<Workflow>): Workflow | null {
    const workflow = this.workflows.get(workflowId);
    if (!workflow) return null;

    Object.assign(workflow, updates, { updatedAt: new Date() });
    return workflow;
  }

  /**
   * Delete workflow
   */
  deleteWorkflow(workflowId: string): boolean {
    // Cancel any scheduled jobs
    const job = this.scheduledJobs.get(workflowId);
    if (job) {
      clearTimeout(job);
      this.scheduledJobs.delete(workflowId);
    }
    return this.workflows.delete(workflowId);
  }

  /**
   * Get execution history
   */
  getExecutionHistory(workflowId: string): WorkflowExecution[] {
    return Array.from(this.executions.values())
      .filter(e => e.workflowId === workflowId)
      .sort((a, b) => b.startedAt.getTime() - a.startedAt.getTime());
  }
}

export const workflowService = new WorkflowService();
