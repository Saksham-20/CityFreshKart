import React, { useState, useEffect } from 'react';
import { X, Download } from 'lucide-react';
import { isAppInstalled } from '../../utils/pwa';

/**
 * InstallPrompt Component
 * Prompts users to install the app on their device
 */
const InstallPrompt = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [isInstalled, setIsInstalled] = useState(true);
  const [deferredPrompt, setDeferredPrompt] = useState(null);

  useEffect(() => {
    const installed = isAppInstalled();
    setIsInstalled(installed);

    const isMobileViewport = window.matchMedia('(max-width: 767px)').matches;
    const dismissedAt = Number(localStorage.getItem('cityfreshkart-install-dismissed-at') || 0);
    const dismissedRecently = Date.now() - dismissedAt < 7 * 24 * 60 * 60 * 1000;

    const onBeforeInstallPrompt = (e) => {
      if (installed || !isMobileViewport || dismissedRecently) return;
      e.preventDefault();
      setDeferredPrompt(e);
      setIsVisible(true);
    };

    const onInstalled = () => {
      setIsInstalled(true);
      setIsVisible(false);
      setDeferredPrompt(null);
      localStorage.setItem('cityfreshkart-app-installed', 'true');
    };

    window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt);
    window.addEventListener('appinstalled', onInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  const dismissPrompt = () => {
    localStorage.setItem('cityfreshkart-install-dismissed-at', String(Date.now()));
    setIsVisible(false);
  };

  const onInstall = async () => {
    if (!deferredPrompt) {
      setIsVisible(false);
      return;
    }
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome !== 'accepted') {
      dismissPrompt();
    }
    setDeferredPrompt(null);
  };

  if (isInstalled || !isVisible) {
    return null;
  }

  return (
    <div
      id="install-banner"
      data-testid="install-banner"
      className="fixed bottom-[5.5rem] left-3 right-3 bg-green-600 text-white rounded-2xl shadow-lg p-4 flex flex-col gap-3 z-40 border border-green-700 md:hidden"
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
          onClick={onInstall}
          className="flex-1 px-3 py-2 rounded-lg text-sm font-semibold bg-white text-green-600 hover:bg-green-50 active:bg-green-100 transition-colors duration-200"
        >
          Install
        </button>
        <button
          onClick={dismissPrompt}
          className="px-3 py-2 rounded-lg text-sm font-semibold bg-green-700 hover:bg-green-800 transition-colors duration-200"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

export default InstallPrompt;
