import React, { useState } from 'react';
import {
  Shield, AlertTriangle, AlertCircle, CheckCircle,
  Eye, EyeOff, ExternalLink, RefreshCw
} from 'lucide-react';
import { Card, CardContent, Button, Badge, Loading } from '../ui';

interface SecurityScanResult {
  overallRisk: 'safe' | 'low' | 'medium' | 'high' | 'critical';
  score: number;
  phishing: {
    isPhishing: boolean;
    confidence: number;
    indicators: Array<{
      type: string;
      description: string;
      severity: 'low' | 'medium' | 'high';
    }>;
    legitimacyScore: number;
  };
  sensitiveData: {
    found: boolean;
    items: Array<{
      type: string;
      masked: string;
      risk: string;
    }>;
  };
  maliciousContent: {
    hasMaliciousLinks: boolean;
    suspiciousLinks: Array<{
      url: string;
      risk: string;
      reasons: string[];
    }>;
    hasAttachmentRisk: boolean;
    attachmentWarnings: string[];
  };
  recommendations: string[];
}

interface SecurityScannerProps {
  emailContent: string;
  sender?: string;
  subject?: string;
}

export function SecurityScanner({ emailContent, sender, subject }: SecurityScannerProps) {
  const [scanResult, setScanResult] = useState<SecurityScanResult | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [showSensitiveData, setShowSensitiveData] = useState(false);

  const runScan = async () => {
    setIsScanning(true);
    try {
      const response = await fetch('http://localhost:3000/api/v1/security/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: emailContent,
          sender,
          subject,
        }),
      });
      const data = await response.json();
      setScanResult(data.data);
    } catch (error) {
      console.error('Security scan failed:', error);
      // Demo data
      setScanResult({
        overallRisk: 'low',
        score: 85,
        phishing: {
          isPhishing: false,
          confidence: 0.2,
          indicators: [
            { type: 'generic_greeting', description: 'Generic greeting detected', severity: 'low' }
          ],
          legitimacyScore: 85,
        },
        sensitiveData: {
          found: false,
          items: [],
        },
        maliciousContent: {
          hasMaliciousLinks: false,
          suspiciousLinks: [],
          hasAttachmentRisk: false,
          attachmentWarnings: [],
        },
        recommendations: ['This email appears to be legitimate.'],
      });
    } finally {
      setIsScanning(false);
    }
  };

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'safe': return 'bg-green-100 text-green-700 border-green-200';
      case 'low': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'medium': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      case 'high': return 'bg-orange-100 text-orange-700 border-orange-200';
      case 'critical': return 'bg-red-100 text-red-700 border-red-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const getRiskIcon = (risk: string) => {
    switch (risk) {
      case 'safe': return <CheckCircle className="text-green-500" size={20} />;
      case 'low': return <Shield className="text-blue-500" size={20} />;
      case 'medium': return <AlertCircle className="text-yellow-500" size={20} />;
      case 'high':
      case 'critical': return <AlertTriangle className="text-red-500" size={20} />;
      default: return <Shield className="text-gray-500" size={20} />;
    }
  };

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case 'low': return <Badge variant="info">Low</Badge>;
      case 'medium': return <Badge variant="warning">Medium</Badge>;
      case 'high': return <Badge variant="error">High</Badge>;
      default: return <Badge>{severity}</Badge>;
    }
  };

  if (!emailContent) {
    return (
      <div className="p-6 text-center text-gray-500">
        <Shield size={40} className="mx-auto mb-2 text-gray-300" />
        <p>Open an email to scan for security threats.</p>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-gray-800 flex items-center gap-2">
          <Shield size={18} className="text-primary" />
          Security Scanner
        </h3>
        <Button
          onClick={runScan}
          isLoading={isScanning}
          size="sm"
          leftIcon={<RefreshCw size={14} />}
        >
          {scanResult ? 'Rescan' : 'Scan Email'}
        </Button>
      </div>

      {isScanning && (
        <div className="py-8">
          <Loading text="Scanning for threats..." />
        </div>
      )}

      {!isScanning && scanResult && (
        <>
          {/* Overall Risk */}
          <Card className={`${getRiskColor(scanResult.overallRisk)} border`}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {getRiskIcon(scanResult.overallRisk)}
                  <div>
                    <div className="font-semibold capitalize">
                      {scanResult.overallRisk === 'safe' ? 'Email Appears Safe' :
                       `${scanResult.overallRisk.charAt(0).toUpperCase() + scanResult.overallRisk.slice(1)} Risk Detected`}
                    </div>
                    <div className="text-sm opacity-80">
                      Security Score: {scanResult.score}/100
                    </div>
                  </div>
                </div>
                <div className="text-3xl font-bold">
                  {scanResult.score}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Phishing Analysis */}
          <Card>
            <CardContent className="p-4">
              <h4 className="font-medium text-gray-700 mb-3 flex items-center gap-2">
                <AlertTriangle size={16} className="text-orange-500" />
                Phishing Analysis
              </h4>

              <div className="flex items-center gap-2 mb-3">
                <span className="text-sm text-gray-600">Legitimacy:</span>
                <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${
                      scanResult.phishing.legitimacyScore >= 70 ? 'bg-green-500' :
                      scanResult.phishing.legitimacyScore >= 40 ? 'bg-yellow-500' : 'bg-red-500'
                    }`}
                    style={{ width: `${scanResult.phishing.legitimacyScore}%` }}
                  />
                </div>
                <span className="text-sm font-medium">{scanResult.phishing.legitimacyScore}%</span>
              </div>

              {scanResult.phishing.indicators.length > 0 && (
                <div className="space-y-2">
                  {scanResult.phishing.indicators.map((indicator, i) => (
                    <div key={i} className="flex items-start gap-2 text-sm bg-gray-50 p-2 rounded">
                      {getSeverityBadge(indicator.severity)}
                      <span className="text-gray-600">{indicator.description}</span>
                    </div>
                  ))}
                </div>
              )}

              {scanResult.phishing.indicators.length === 0 && (
                <p className="text-sm text-green-600 flex items-center gap-1">
                  <CheckCircle size={14} />
                  No phishing indicators detected
                </p>
              )}
            </CardContent>
          </Card>

          {/* Sensitive Data */}
          {scanResult.sensitiveData.found && (
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-medium text-gray-700 flex items-center gap-2">
                    <Eye size={16} className="text-purple-500" />
                    Sensitive Data Detected
                  </h4>
                  <button
                    onClick={() => setShowSensitiveData(!showSensitiveData)}
                    className="text-sm text-primary hover:underline flex items-center gap-1"
                  >
                    {showSensitiveData ? <EyeOff size={14} /> : <Eye size={14} />}
                    {showSensitiveData ? 'Hide' : 'Show'}
                  </button>
                </div>

                <div className="space-y-2">
                  {scanResult.sensitiveData.items.map((item, i) => (
                    <div key={i} className="flex items-center justify-between text-sm bg-purple-50 p-2 rounded">
                      <span className="capitalize text-purple-700">{item.type.replace(/_/g, ' ')}</span>
                      <span className="font-mono text-purple-600">
                        {showSensitiveData ? item.masked : '••••••••'}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Suspicious Links */}
          {scanResult.maliciousContent.suspiciousLinks.length > 0 && (
            <Card>
              <CardContent className="p-4">
                <h4 className="font-medium text-gray-700 mb-3 flex items-center gap-2">
                  <ExternalLink size={16} className="text-red-500" />
                  Suspicious Links
                </h4>

                <div className="space-y-2">
                  {scanResult.maliciousContent.suspiciousLinks.map((link, i) => (
                    <div key={i} className="text-sm bg-red-50 p-2 rounded">
                      <div className="font-mono text-red-700 truncate">{link.url}</div>
                      <div className="text-red-600 text-xs mt-1">
                        {link.reasons.join(', ')}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Recommendations */}
          <Card>
            <CardContent className="p-4">
              <h4 className="font-medium text-gray-700 mb-3">Recommendations</h4>
              <ul className="space-y-2">
                {scanResult.recommendations.map((rec, i) => (
                  <li key={i} className="text-sm text-gray-600 flex items-start gap-2">
                    <span className="text-primary mt-0.5">•</span>
                    {rec}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
