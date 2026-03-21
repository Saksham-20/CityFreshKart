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
const BANNER_VERSION_KEY = 'cfk-install-banner-version';
const CURRENT_BANNER_VERSION = '2';

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
    try {
      if (localStorage.getItem(BANNER_VERSION_KEY) !== CURRENT_BANNER_VERSION) {
        localStorage.setItem(BANNER_VERSION_KEY, CURRENT_BANNER_VERSION);
        sessionStorage.removeItem(SESSION_DISMISS_KEY);
      }
    } catch (_) {
      /* ignore */
    }

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
          'relative',
          'bg-gradient-to-r from-primary to-primary-container text-on-primary rounded-2xl shadow-primary-glow',
          'p-4 pt-3 flex flex-col gap-3 z-[35]',
          'outline outline-1 outline-on-primary/20',
          /* Sit above WhatsApp FAB (h-14 + gap) — same horizontal row as FAB uses bottom 5.5rem */
        )}
        style={{
          bottom: 'calc(env(safe-area-inset-bottom) + 5.5rem + 4rem)',
        }}
      >
        <button
          type="button"
          onClick={dismiss}
          className={cn(
            'absolute top-2 right-2 p-1.5 rounded-full',
            'text-on-primary/90 hover:bg-white/15 active:bg-white/25',
            'transition-colors'
          )}
          aria-label="Dismiss install prompt"
        >
          <X className="w-5 h-5" strokeWidth={2.25} />
        </button>

        <div className="flex items-start gap-3 pr-8">
          <Download className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-sm">
              Install City Fresh Kart
            </h3>
            <p className="text-xs text-on-primary/85 mt-1">
              {showAndroidUi
                ? 'Faster access and offline support — install as an app (Chrome / Android).'
                : 'On iPhone and iPad: add this site to your Home Screen for an app-like experience.'}
            </p>
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          {showAndroidUi && (
            <button
              type="button"
              onClick={async () => {
                await handleInstallClick();
                setIsVisible(false);
              }}
              className={cn(
                'flex-1 min-w-[7rem] px-3 py-2 rounded-lg text-sm font-semibold',
                'bg-white text-primary',
                'hover:bg-white/95 active:bg-white/90',
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
                'flex-1 min-w-[7rem] px-3 py-2 rounded-lg text-sm font-semibold',
                'bg-white text-primary',
                'hover:bg-white/95 active:bg-white/90',
                'transition-colors duration-200'
              )}
            >
              How to install
            </button>
          )}
          {!showAndroidUi && !showIosUi && (
            <button
              type="button"
              onClick={dismiss}
              className="flex-1 px-3 py-2 rounded-lg text-sm font-semibold bg-white/15 hover:bg-white/25 transition-colors"
            >
              Close
            </button>
          )}
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
