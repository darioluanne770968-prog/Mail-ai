import React, { useState, useEffect } from 'react';
import { Shield, AlertTriangle, CheckCircle, XCircle, FileText, Zap, Eye } from 'lucide-react';

interface ComplianceViolation {
  id: string;
  standard: string;
  severity: 'info' | 'warning' | 'violation' | 'critical';
  title: string;
  description: string;
  suggestedFix?: string;
  autoFixAvailable: boolean;
}

interface ComplianceResult {
  overallStatus: 'pass' | 'warning' | 'fail';
  score: number;
  violations: ComplianceViolation[];
  recommendations: string[];
  sensitiveDataFound: Array<{
    type: string;
    count: number;
  }>;
}

interface ComplianceCheckerProps {
  emailContent?: {
    subject: string;
    body: string;
    to: string[];
    cc?: string[];
  };
  onCheck?: (result: ComplianceResult) => void;
  onAutoFix?: (fixedContent: string) => void;
}

export function ComplianceChecker({ emailContent, onCheck, onAutoFix }: ComplianceCheckerProps) {
  const [result, setResult] = useState<ComplianceResult | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    if (emailContent && emailContent.body.length > 20) {
      checkCompliance();
    }
  }, [emailContent]);

  const checkCompliance = async () => {
    if (!emailContent) return;

    setIsChecking(true);
    try {
      const response = await fetch('/api/v1/ultra/compliance/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: {
            id: `check_${Date.now()}`,
            ...emailContent,
          },
        }),
      });
      const data = await response.json();
      setResult(data);
      if (onCheck) {
        onCheck(data);
      }
    } catch (error) {
      console.error('Failed to check compliance:', error);
    } finally {
      setIsChecking(false);
    }
  };

  const handleAutoFix = async () => {
    if (!result || !emailContent) return;

    try {
      const response = await fetch('/api/v1/ultra/compliance/auto-fix', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: emailContent.body,
          violations: result.violations.filter(v => v.autoFixAvailable),
        }),
      });
      const data = await response.json();
      if (onAutoFix && data.content) {
        onAutoFix(data.content);
      }
      // Re-check after fix
      checkCompliance();
    } catch (error) {
      console.error('Failed to auto-fix:', error);
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical':
        return <XCircle className="text-red-500" size={16} />;
      case 'violation':
        return <AlertTriangle className="text-orange-500" size={16} />;
      case 'warning':
        return <AlertTriangle className="text-yellow-500" size={16} />;
      default:
        return <Eye className="text-blue-500" size={16} />;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'bg-red-50 border-red-200';
      case 'violation':
        return 'bg-orange-50 border-orange-200';
      case 'warning':
        return 'bg-yellow-50 border-yellow-200';
      default:
        return 'bg-blue-50 border-blue-200';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pass':
        return 'from-green-400 to-emerald-500';
      case 'warning':
        return 'from-yellow-400 to-amber-500';
      case 'fail':
        return 'from-red-400 to-rose-500';
      default:
        return 'from-gray-400 to-gray-500';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'pass':
        return '通过';
      case 'warning':
        return '注意';
      case 'fail':
        return '不通过';
      default:
        return '未检查';
    }
  };

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Shield className="text-blue-500" size={20} />
          <h3 className="font-semibold">合规检查</h3>
        </div>
        {isChecking && (
          <div className="animate-spin w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full" />
        )}
      </div>

      {/* Result Summary */}
      {result && (
        <>
          <div className={`p-4 rounded-xl bg-gradient-to-r ${getStatusColor(result.overallStatus)} text-white`}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs opacity-80">合规状态</p>
                <p className="text-xl font-bold">{getStatusLabel(result.overallStatus)}</p>
              </div>
              <div className="text-right">
                <p className="text-3xl font-bold">{result.score}</p>
                <p className="text-xs opacity-80">分</p>
              </div>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-3 gap-2">
            <div className="p-2 bg-red-50 rounded-lg text-center">
              <p className="text-lg font-bold text-red-600">
                {result.violations.filter(v => v.severity === 'critical' || v.severity === 'violation').length}
              </p>
              <p className="text-xs text-gray-500">违规</p>
            </div>
            <div className="p-2 bg-yellow-50 rounded-lg text-center">
              <p className="text-lg font-bold text-yellow-600">
                {result.violations.filter(v => v.severity === 'warning').length}
              </p>
              <p className="text-xs text-gray-500">警告</p>
            </div>
            <div className="p-2 bg-blue-50 rounded-lg text-center">
              <p className="text-lg font-bold text-blue-600">
                {result.sensitiveDataFound.reduce((sum, d) => sum + d.count, 0)}
              </p>
              <p className="text-xs text-gray-500">敏感数据</p>
            </div>
          </div>

          {/* Sensitive Data Found */}
          {result.sensitiveDataFound.length > 0 && (
            <div className="p-3 bg-amber-50 rounded-lg border border-amber-200">
              <p className="text-sm font-medium text-amber-700 mb-2">检测到敏感数据:</p>
              <div className="flex flex-wrap gap-2">
                {result.sensitiveDataFound.map((data, i) => (
                  <span key={i} className="px-2 py-1 bg-amber-100 rounded text-xs text-amber-700">
                    {data.type}: {data.count}处
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Auto-Fix Button */}
          {result.violations.some(v => v.autoFixAvailable) && (
            <button
              onClick={handleAutoFix}
              className="w-full flex items-center justify-center gap-2 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
            >
              <Zap size={16} />
              一键脱敏修复
            </button>
          )}

          {/* Toggle Details */}
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="w-full flex items-center justify-center gap-1 py-2 text-sm text-gray-500 hover:text-gray-700"
          >
            <FileText size={14} />
            {showDetails ? '隐藏详情' : '查看详情'}
          </button>

          {/* Violation Details */}
          {showDetails && (
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {result.violations.length === 0 ? (
                <div className="text-center py-4 text-green-600">
                  <CheckCircle size={32} className="mx-auto mb-2" />
                  <p className="text-sm">未发现合规问题</p>
                </div>
              ) : (
                result.violations.map((violation) => (
                  <div
                    key={violation.id}
                    className={`p-3 rounded-lg border ${getSeverityColor(violation.severity)}`}
                  >
                    <div className="flex items-start gap-2">
                      {getSeverityIcon(violation.severity)}
                      <div className="flex-1">
                        <p className="text-sm font-medium">{violation.title}</p>
                        <p className="text-xs text-gray-600 mt-1">{violation.description}</p>
                        {violation.suggestedFix && (
                          <p className="text-xs text-blue-600 mt-1">
                            建议: {violation.suggestedFix}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* Recommendations */}
          {result.recommendations.length > 0 && showDetails && (
            <div className="p-3 bg-blue-50 rounded-lg">
              <p className="text-sm font-medium text-blue-700 mb-2">建议:</p>
              <ul className="text-xs text-gray-600 space-y-1">
                {result.recommendations.map((rec, i) => (
                  <li key={i}>• {rec}</li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}

      {/* No Content */}
      {!result && !isChecking && (
        <div className="text-center py-8 text-gray-500">
          <Shield size={32} className="mx-auto mb-2 opacity-50" />
          <p className="text-sm">输入邮件内容后自动检查合规性</p>
        </div>
      )}
    </div>
  );
}
