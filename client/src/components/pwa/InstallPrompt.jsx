import React, { useState, useEffect } from 'react';
import { X, Download, Smartphone } from 'lucide-react';
import {
  handleInstallClick,
  isAppInstalled,
  isInstallPromptAvailable,
  onInstallPromptChange,
  shouldShowIOSInstallHelp,
} from '../../utils/pwa';
import { cn } from '../../utils/cn';

const SESSION_DISMISS_KEY = 'cfk-install-banner-dismissed';

/**
 * Install prompt: Android/Chrome uses beforeinstallprompt; iOS shows Add to Home Screen steps.
 */
const InstallPrompt = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [hasAndroidPrompt, setHasAndroidPrompt] = useState(false);
  const [iosHelp, setIosHelp] = useState(false);
  const [iosModalOpen, setIosModalOpen] = useState(false);

  useEffect(() => {
    const installed = isAppInstalled();
    setIsInstalled(installed);
    if (installed || sessionStorage.getItem(SESSION_DISMISS_KEY) === '1') {
      setIsVisible(false);
      return;
    }

    const android = isInstallPromptAvailable();
    const ios = shouldShowIOSInstallHelp();
    setHasAndroidPrompt(android);
    setIosHelp(ios);
    setIsVisible(android || ios);

    const unsubscribe = onInstallPromptChange((available) => {
      if (isAppInstalled() || sessionStorage.getItem(SESSION_DISMISS_KEY) === '1') {
        setIsVisible(false);
        return;
      }
      setHasAndroidPrompt(available);
      setIosHelp(shouldShowIOSInstallHelp());
      setIsVisible(available || shouldShowIOSInstallHelp());
    });

    return () => unsubscribe();
  }, []);

  const dismiss = () => {
    sessionStorage.setItem(SESSION_DISMISS_KEY, '1');
    setIsVisible(false);
    setIosModalOpen(false);
  };

  if (isInstalled || !isVisible) {
    return null;
  }

  const showAndroidUi = hasAndroidPrompt;
  const showIosUi = iosHelp && !hasAndroidPrompt;

  return (
    <>
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
              {showAndroidUi
                ? 'Faster access and offline support — install as an app (Chrome / Android).'
                : 'On iPhone and iPad: add this site to your Home Screen for an app-like experience.'}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          {showAndroidUi && (
            <button
              type="button"
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
          )}
          {showIosUi && (
            <button
              type="button"
              onClick={() => setIosModalOpen(true)}
              className={cn(
                'flex-1 px-3 py-2 rounded-lg text-sm font-semibold',
                'bg-white text-green-600',
                'hover:bg-green-50 active:bg-green-100',
                'transition-colors duration-200'
              )}
            >
              How to install
            </button>
          )}
          <button
            type="button"
            onClick={dismiss}
            className={cn(
              'px-3 py-2 rounded-lg text-sm font-semibold',
              showAndroidUi || showIosUi ? '' : 'flex-1',
              'bg-green-700 hover:bg-green-800',
              'transition-colors duration-200'
            )}
            aria-label="Dismiss"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {iosModalOpen && (
        <div
          className="fixed inset-0 z-40 flex items-center justify-center p-4 bg-black/50"
          role="dialog"
          aria-modal="true"
          aria-labelledby="ios-install-title"
        >
          <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full border border-green-200 overflow-hidden">
            <div className="p-4 border-b border-gray-100 flex items-start gap-3">
              <div className="w-10 h-10 rounded-lg bg-green-600 flex items-center justify-center flex-shrink-0">
                <Smartphone className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <h2 id="ios-install-title" className="font-semibold text-gray-900 text-sm">
                  Install City Fresh Kart
                </h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  Add to Home Screen for quick access.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIosModalOpen(false)}
                className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-4 bg-sky-50">
              <ol className="text-sm text-gray-800 space-y-3 list-decimal list-inside">
                <li>
                  Tap the <strong>Share</strong> button{' '}
                  <span className="inline-block align-middle text-gray-500" aria-hidden>□↑</span>{' '}
                  in Safari&apos;s toolbar.
                </li>
                <li>
                  Scroll down and tap <strong>Add to Home Screen</strong>.
                </li>
                <li>
                  Tap <strong>Add</strong> in the top-right corner.
                </li>
              </ol>
            </div>
            <div className="p-4 flex justify-center border-t border-gray-100">
              <button
                type="button"
                onClick={() => setIosModalOpen(false)}
                className="text-green-600 font-semibold text-sm hover:text-green-700"
              >
                Got it
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default InstallPrompt;
