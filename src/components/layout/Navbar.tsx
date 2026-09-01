import React from 'react';
import type { TabType } from '../../types';
import { TABS } from '../../navigation/navigationConfig';

interface NavbarProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ activeTab, onTabChange }) => {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-30 bg-surface-bg/90 backdrop-blur-md border-t border-surface-border py-2 px-4">
      <div className="max-w-md mx-auto flex justify-between items-center">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`flex flex-col items-center justify-center w-16 py-1 transition-all duration-200 rounded-xl ${
                isActive
                  ? 'text-brand font-semibold scale-105'
                  : 'text-gray-400 hover:text-gray-200 active:scale-95'
              }`}
            >
              <div className={`p-1 rounded-lg transition-colors ${isActive ? 'bg-brand-subtle' : ''}`}>
                <Icon size={22} className={isActive ? 'text-brand' : 'text-gray-400'} />
              </div>
              <span className="text-[10px] mt-1 tracking-wide">{tab.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};