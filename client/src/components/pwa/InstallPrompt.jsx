import React, { useState, useEffect } from 'react';
import { X, Download } from 'lucide-react';
import {
  handleInstallClick,
  isAppInstalled,
  isInstallPromptAvailable,
  onInstallPromptChange,
} from '../../utils/pwa';
import { cn } from '../../utils/cn';

/**
 * InstallPrompt Component
 * Prompts users to install the app on their device
 */
const InstallPrompt = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    const installed = isAppInstalled();
    setIsInstalled(installed);
    setIsVisible(!installed && isInstallPromptAvailable());

    const unsubscribe = onInstallPromptChange((available) => {
      if (!isAppInstalled()) {
        setIsVisible(available);
      }
    });

    return () => unsubscribe();
  }, []);

  if (isInstalled || !isVisible) {
    return null;
  }

  return (
    <div
      id="install-banner"
      className={cn(
        'fixed left-4 right-4 sm:left-auto sm:right-6 sm:w-80',
        'bg-green-600 text-white rounded-2xl shadow-lg',
        'p-4 flex flex-col gap-3 z-30',
        'border border-green-700'
      )}
      style={{ bottom: 'calc(env(safe-area-inset-bottom) + 5.5rem)' }}
    >
      <div className="flex items-start gap-3">
        <Download className="w-5 h-5 flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <h3 className="font-semibold text-sm">
            Install City Fresh Kart
          </h3>
          <p className="text-xs text-green-50 mt-1">
            Get faster access to fresh groceries. Install as an app!
          </p>
        </div>
      </div>
      <div className="flex gap-2">
        <button
          onClick={async () => {
            await handleInstallClick();
            setIsVisible(false);
          }}
          className={cn(
            'flex-1 px-3 py-2 rounded-lg text-sm font-semibold',
            'bg-white text-green-600',
            'hover:bg-green-50 active:bg-green-100',
            'transition-colors duration-200'
          )}
        >
          Install
        </button>
        <button
          onClick={() => setIsVisible(false)}
          className={cn(
            'px-3 py-2 rounded-lg text-sm font-semibold',
            'bg-green-700 hover:bg-green-800',
            'transition-colors duration-200'
          )}
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

export default InstallPrompt;
