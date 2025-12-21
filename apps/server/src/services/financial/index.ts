/**
 * Financial Tracker Service
 * Track invoices, subscriptions, and financial mentions in emails
 */

import { AIService } from '../ai/index.js';

export interface FinancialItem {
  id: string;
  type: 'invoice' | 'receipt' | 'subscription' | 'payment_request' | 'refund' | 'quote' | 'expense';
  source: {
    emailId: string;
    from: string;
    subject: string;
    date: Date;
  };
  details: {
    vendor: string;
    description: string;
    amount: number;
    currency: string;
    dueDate?: Date;
    paidDate?: Date;
    recurring?: {
      frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly';
      nextDate: Date;
    };
  };
  status: 'pending' | 'paid' | 'overdue' | 'cancelled' | 'disputed';
  category: string;
  tags: string[];
  attachments: string[];
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Subscription {
  id: string;
  vendor: string;
  service: string;
  amount: number;
  currency: string;
  frequency: 'monthly' | 'quarterly' | 'yearly';
  startDate: Date;
  nextBillingDate: Date;
  status: 'active' | 'cancelled' | 'paused' | 'trial';
  category: string;
  autoRenew: boolean;
  emails: string[]; // Related email IDs
  cancelUrl?: string;
  notes?: string;
}

export interface FinancialSummary {
  period: {
    start: Date;
    end: Date;
  };
  income: {
    total: number;
    byCategory: Record<string, number>;
    count: number;
  };
  expenses: {
    total: number;
    byCategory: Record<string, number>;
    count: number;
  };
  pending: {
    invoices: number;
    amount: number;
  };
  subscriptions: {
    active: number;
    monthlyTotal: number;
    yearlyTotal: number;
  };
  insights: string[];
  alerts: Array<{
    type: 'overdue' | 'upcoming' | 'unusual' | 'subscription_renewal';
    message: string;
    priority: 'low' | 'medium' | 'high';
    itemId?: string;
  }>;
}

export interface PaymentCommitment {
  id: string;
  emailId: string;
  from: string;
  commitment: string;
  amount?: number;
  currency?: string;
  dueDate?: Date;
  status: 'pending' | 'fulfilled' | 'overdue' | 'cancelled';
  followUpDates: Date[];
  createdAt: Date;
}

export interface ExpenseReport {
  id: string;
  userId: string;
  period: {
    start: Date;
    end: Date;
  };
  items: FinancialItem[];
  totals: {
    byCategory: Record<string, number>;
    byVendor: Record<string, number>;
    grand: number;
  };
  generatedAt: Date;
  format: 'summary' | 'detailed';
}

// In-memory storage
const financialItems = new Map<string, FinancialItem>();
const subscriptions = new Map<string, Subscription>();
const commitments = new Map<string, PaymentCommitment>();

export class FinancialTrackerService {
  private aiService: AIService;

  constructor() {
    this.aiService = new AIService();
  }

  /**
   * Extract financial information from email
   */
  async extractFinancialInfo(email: {
    id: string;
    from: string;
    subject: string;
    body: string;
    date: Date;
    attachments?: string[];
  }): Promise<FinancialItem | null> {
    const prompt = `分析以下邮件，提取财务相关信息：

发件人: ${email.from}
主题: ${email.subject}
日期: ${email.date.toISOString()}
内容:
${email.body.slice(0, 2000)}

如果邮件包含财务信息（发票、收据、订阅、付款请求、报价、报销等），请提取：
1. 类型
2. 供应商/公司名称
3. 描述
4. 金额和货币
5. 到期日期（如有）
6. 是否为周期性付款
7. 分类

如果不是财务相关邮件，返回 null。

返回 JSON:
{
  "isFinancial": true,
  "type": "invoice",
  "vendor": "公司名",
  "description": "描述",
  "amount": 99.99,
  "currency": "USD",
  "dueDate": "2024-02-01",
  "recurring": {
    "frequency": "monthly",
    "nextDate": "2024-03-01"
  },
  "category": "软件服务",
  "tags": ["标签1", "标签2"]
}

或者 {"isFinancial": false}`;

    try {
      const response = await this.aiService.generateReply({
        emailContent: prompt,
        tone: 'professional',
        length: 'concise',
      });

      const result = JSON.parse(response.replies[0].content);

      if (!result.isFinancial) return null;

      const item: FinancialItem = {
        id: `fin_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: result.type,
        source: {
          emailId: email.id,
          from: email.from,
          subject: email.subject,
          date: email.date,
        },
        details: {
          vendor: result.vendor,
          description: result.description,
          amount: result.amount,
          currency: result.currency || 'USD',
          dueDate: result.dueDate ? new Date(result.dueDate) : undefined,
          recurring: result.recurring ? {
            frequency: result.recurring.frequency,
            nextDate: new Date(result.recurring.nextDate),
          } : undefined,
        },
        status: 'pending',
        category: result.category || 'uncategorized',
        tags: result.tags || [],
        attachments: email.attachments || [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      financialItems.set(item.id, item);

      // If it's a subscription, create subscription record
      if (result.recurring) {
        this.createSubscription(item);
      }

      return item;
    } catch {
      return null;
    }
  }

  /**
   * Create subscription from financial item
   */
  private createSubscription(item: FinancialItem): Subscription {
    const existing = Array.from(subscriptions.values()).find(s =>
      s.vendor.toLowerCase() === item.details.vendor.toLowerCase()
    );

    if (existing) {
      existing.emails.push(item.source.emailId);
      existing.nextBillingDate = item.details.recurring!.nextDate;
      return existing;
    }

    const subscription: Subscription = {
      id: `sub_${Date.now()}`,
      vendor: item.details.vendor,
      service: item.details.description,
      amount: item.details.amount,
      currency: item.details.currency,
      frequency: item.details.recurring!.frequency as Subscription['frequency'],
      startDate: item.source.date,
      nextBillingDate: item.details.recurring!.nextDate,
      status: 'active',
      category: item.category,
      autoRenew: true,
      emails: [item.source.emailId],
    };

    subscriptions.set(subscription.id, subscription);
    return subscription;
  }

  /**
   * Extract payment commitments from email
   */
  async extractCommitments(email: {
    id: string;
    from: string;
    body: string;
    date: Date;
  }): Promise<PaymentCommitment | null> {
    const prompt = `分析以下邮件，检测是否包含付款承诺：

发件人: ${email.from}
内容:
${email.body.slice(0, 1000)}

查找类似这样的承诺：
- "月底前付款"
- "下周一转账"
- "will pay by Friday"
- "invoice will be settled"

如果有付款承诺，提取：
1. 承诺内容
2. 金额（如有）
3. 预期日期（如有）

返回 JSON:
{
  "hasCommitment": true,
  "commitment": "承诺内容",
  "amount": 1000,
  "currency": "CNY",
  "dueDate": "2024-02-15"
}

或 {"hasCommitment": false}`;

    try {
      const response = await this.aiService.generateReply({
        emailContent: prompt,
        tone: 'professional',
        length: 'concise',
      });

      const result = JSON.parse(response.replies[0].content);

      if (!result.hasCommitment) return null;

      const commitment: PaymentCommitment = {
        id: `commit_${Date.now()}`,
        emailId: email.id,
        from: email.from,
        commitment: result.commitment,
        amount: result.amount,
        currency: result.currency,
        dueDate: result.dueDate ? new Date(result.dueDate) : undefined,
        status: 'pending',
        followUpDates: [],
        createdAt: new Date(),
      };

      commitments.set(commitment.id, commitment);
      return commitment;
    } catch {
      return null;
    }
  }

  /**
   * Get financial summary for a period
   */
  getFinancialSummary(
    userId: string,
    startDate: Date,
    endDate: Date
  ): FinancialSummary {
    const periodItems = Array.from(financialItems.values()).filter(item =>
      item.source.date >= startDate && item.source.date <= endDate
    );

    // Calculate income
    const incomeItems = periodItems.filter(item =>
      ['receipt', 'refund'].includes(item.type) && item.status === 'paid'
    );
    const incomeByCategory: Record<string, number> = {};
    let totalIncome = 0;
    incomeItems.forEach(item => {
      totalIncome += item.details.amount;
      incomeByCategory[item.category] = (incomeByCategory[item.category] || 0) + item.details.amount;
    });

    // Calculate expenses
    const expenseItems = periodItems.filter(item =>
      ['invoice', 'subscription', 'expense', 'payment_request'].includes(item.type)
    );
    const expensesByCategory: Record<string, number> = {};
    let totalExpenses = 0;
    expenseItems.forEach(item => {
      totalExpenses += item.details.amount;
      expensesByCategory[item.category] = (expensesByCategory[item.category] || 0) + item.details.amount;
    });

    // Pending invoices
    const pendingInvoices = periodItems.filter(item =>
      item.type === 'invoice' && item.status === 'pending'
    );

    // Subscriptions
    const activeSubs = Array.from(subscriptions.values()).filter(s => s.status === 'active');
    const monthlyTotal = activeSubs.reduce((sum, s) => {
      const monthly = s.frequency === 'yearly' ? s.amount / 12 :
                      s.frequency === 'quarterly' ? s.amount / 3 :
                      s.amount;
      return sum + monthly;
    }, 0);

    // Generate alerts
    const alerts: FinancialSummary['alerts'] = [];

    // Overdue items
    const now = new Date();
    periodItems
      .filter(item => item.status === 'pending' && item.details.dueDate && item.details.dueDate < now)
      .forEach(item => {
        alerts.push({
          type: 'overdue',
          message: `逾期: ${item.details.vendor} - ${item.details.currency} ${item.details.amount}`,
          priority: 'high',
          itemId: item.id,
        });
      });

    // Upcoming payments
    const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    periodItems
      .filter(item => item.status === 'pending' && item.details.dueDate &&
              item.details.dueDate >= now && item.details.dueDate <= nextWeek)
      .forEach(item => {
        alerts.push({
          type: 'upcoming',
          message: `即将到期: ${item.details.vendor} - ${item.details.currency} ${item.details.amount}`,
          priority: 'medium',
          itemId: item.id,
        });
      });

    // Subscription renewals
    activeSubs
      .filter(s => s.nextBillingDate >= now && s.nextBillingDate <= nextWeek)
      .forEach(sub => {
        alerts.push({
          type: 'subscription_renewal',
          message: `订阅即将续费: ${sub.vendor} - ${sub.currency} ${sub.amount}`,
          priority: 'medium',
          itemId: sub.id,
        });
      });

    // Generate insights
    const insights: string[] = [];
    if (totalExpenses > 0) {
      const topCategory = Object.entries(expensesByCategory)
        .sort((a, b) => b[1] - a[1])[0];
      if (topCategory) {
        insights.push(`最大支出类别: ${topCategory[0]} (${topCategory[1].toFixed(2)})`);
      }
    }
    if (activeSubs.length > 0) {
      insights.push(`活跃订阅 ${activeSubs.length} 个，月均支出 ${monthlyTotal.toFixed(2)}`);
    }

    return {
      period: { start: startDate, end: endDate },
      income: {
        total: totalIncome,
        byCategory: incomeByCategory,
        count: incomeItems.length,
      },
      expenses: {
        total: totalExpenses,
        byCategory: expensesByCategory,
        count: expenseItems.length,
      },
      pending: {
        invoices: pendingInvoices.length,
        amount: pendingInvoices.reduce((sum, i) => sum + i.details.amount, 0),
      },
      subscriptions: {
        active: activeSubs.length,
        monthlyTotal,
        yearlyTotal: monthlyTotal * 12,
      },
      insights,
      alerts,
    };
  }

  /**
   * Get all subscriptions
   */
  getSubscriptions(status?: Subscription['status']): Subscription[] {
    let subs = Array.from(subscriptions.values());
    if (status) {
      subs = subs.filter(s => s.status === status);
    }
    return subs.sort((a, b) => a.nextBillingDate.getTime() - b.nextBillingDate.getTime());
  }

  /**
   * Update subscription status
   */
  updateSubscription(id: string, updates: Partial<Subscription>): Subscription | null {
    const sub = subscriptions.get(id);
    if (!sub) return null;

    const updated = { ...sub, ...updates };
    subscriptions.set(id, updated);
    return updated;
  }

  /**
   * Get pending commitments
   */
  getPendingCommitments(): PaymentCommitment[] {
    return Array.from(commitments.values())
      .filter(c => c.status === 'pending')
      .sort((a, b) => {
        if (!a.dueDate) return 1;
        if (!b.dueDate) return -1;
        return a.dueDate.getTime() - b.dueDate.getTime();
      });
  }

  /**
   * Update financial item status
   */
  updateItemStatus(id: string, status: FinancialItem['status'], notes?: string): FinancialItem | null {
    const item = financialItems.get(id);
    if (!item) return null;

    item.status = status;
    item.updatedAt = new Date();
    if (notes) item.notes = notes;
    if (status === 'paid') item.details.paidDate = new Date();

    return item;
  }

  /**
   * Get items by category
   */
  getItemsByCategory(category: string): FinancialItem[] {
    return Array.from(financialItems.values())
      .filter(item => item.category === category)
      .sort((a, b) => b.source.date.getTime() - a.source.date.getTime());
  }

  /**
   * Generate expense report
   */
  generateExpenseReport(
    userId: string,
    startDate: Date,
    endDate: Date,
    format: 'summary' | 'detailed' = 'summary'
  ): ExpenseReport {
    const items = Array.from(financialItems.values())
      .filter(item =>
        item.source.date >= startDate &&
        item.source.date <= endDate &&
        ['invoice', 'expense', 'subscription'].includes(item.type)
      );

    const byCategory: Record<string, number> = {};
    const byVendor: Record<string, number> = {};
    let grand = 0;

    items.forEach(item => {
      grand += item.details.amount;
      byCategory[item.category] = (byCategory[item.category] || 0) + item.details.amount;
      byVendor[item.details.vendor] = (byVendor[item.details.vendor] || 0) + item.details.amount;
    });

    return {
      id: `report_${Date.now()}`,
      userId,
      period: { start: startDate, end: endDate },
      items: format === 'detailed' ? items : [],
      totals: {
        byCategory,
        byVendor,
        grand,
      },
      generatedAt: new Date(),
      format,
    };
  }

  /**
   * Detect unusual spending
   */
  async detectUnusualSpending(userId: string): Promise<Array<{
    item: FinancialItem;
    reason: string;
    severity: 'low' | 'medium' | 'high';
  }>> {
    const recentItems = Array.from(financialItems.values())
      .filter(item => {
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        return item.source.date >= thirtyDaysAgo;
      })
      .sort((a, b) => b.details.amount - a.details.amount);

    const unusual: Array<{ item: FinancialItem; reason: string; severity: 'low' | 'medium' | 'high' }> = [];

    // Check for large amounts
    const avgAmount = recentItems.reduce((sum, i) => sum + i.details.amount, 0) / recentItems.length || 0;

    for (const item of recentItems) {
      if (item.details.amount > avgAmount * 3) {
        unusual.push({
          item,
          reason: `金额异常：是平均值的 ${(item.details.amount / avgAmount).toFixed(1)} 倍`,
          severity: item.details.amount > avgAmount * 5 ? 'high' : 'medium',
        });
      }
    }

    // Check for new vendors with large amounts
    const vendorHistory = new Map<string, number>();
    Array.from(financialItems.values()).forEach(item => {
      vendorHistory.set(item.details.vendor, (vendorHistory.get(item.details.vendor) || 0) + 1);
    });

    recentItems.forEach(item => {
      if ((vendorHistory.get(item.details.vendor) || 0) === 1 && item.details.amount > 100) {
        unusual.push({
          item,
          reason: `首次交易：新供应商大额支出`,
          severity: 'medium',
        });
      }
    });

    return unusual.slice(0, 10);
  }

  /**
   * Get upcoming payment reminders
   */
  getUpcomingPayments(daysAhead: number = 7): FinancialItem[] {
    const now = new Date();
    const future = new Date(now.getTime() + daysAhead * 24 * 60 * 60 * 1000);

    return Array.from(financialItems.values())
      .filter(item =>
        item.status === 'pending' &&
        item.details.dueDate &&
        item.details.dueDate >= now &&
        item.details.dueDate <= future
      )
      .sort((a, b) => a.details.dueDate!.getTime() - b.details.dueDate!.getTime());
  }

  /**
   * Calculate subscription savings if cancelled
   */
  calculateSubscriptionSavings(subscriptionIds: string[]): {
    monthly: number;
    yearly: number;
    subscriptions: Subscription[];
  } {
    const subs = subscriptionIds
      .map(id => subscriptions.get(id))
      .filter((s): s is Subscription => s !== undefined && s.status === 'active');

    let monthlySavings = 0;
    subs.forEach(sub => {
      const monthly = sub.frequency === 'yearly' ? sub.amount / 12 :
                      sub.frequency === 'quarterly' ? sub.amount / 3 :
                      sub.amount;
      monthlySavings += monthly;
    });

    return {
      monthly: monthlySavings,
      yearly: monthlySavings * 12,
      subscriptions: subs,
    };
  }
}

export const financialTrackerService = new FinancialTrackerService();
