import React from 'react';
import { clsx } from 'clsx';

interface Tab {
  id: string;
  label: string;
  icon?: React.ReactNode;
}

interface TabsProps {
  tabs: Tab[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
}

export function Tabs({ tabs, activeTab, onTabChange }: TabsProps) {
  return (
    <div className="flex border-b border-gray-200">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          className={clsx(
            'flex items-center gap-2 px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px',
            activeTab === tab.id
              ? 'text-primary border-primary'
              : 'text-gray-500 border-transparent hover:text-gray-700 hover:border-gray-300'
          )}
          onClick={() => onTabChange(tab.id)}
        >
          {tab.icon}
          {tab.label}
        </button>
      ))}
    </div>
  );
}
