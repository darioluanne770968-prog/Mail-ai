import { Storage } from '@plasmohq/storage';

const storage = new Storage();

// Listen for installation
chrome.runtime.onInstalled.addListener(async (details) => {
  if (details.reason === 'install') {
    console.log('Mail AI Extension installed!');

    // Set default settings
    await storage.set('mail-ai-settings', {
      aiProvider: 'openai',
      defaultTone: 'formal',
      defaultLength: 'medium',
      defaultLanguage: 'auto',
      theme: 'light',
      showFloatingButton: true,
      floatingButtonPosition: 'bottom-right',
      panelWidth: 400,
      shortcuts: {
        openPanel: 'Alt+M',
        generateReply: 'Alt+R',
        summarize: 'Alt+S',
        improve: 'Alt+I',
        translate: 'Alt+T',
      },
      features: {
        smartReply: true,
        emailSummary: true,
        grammarCheck: true,
        translation: true,
        sentimentAnalysis: true,
        autoSuggest: false,
      },
      customTemplates: [],
      privacy: {
        sendAnalytics: false,
        storeHistory: true,
        historyRetentionDays: 30,
      },
    });

    // Open options page for initial setup
    chrome.runtime.openOptionsPage();
  }
});

// Handle messages from content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'GET_SETTINGS') {
    storage.get('mail-ai-settings').then((settings) => {
      sendResponse({ settings });
    });
    return true; // Keep the message channel open for async response
  }

  if (message.type === 'SAVE_SETTINGS') {
    storage.set('mail-ai-settings', message.settings).then(() => {
      sendResponse({ success: true });
    });
    return true;
  }

  if (message.type === 'GET_API_KEY') {
    storage.get('mail-ai-api-key').then((apiKey) => {
      sendResponse({ apiKey });
    });
    return true;
  }

  if (message.type === 'SAVE_API_KEY') {
    storage.set('mail-ai-api-key', message.apiKey).then(() => {
      sendResponse({ success: true });
    });
    return true;
  }

  if (message.type === 'GET_USAGE') {
    storage.get('mail-ai-usage').then((usage) => {
      sendResponse({ usage });
    });
    return true;
  }

  if (message.type === 'INCREMENT_USAGE') {
    storage.get('mail-ai-usage').then(async (usage) => {
      const newUsage = {
        totalRequests: (usage?.totalRequests || 0) + 1,
        totalTokens: (usage?.totalTokens || 0) + (message.tokens || 0),
        lastResetDate: usage?.lastResetDate || new Date().toISOString().split('T')[0],
        dailyRequests: (usage?.dailyRequests || 0) + 1,
      };
      await storage.set('mail-ai-usage', newUsage);
      sendResponse({ success: true, usage: newUsage });
    });
    return true;
  }
});

// Handle keyboard commands
chrome.commands?.onCommand?.addListener((command) => {
  if (command === 'toggle-panel') {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]?.id) {
        chrome.tabs.sendMessage(tabs[0].id, { type: 'TOGGLE_PANEL' });
      }
    });
  }
});

// Context menu for selected text
chrome.contextMenus?.create?.({
  id: 'mail-ai-improve',
  title: 'Improve with Mail AI',
  contexts: ['selection'],
});

chrome.contextMenus?.onClicked?.addListener((info, tab) => {
  if (info.menuItemId === 'mail-ai-improve' && tab?.id) {
    chrome.tabs.sendMessage(tab.id, {
      type: 'IMPROVE_SELECTION',
      text: info.selectionText,
    });
  }
});

export {};
