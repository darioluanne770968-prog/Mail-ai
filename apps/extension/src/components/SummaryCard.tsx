import React, { useState } from 'react';
import { FileText, ListChecks, Users, Calendar, Copy, Check } from 'lucide-react';
import { Button, Card, CardContent, Loading, Badge } from './ui';
import type { AISummarizeResponse } from '~/types';

interface SummaryCardProps {
  emailContent: string;
  onSummarize: (type: 'single' | 'thread') => Promise<void>;
  summary: AISummarizeResponse | null;
  isLoading: boolean;
  error?: string | null;
  hasThread?: boolean;
}

export function SummaryCard({
  emailContent,
  onSummarize,
  summary,
  isLoading,
  error,
  hasThread,
}: SummaryCardProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (!summary) return;

    const text = `Summary: ${summary.summary}\n\nKey Points:\n${summary.keyPoints.map((p) => `- ${p}`).join('\n')}\n\nAction Items:\n${summary.actionItems.map((a) => `- ${a}`).join('\n')}`;

    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!emailContent) {
    return (
      <div className="p-6 text-center text-gray-500">
        <p>No email selected.</p>
        <p className="text-sm mt-2">Open an email to generate a summary.</p>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      {/* Actions */}
      <div className="flex gap-2">
        <Button
          className="flex-1"
          onClick={() => onSummarize('single')}
          isLoading={isLoading}
          disabled={isLoading}
          leftIcon={<FileText size={16} />}
        >
          Summarize Email
        </Button>
        {hasThread && (
          <Button
            variant="secondary"
            className="flex-1"
            onClick={() => onSummarize('thread')}
            isLoading={isLoading}
            disabled={isLoading}
            leftIcon={<ListChecks size={16} />}
          >
            Summarize Thread
          </Button>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
          {error}
        </div>
      )}

      {/* Loading */}
      {isLoading && (
        <div className="py-8">
          <Loading text="Analyzing email..." />
        </div>
      )}

      {/* Results */}
      {!isLoading && summary && (
        <div className="space-y-4">
          {/* Summary */}
          <Card>
            <CardContent>
              <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                <FileText size={14} />
                Summary
              </h4>
              <p className="text-sm text-gray-600">{summary.summary}</p>
            </CardContent>
          </Card>

          {/* Key Points */}
          {summary.keyPoints.length > 0 && (
            <Card>
              <CardContent>
                <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                  <ListChecks size={14} />
                  Key Points
                </h4>
                <ul className="space-y-1">
                  {summary.keyPoints.map((point, i) => (
                    <li key={i} className="text-sm text-gray-600 flex items-start gap-2">
                      <span className="text-primary mt-1">•</span>
                      {point}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {/* Action Items */}
          {summary.actionItems.length > 0 && (
            <Card>
              <CardContent>
                <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                  <ListChecks size={14} className="text-orange-500" />
                  Action Items
                </h4>
                <ul className="space-y-1">
                  {summary.actionItems.map((item, i) => (
                    <li key={i} className="text-sm text-gray-600 flex items-start gap-2">
                      <input type="checkbox" className="mt-1 rounded" />
                      {item}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {/* Entities */}
          {(summary.entities.people.length > 0 ||
            summary.entities.dates.length > 0 ||
            summary.entities.deadlines.length > 0) && (
            <Card>
              <CardContent>
                <h4 className="text-sm font-medium text-gray-700 mb-2">Extracted Info</h4>
                <div className="flex flex-wrap gap-2">
                  {summary.entities.people.map((person, i) => (
                    <Badge key={`person-${i}`} variant="info">
                      <Users size={10} className="mr-1" />
                      {person}
                    </Badge>
                  ))}
                  {summary.entities.dates.map((date, i) => (
                    <Badge key={`date-${i}`} variant="default">
                      <Calendar size={10} className="mr-1" />
                      {date}
                    </Badge>
                  ))}
                  {summary.entities.deadlines.map((deadline, i) => (
                    <Badge key={`deadline-${i}`} variant="warning">
                      {deadline}
                    </Badge>
                  ))}
                  {summary.entities.amounts.map((amount, i) => (
                    <Badge key={`amount-${i}`} variant="success">
                      {amount}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Copy Button */}
          <Button
            variant="secondary"
            className="w-full"
            onClick={handleCopy}
            leftIcon={copied ? <Check size={16} /> : <Copy size={16} />}
          >
            {copied ? 'Copied!' : 'Copy Summary'}
          </Button>
        </div>
      )}
    </div>
  );
}
