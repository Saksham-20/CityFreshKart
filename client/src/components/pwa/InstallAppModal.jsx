import React, { useState, useEffect } from 'react';
import Modal from '../ui/Modal';
import {
  handleInstallClick,
  isAppInstalled,
  isInstallPromptAvailable,
  onInstallPromptChange,
  shouldShowIOSInstallHelp,
  isStandaloneDisplayMode,
} from '../../utils/pwa';

/**
 * Manual entry point for PWA install when the floating banner never appears
 * (e.g. beforeinstallprompt not fired yet on Android Chrome).
 */
const InstallAppModal = ({ isOpen, onClose }) => {
  const [hasDeferredPrompt, setHasDeferredPrompt] = useState(false);

  useEffect(() => {
    if (!isOpen) return undefined;
    setHasDeferredPrompt(isInstallPromptAvailable());
    const unsub = onInstallPromptChange((available) => {
      setHasDeferredPrompt(available);
    });
    return unsub;
  }, [isOpen]);

  if (isAppInstalled() || isStandaloneDisplayMode()) {
    return null;
  }

  const showIosHelp = shouldShowIOSInstallHelp();

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Install City Fresh Kart" size="sm">
      <div className="space-y-4 text-sm text-on-surface-variant">
        {showIosHelp && (
          <ol className="list-decimal list-inside space-y-2 text-on-surface">
            <li>Open the Share menu in Safari.</li>
            <li>Tap <strong>Add to Home Screen</strong>.</li>
            <li>Tap <strong>Add</strong>.</li>
          </ol>
        )}

        {!showIosHelp && hasDeferredPrompt && (
          <>
            <p>Install the app for quicker checkout and an icon on your home screen.</p>
            <button
              type="button"
              onClick={async () => {
                await handleInstallClick();
                onClose();
              }}
              className="w-full py-2.5 rounded-xl bg-primary text-on-primary font-semibold text-sm hover:opacity-95"
            >
              Install
            </button>
          </>
        )}

        {!showIosHelp && !hasDeferredPrompt && (
          <>
            <p>
              On <strong>Android (Chrome)</strong>: tap the menu (⋮), then choose
              {' '}
              <strong>Install app</strong> or <strong>Add to Home screen</strong>.
            </p>
            <p className="text-xs">
              That option can appear after you browse for a moment. You can open this dialog again from
              the header anytime.
            </p>
          </>
        )}

        <button
          type="button"
          onClick={onClose}
          className="w-full py-2 rounded-xl bg-surface-container-highest text-on-surface font-medium text-sm"
        >
          Close
        </button>
      </div>
    </Modal>
  );
};

export default InstallAppModal;
