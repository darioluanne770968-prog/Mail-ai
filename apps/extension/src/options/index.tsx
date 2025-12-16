import React, { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import {
  Mail,
  Key,
  Palette,
  Keyboard,
  Shield,
  Save,
  RotateCcw,
  Check,
  AlertCircle,
} from 'lucide-react';
import { useSettings } from '~/hooks';
import { StorageService } from '~/services/storage.service';
import { Button, Select, Card, CardContent } from '~/components/ui';
import type { ToneType, LengthType, AIProvider } from '~/types';
import '~/styles/globals.css';

type SettingsTab = 'general' | 'api' | 'shortcuts' | 'privacy';

function OptionsPage() {
  const { settings, updateSettings, resetSettings, isLoading } = useSettings();
  const [activeTab, setActiveTab] = useState<SettingsTab>('general');
  const [apiKey, setApiKey] = useState('');
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

  useEffect(() => {
    StorageService.getApiKey().then((key) => {
      if (key) setApiKey(key);
    });
  }, []);

  const handleSaveApiKey = async () => {
    setSaveStatus('saving');
    try {
      await StorageService.saveApiKey(apiKey);
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch {
      setSaveStatus('error');
    }
  };

  const handleReset = async () => {
    if (confirm('Are you sure you want to reset all settings to default?')) {
      await resetSettings();
    }
  };

  const tabs = [
    { id: 'general', label: 'General', icon: <Palette size={16} /> },
    { id: 'api', label: 'API Settings', icon: <Key size={16} /> },
    { id: 'shortcuts', label: 'Shortcuts', icon: <Keyboard size={16} /> },
    { id: 'privacy', label: 'Privacy', icon: <Shield size={16} /> },
  ];

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="mail-ai-loading" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-primary to-purple-600 px-8 py-6">
        <div className="max-w-4xl mx-auto flex items-center gap-4">
          <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
            <Mail size={28} className="text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Mail AI Settings</h1>
            <p className="text-white/80">Configure your email assistant</p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-8 py-6">
        <div className="flex gap-6">
          {/* Sidebar */}
          <div className="w-48 space-y-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as SettingsTab)}
                className={`w-full flex items-center gap-3 px-4 py-2 rounded-lg text-left transition-colors ${
                  activeTab === tab.id
                    ? 'bg-primary text-white'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                {tab.icon}
                <span className="text-sm font-medium">{tab.label}</span>
              </button>
            ))}
          </div>

          {/* Main Content */}
          <div className="flex-1">
            {activeTab === 'general' && (
              <div className="space-y-6">
                <Card>
                  <CardContent className="p-6 space-y-4">
                    <h3 className="text-lg font-semibold text-gray-800">AI Provider</h3>

                    <Select
                      label="Default AI Provider"
                      options={[
                        { value: 'openai', label: 'OpenAI (GPT-4/3.5)' },
                        { value: 'anthropic', label: 'Anthropic (Claude)' },
                      ]}
                      value={settings.aiProvider}
                      onChange={(value) => updateSettings({ aiProvider: value as AIProvider })}
                    />

                    <Select
                      label="Default Tone"
                      options={[
                        { value: 'formal', label: 'Formal' },
                        { value: 'friendly', label: 'Friendly' },
                        { value: 'concise', label: 'Concise' },
                        { value: 'detailed', label: 'Detailed' },
                        { value: 'casual', label: 'Casual' },
                      ]}
                      value={settings.defaultTone}
                      onChange={(value) => updateSettings({ defaultTone: value as ToneType })}
                    />

                    <Select
                      label="Default Length"
                      options={[
                        { value: 'short', label: 'Short (1-2 sentences)' },
                        { value: 'medium', label: 'Medium (1 paragraph)' },
                        { value: 'long', label: 'Long (multiple paragraphs)' },
                      ]}
                      value={settings.defaultLength}
                      onChange={(value) => updateSettings({ defaultLength: value as LengthType })}
                    />

                    <Select
                      label="Default Language"
                      options={[
                        { value: 'auto', label: 'Auto-detect' },
                        { value: 'en', label: 'English' },
                        { value: 'zh', label: 'Chinese' },
                        { value: 'es', label: 'Spanish' },
                        { value: 'fr', label: 'French' },
                        { value: 'de', label: 'German' },
                        { value: 'ja', label: 'Japanese' },
                      ]}
                      value={settings.defaultLanguage}
                      onChange={(value) => updateSettings({ defaultLanguage: value })}
                    />
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6 space-y-4">
                    <h3 className="text-lg font-semibold text-gray-800">Display Settings</h3>

                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-700">Show Floating Button</p>
                        <p className="text-xs text-gray-500">Display AI button on Gmail/Outlook</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={settings.showFloatingButton}
                          onChange={(e) => updateSettings({ showFloatingButton: e.target.checked })}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                      </label>
                    </div>

                    <Select
                      label="Button Position"
                      options={[
                        { value: 'bottom-right', label: 'Bottom Right' },
                        { value: 'bottom-left', label: 'Bottom Left' },
                        { value: 'top-right', label: 'Top Right' },
                        { value: 'top-left', label: 'Top Left' },
                      ]}
                      value={settings.floatingButtonPosition}
                      onChange={(value) => updateSettings({ floatingButtonPosition: value as any })}
                    />
                  </CardContent>
                </Card>
              </div>
            )}

            {activeTab === 'api' && (
              <Card>
                <CardContent className="p-6 space-y-4">
                  <h3 className="text-lg font-semibold text-gray-800">API Configuration</h3>
                  <p className="text-sm text-gray-600">
                    Enter your API key to use your own quota. Your key is stored locally and never sent to our servers.
                  </p>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">
                      {settings.aiProvider === 'openai' ? 'OpenAI' : 'Anthropic'} API Key
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="password"
                        value={apiKey}
                        onChange={(e) => setApiKey(e.target.value)}
                        placeholder={settings.aiProvider === 'openai' ? 'sk-...' : 'sk-ant-...'}
                        className="mail-ai-input flex-1"
                      />
                      <Button
                        onClick={handleSaveApiKey}
                        isLoading={saveStatus === 'saving'}
                        leftIcon={saveStatus === 'saved' ? <Check size={16} /> : <Save size={16} />}
                      >
                        {saveStatus === 'saved' ? 'Saved!' : 'Save'}
                      </Button>
                    </div>
                    {saveStatus === 'error' && (
                      <p className="text-xs text-red-500 flex items-center gap-1">
                        <AlertCircle size={12} />
                        Failed to save API key
                      </p>
                    )}
                  </div>

                  <div className="pt-4 border-t border-gray-200">
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Get an API Key</h4>
                    <div className="space-y-2">
                      <a
                        href="https://platform.openai.com/api-keys"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-primary hover:underline block"
                      >
                        OpenAI API Keys →
                      </a>
                      <a
                        href="https://console.anthropic.com/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-primary hover:underline block"
                      >
                        Anthropic Console →
                      </a>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {activeTab === 'shortcuts' && (
              <Card>
                <CardContent className="p-6 space-y-4">
                  <h3 className="text-lg font-semibold text-gray-800">Keyboard Shortcuts</h3>
                  <p className="text-sm text-gray-600">
                    Customize keyboard shortcuts for quick access to features.
                  </p>

                  <div className="space-y-3">
                    {Object.entries(settings.shortcuts).map(([key, value]) => (
                      <div key={key} className="flex items-center justify-between py-2 border-b border-gray-100">
                        <span className="text-sm text-gray-700 capitalize">
                          {key.replace(/([A-Z])/g, ' $1').trim()}
                        </span>
                        <kbd className="px-3 py-1 bg-gray-100 rounded text-sm font-mono text-gray-600">
                          {value}
                        </kbd>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {activeTab === 'privacy' && (
              <Card>
                <CardContent className="p-6 space-y-4">
                  <h3 className="text-lg font-semibold text-gray-800">Privacy Settings</h3>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-700">Store History</p>
                        <p className="text-xs text-gray-500">Save generated content locally</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={settings.privacy.storeHistory}
                          onChange={(e) =>
                            updateSettings({
                              privacy: { ...settings.privacy, storeHistory: e.target.checked },
                            })
                          }
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                      </label>
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-700">Send Analytics</p>
                        <p className="text-xs text-gray-500">Help improve Mail AI (anonymous)</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={settings.privacy.sendAnalytics}
                          onChange={(e) =>
                            updateSettings({
                              privacy: { ...settings.privacy, sendAnalytics: e.target.checked },
                            })
                          }
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                      </label>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-gray-200">
                    <Button
                      variant="danger"
                      onClick={handleReset}
                      leftIcon={<RotateCcw size={16} />}
                    >
                      Reset All Settings
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(<OptionsPage />);
}

export default OptionsPage;
