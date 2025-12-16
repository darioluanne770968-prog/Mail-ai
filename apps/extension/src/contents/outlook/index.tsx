import type { PlasmoCSConfig } from 'plasmo';
import React, { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { Mail, X, MessageSquare, FileText, Wand2, Sparkles } from 'lucide-react';
import { useEmail, useAI, useSettings } from '~/hooks';
import { ReplyPanel, SummaryCard, ComposeAssist, ImprovePanel, Tabs } from '~/components';
import '~/styles/globals.css';

export const config: PlasmoCSConfig = {
  matches: ['https://outlook.live.com/*', 'https://outlook.office.com/*'],
  css: ['../../styles/globals.css'],
};

// Floating Action Button Component
function FloatingButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="fixed bottom-6 right-6 w-14 h-14 bg-gradient-to-r from-blue-500 to-blue-700 text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-300 flex items-center justify-center z-[9999] hover:scale-110"
      title="Open Mail AI"
    >
      <Mail size={24} />
    </button>
  );
}

// Main AI Panel Component (same as Gmail but with Outlook styling)
function AIPanel({ onClose }: { onClose: () => void }) {
  const [activeTab, setActiveTab] = useState<'reply' | 'summarize' | 'compose' | 'improve'>('reply');
  const { currentEmail, insertContent } = useEmail();
  const {
    generateReply,
    replyData,
    replyLoading,
    replyError,
    summarize,
    summarizeData,
    summarizeLoading,
    summarizeError,
    compose,
    composeData,
    composeLoading,
    composeError,
    improve,
    improveData,
    improveLoading,
    improveError,
  } = useAI();

  const tabs = [
    { id: 'reply', label: 'Reply', icon: <MessageSquare size={14} /> },
    { id: 'summarize', label: 'Summarize', icon: <FileText size={14} /> },
    { id: 'compose', label: 'Compose', icon: <Wand2 size={14} /> },
    { id: 'improve', label: 'Improve', icon: <Sparkles size={14} /> },
  ];

  const handleGenerateReply = async (params: { tone: any; length: any }) => {
    if (!currentEmail?.body) return;
    await generateReply({
      emailContent: currentEmail.body,
      threadContext: currentEmail.threadContext,
      tone: params.tone,
      length: params.length,
    });
  };

  const handleSummarize = async (type: 'single' | 'thread') => {
    if (!currentEmail?.body) return;
    await summarize({ emailContent: currentEmail.body, type });
  };

  const handleCompose = async (params: { description: string; tone: any; length: any }) => {
    await compose(params);
  };

  const handleImprove = async (params: { content: string; action: any; targetLanguage?: string }) => {
    await improve(params);
  };

  const handleInsert = (content: string) => {
    insertContent(content);
  };

  return (
    <div className="fixed top-0 right-0 h-full w-[420px] bg-white shadow-2xl z-[9999] flex flex-col animate-slide-in border-l border-gray-200">
      {/* Header - Outlook Blue Theme */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-gradient-to-r from-blue-500 to-blue-700">
        <div className="flex items-center gap-2">
          <Mail size={20} className="text-white" />
          <span className="font-semibold text-white">Mail AI for Outlook</span>
        </div>
        <button
          onClick={onClose}
          className="p-1 hover:bg-white/20 rounded-lg transition-colors"
        >
          <X size={20} className="text-white" />
        </button>
      </div>

      {/* Tabs */}
      <Tabs
        tabs={tabs}
        activeTab={activeTab}
        onTabChange={(id) => setActiveTab(id as any)}
      />

      {/* Content */}
      <div className="flex-1 overflow-y-auto mail-ai-scrollbar">
        {activeTab === 'reply' && (
          <ReplyPanel
            emailContent={currentEmail?.body || ''}
            threadContext={currentEmail?.threadContext}
            onGenerate={handleGenerateReply}
            onInsert={handleInsert}
            replies={replyData?.replies || []}
            isLoading={replyLoading === 'loading'}
            error={replyError}
          />
        )}

        {activeTab === 'summarize' && (
          <SummaryCard
            emailContent={currentEmail?.body || ''}
            onSummarize={handleSummarize}
            summary={summarizeData}
            isLoading={summarizeLoading === 'loading'}
            error={summarizeError}
            hasThread={!!currentEmail?.threadContext}
          />
        )}

        {activeTab === 'compose' && (
          <ComposeAssist
            onCompose={handleCompose}
            onInsert={handleInsert}
            result={composeData}
            isLoading={composeLoading === 'loading'}
            error={composeError}
          />
        )}

        {activeTab === 'improve' && (
          <ImprovePanel
            currentContent={currentEmail?.body || ''}
            onImprove={handleImprove}
            onInsert={handleInsert}
            result={improveData}
            isLoading={improveLoading === 'loading'}
            error={improveError}
          />
        )}
      </div>

      {/* Footer */}
      <div className="px-4 py-2 border-t border-gray-200 bg-gray-50">
        <p className="text-xs text-gray-500 text-center">
          Powered by AI • Your data is secure
        </p>
      </div>
    </div>
  );
}

// Main Content Script Component
function OutlookMailAI() {
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const { settings } = useSettings();

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.altKey && e.key.toLowerCase() === 'm') {
        e.preventDefault();
        setIsPanelOpen((prev) => !prev);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <>
      {settings.showFloatingButton && !isPanelOpen && (
        <FloatingButton onClick={() => setIsPanelOpen(true)} />
      )}
      {isPanelOpen && <AIPanel onClose={() => setIsPanelOpen(false)} />}
    </>
  );
}

// Mount the component
const container = document.createElement('div');
container.id = 'mail-ai-root';
document.body.appendChild(container);

const root = createRoot(container);
root.render(<OutlookMailAI />);

export default OutlookMailAI;
