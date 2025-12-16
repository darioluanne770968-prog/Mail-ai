import React, { useState } from 'react';
import {
  Inbox, Archive, Reply, Trash2, Clock, AlertCircle,
  CheckCircle, ChevronRight, Filter, Zap
} from 'lucide-react';
import { Card, CardContent, Button, Badge, Loading } from '../ui';

interface ClassifiedEmail {
  id: string;
  subject: string;
  from: string;
  preview: string;
  classification: {
    category: string;
    priority: string;
    sentiment: string;
    isActionRequired: boolean;
  };
  suggestedAction?: string;
}

interface BatchResult {
  totalProcessed: number;
  processingTime: number;
  priorityGroups: {
    critical: ClassifiedEmail[];
    high: ClassifiedEmail[];
    medium: ClassifiedEmail[];
    low: ClassifiedEmail[];
  };
  actionRequired: ClassifiedEmail[];
  insights: {
    urgentCount: number;
    topSenders: Array<{ email: string; count: number }>;
    suggestedFocus: string[];
  };
}

export function BatchProcessor() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<BatchResult | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'critical' | 'high' | 'action'>('all');

  const processInbox = async () => {
    setIsProcessing(true);
    try {
      // In production, get actual emails and call API
      const response = await fetch('http://localhost:3000/api/v1/batch/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emails: [] }), // Would include actual emails
      });
      const data = await response.json();
      setResult(data.data);
    } catch (error) {
      // Demo data
      setResult({
        totalProcessed: 24,
        processingTime: 3200,
        priorityGroups: {
          critical: [
            {
              id: '1',
              subject: 'URGENT: Contract Review Required',
              from: 'legal@company.com',
              preview: 'Please review and sign the attached contract by EOD...',
              classification: {
                category: 'work',
                priority: 'critical',
                sentiment: 'urgent',
                isActionRequired: true,
              },
              suggestedAction: 'Review and respond today',
            },
          ],
          high: [
            {
              id: '2',
              subject: 'Project Update Meeting',
              from: 'manager@company.com',
              preview: 'Let\'s discuss the Q4 roadmap tomorrow...',
              classification: {
                category: 'meeting',
                priority: 'high',
                sentiment: 'neutral',
                isActionRequired: true,
              },
              suggestedAction: 'Confirm attendance',
            },
            {
              id: '3',
              subject: 'Client Feedback',
              from: 'client@external.com',
              preview: 'Thank you for the presentation. We have some questions...',
              classification: {
                category: 'work',
                priority: 'high',
                sentiment: 'positive',
                isActionRequired: true,
              },
              suggestedAction: 'Reply with answers',
            },
          ],
          medium: [
            {
              id: '4',
              subject: 'Weekly Newsletter',
              from: 'newsletter@tech.com',
              preview: 'This week in tech: AI breakthroughs and more...',
              classification: {
                category: 'newsletter',
                priority: 'medium',
                sentiment: 'neutral',
                isActionRequired: false,
              },
            },
          ],
          low: [
            {
              id: '5',
              subject: '50% Off Sale!',
              from: 'promo@store.com',
              preview: 'Don\'t miss our biggest sale of the year...',
              classification: {
                category: 'promotional',
                priority: 'low',
                sentiment: 'neutral',
                isActionRequired: false,
              },
            },
          ],
        },
        actionRequired: [],
        insights: {
          urgentCount: 3,
          topSenders: [
            { email: 'manager@company.com', count: 5 },
            { email: 'team@company.com', count: 3 },
          ],
          suggestedFocus: [
            '1 critical email needs immediate attention',
            '2 high priority emails require action',
            '3 emails are meeting-related',
          ],
        },
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'text-red-500 bg-red-50';
      case 'high': return 'text-orange-500 bg-orange-50';
      case 'medium': return 'text-blue-500 bg-blue-50';
      case 'low': return 'text-gray-500 bg-gray-50';
      default: return 'text-gray-500 bg-gray-50';
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'critical': return <Badge variant="error">Critical</Badge>;
      case 'high': return <Badge variant="warning">High</Badge>;
      case 'medium': return <Badge variant="info">Medium</Badge>;
      default: return <Badge>Low</Badge>;
    }
  };

  const getFilteredEmails = () => {
    if (!result) return [];
    switch (selectedCategory) {
      case 'critical':
        return result.priorityGroups.critical;
      case 'high':
        return result.priorityGroups.high;
      case 'action':
        return [...result.priorityGroups.critical, ...result.priorityGroups.high]
          .filter(e => e.classification.isActionRequired);
      default:
        return [
          ...result.priorityGroups.critical,
          ...result.priorityGroups.high,
          ...result.priorityGroups.medium,
          ...result.priorityGroups.low,
        ];
    }
  };

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-gray-800 flex items-center gap-2">
          <Inbox size={18} className="text-primary" />
          Smart Inbox
        </h3>
        <Button
          onClick={processInbox}
          isLoading={isProcessing}
          size="sm"
          leftIcon={<Zap size={14} />}
        >
          Process Inbox
        </Button>
      </div>

      {isProcessing && (
        <div className="py-8">
          <Loading text="Analyzing your emails..." />
        </div>
      )}

      {!isProcessing && result && (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-4 gap-2">
            <button
              onClick={() => setSelectedCategory('critical')}
              className={`p-3 rounded-lg text-center transition-all ${
                selectedCategory === 'critical' ? 'ring-2 ring-primary' : ''
              } ${getPriorityColor('critical')}`}
            >
              <div className="text-2xl font-bold">{result.priorityGroups.critical.length}</div>
              <div className="text-xs">Critical</div>
            </button>
            <button
              onClick={() => setSelectedCategory('high')}
              className={`p-3 rounded-lg text-center transition-all ${
                selectedCategory === 'high' ? 'ring-2 ring-primary' : ''
              } ${getPriorityColor('high')}`}
            >
              <div className="text-2xl font-bold">{result.priorityGroups.high.length}</div>
              <div className="text-xs">High</div>
            </button>
            <button
              onClick={() => setSelectedCategory('action')}
              className={`p-3 rounded-lg text-center transition-all ${
                selectedCategory === 'action' ? 'ring-2 ring-primary' : ''
              } bg-purple-50 text-purple-500`}
            >
              <div className="text-2xl font-bold">
                {result.priorityGroups.critical.length + result.priorityGroups.high.filter(e => e.classification.isActionRequired).length}
              </div>
              <div className="text-xs">Action</div>
            </button>
            <button
              onClick={() => setSelectedCategory('all')}
              className={`p-3 rounded-lg text-center transition-all ${
                selectedCategory === 'all' ? 'ring-2 ring-primary' : ''
              } bg-gray-50 text-gray-500`}
            >
              <div className="text-2xl font-bold">{result.totalProcessed}</div>
              <div className="text-xs">Total</div>
            </button>
          </div>

          {/* Insights */}
          <Card>
            <CardContent className="p-3">
              <h4 className="text-xs font-medium text-gray-500 mb-2">FOCUS AREAS</h4>
              <ul className="space-y-1">
                {result.insights.suggestedFocus.map((focus, i) => (
                  <li key={i} className="text-sm text-gray-600 flex items-center gap-2">
                    <AlertCircle size={12} className="text-primary" />
                    {focus}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          {/* Email List */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <Filter size={14} />
              <span>
                Showing {getFilteredEmails().length} emails
                {selectedCategory !== 'all' && ` (${selectedCategory})`}
              </span>
            </div>

            {getFilteredEmails().map((email) => (
              <Card key={email.id} hoverable>
                <CardContent className="p-3">
                  <div className="flex items-start gap-3">
                    <div className={`w-2 h-2 rounded-full mt-2 ${
                      email.classification.priority === 'critical' ? 'bg-red-500' :
                      email.classification.priority === 'high' ? 'bg-orange-500' :
                      'bg-blue-500'
                    }`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-gray-800 truncate">
                          {email.subject}
                        </span>
                        {getPriorityBadge(email.classification.priority)}
                      </div>
                      <div className="text-sm text-gray-500 mb-1">{email.from}</div>
                      <div className="text-sm text-gray-400 truncate">{email.preview}</div>

                      {email.suggestedAction && (
                        <div className="mt-2 flex items-center gap-2">
                          <span className="text-xs text-primary font-medium">
                            Suggested: {email.suggestedAction}
                          </span>
                        </div>
                      )}
                    </div>
                    <ChevronRight size={16} className="text-gray-300" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Quick Actions */}
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" leftIcon={<Archive size={14} />} className="flex-1">
              Archive Low Priority
            </Button>
            <Button variant="secondary" size="sm" leftIcon={<Trash2 size={14} />} className="flex-1">
              Delete Promotions
            </Button>
          </div>
        </>
      )}

      {!result && !isProcessing && (
        <div className="py-8 text-center text-gray-500">
          <Inbox size={40} className="mx-auto mb-2 text-gray-300" />
          <p>Click "Process Inbox" to analyze your emails</p>
          <p className="text-sm mt-1">AI will classify, prioritize, and suggest actions</p>
        </div>
      )}
    </div>
  );
}
