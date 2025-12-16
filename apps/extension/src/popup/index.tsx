import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Mail, Settings, BarChart3, ExternalLink, Zap } from 'lucide-react';
import { StorageService, type UsageStats } from '~/services/storage.service';
import { Button } from '~/components/ui';
import '~/styles/globals.css';

function Popup() {
  const [usage, setUsage] = useState<UsageStats | null>(null);
  const [isOnSupportedPage, setIsOnSupportedPage] = useState(false);

  useEffect(() => {
    // Load usage stats
    StorageService.getUsageStats().then(setUsage);

    // Check if on supported page
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const url = tabs[0]?.url || '';
      setIsOnSupportedPage(
        url.includes('mail.google.com') ||
        url.includes('outlook.live.com') ||
        url.includes('outlook.office.com')
      );
    });
  }, []);

  const openOptions = () => {
    chrome.runtime.openOptionsPage();
  };

  const openCurrentTab = () => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]?.id) {
        chrome.tabs.sendMessage(tabs[0].id, { type: 'TOGGLE_PANEL' });
        window.close();
      }
    });
  };

  return (
    <div className="w-[320px] bg-white">
      {/* Header */}
      <div className="bg-gradient-to-r from-primary to-purple-600 px-4 py-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
            <Mail size={24} className="text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-white">Mail AI</h1>
            <p className="text-xs text-white/80">Smart Email Assistant</p>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="p-4 space-y-3">
        {isOnSupportedPage ? (
          <Button
            className="w-full"
            onClick={openCurrentTab}
            leftIcon={<Zap size={16} />}
          >
            Open AI Panel
          </Button>
        ) : (
          <div className="p-4 bg-gray-50 rounded-lg text-center">
            <p className="text-sm text-gray-600">
              Open Gmail or Outlook to use Mail AI
            </p>
            <div className="flex gap-2 mt-3 justify-center">
              <a
                href="https://mail.google.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-primary hover:underline flex items-center gap-1"
              >
                Gmail <ExternalLink size={10} />
              </a>
              <span className="text-gray-300">|</span>
              <a
                href="https://outlook.live.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-primary hover:underline flex items-center gap-1"
              >
                Outlook <ExternalLink size={10} />
              </a>
            </div>
          </div>
        )}

        {/* Usage Stats */}
        {usage && (
          <div className="bg-gray-50 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-2">
              <BarChart3 size={14} className="text-gray-500" />
              <span className="text-xs font-medium text-gray-700">Usage Today</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-white rounded-md p-2 text-center">
                <div className="text-lg font-bold text-primary">{usage.dailyRequests}</div>
                <div className="text-xs text-gray-500">Requests</div>
              </div>
              <div className="bg-white rounded-md p-2 text-center">
                <div className="text-lg font-bold text-primary">
                  {usage.totalTokens > 1000
                    ? `${(usage.totalTokens / 1000).toFixed(1)}k`
                    : usage.totalTokens}
                </div>
                <div className="text-xs text-gray-500">Tokens</div>
              </div>
            </div>
          </div>
        )}

        {/* Settings Link */}
        <Button
          variant="secondary"
          className="w-full"
          onClick={openOptions}
          leftIcon={<Settings size={16} />}
        >
          Settings
        </Button>
      </div>

      {/* Footer */}
      <div className="px-4 py-3 border-t border-gray-100 bg-gray-50">
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-500">v1.0.0</span>
          <a
            href="https://github.com/mail-ai"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-primary hover:underline"
          >
            Help & Feedback
          </a>
        </div>
      </div>
    </div>
  );
}

const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(<Popup />);
}

export default Popup;
