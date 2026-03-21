/**
 * PWA Registration & Management
 * Handles service worker registration and app installation
 */

import api from '../services/api';

let deferredPrompt;
const installPromptListeners = new Set();

/**
 * Initialize PWA functionality
 */
export const initPWA = () => {
  // Register service worker
  const shouldRegisterServiceWorker =
    'serviceWorker' in navigator &&
    (process.env.NODE_ENV === 'production' || window.location.hostname === 'localhost');

  if (shouldRegisterServiceWorker) {
    window.addEventListener('load', () => {
      navigator.serviceWorker
        .register('/sw.js', { scope: '/' })
        .then((registration) => {
          console.log('✓ Service Worker registered:', registration);
          
          // Check for updates periodically
          setInterval(() => {
            registration.update();
          }, 60000); // Check every minute
        })
        .catch((error) => {
          console.error('✗ Service Worker registration failed:', error);
        });
    });
  }

  // Handle install prompt
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    installPromptListeners.forEach(cb => cb(true));
    showInstallPrompt();
  });

  // Handle app installed
  window.addEventListener('appinstalled', () => {
    console.log('✓ App installed successfully');
    deferredPrompt = null;
    localStorage.setItem('cityfreshkart-app-installed', 'true');
    installPromptListeners.forEach(cb => cb(false));
  });
};

/**
 * Show install prompt to user
 */
export const showInstallPrompt = () => {
  const banner = document.getElementById('install-banner');
  if (banner && deferredPrompt) {
    banner.classList.remove('hidden');
  }
};

export const isInstallPromptAvailable = () => !!deferredPrompt;

export const onInstallPromptChange = (callback) => {
  installPromptListeners.add(callback);
  callback(!!deferredPrompt);
  return () => installPromptListeners.delete(callback);
};

/**
 * Handle install button click
 */
export const handleInstallClick = async () => {
  if (!deferredPrompt) {
    return;
  }

  deferredPrompt.prompt();
  const { outcome } = await deferredPrompt.userChoice;
  console.log(`User response to the install prompt: ${outcome}`);

  if (outcome === 'accepted') {
    deferredPrompt = null;
    installPromptListeners.forEach(cb => cb(false));
  }
};

/**
 * Check if app is already installed
 */
export const isAppInstalled = () => {
  return (
    localStorage.getItem('cityfreshkart-app-installed') === 'true' ||
    window.navigator.standalone === true
  );
};

/** True when running in Safari on iPhone/iPad (including iPadOS desktop UA). */
export const isIOSBrowser = () => {
  if (typeof window === 'undefined') return false;
  const { userAgent, platform, maxTouchPoints } = window.navigator;
  if (/iPad|iPhone|iPod/.test(userAgent)) return true;
  return platform === 'MacIntel' && maxTouchPoints > 1;
};

/** PWA already added to home screen / standalone window. */
export const isStandaloneDisplayMode = () => {
  if (typeof window === 'undefined') return false;
  if (window.navigator.standalone === true) return true;
  try {
    return window.matchMedia('(display-mode: standalone)').matches;
  } catch {
    return false;
  }
};

/** iOS Safari cannot use beforeinstallprompt; show manual Add to Home Screen instructions. */
export const shouldShowIOSInstallHelp = () =>
  isIOSBrowser() && !isStandaloneDisplayMode() && !isAppInstalled();

/**
 * Check if PWA features are available
 */
export const getPWACapabilities = () => {
  return {
    serviceWorker: 'serviceWorker' in navigator,
    webApp: 'standalone' in window.navigator,
    install: !!deferredPrompt,
    notifications: 'Notification' in window,
    background: 'SyncManager' in navigator,
  };
};

/**
 * Request notification permission
 */
export const requestNotificationPermission = async () => {
  if (!('Notification' in window)) {
    return false;
  }

  if (Notification.permission === 'granted') {
    return true;
  }

  if (Notification.permission !== 'denied') {
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  }

  return false;
};

/**
 * Send notification
 */
export const sendNotification = (title, options = {}) => {
  if (Notification.permission === 'granted') {
    return navigator.serviceWorker.ready.then((registration) => {
      return registration.showNotification(title, {
        badge: '/icons/icon-192x192.png',
        icon: '/icons/icon-192x192.png',
        ...options,
      });
    });
  }
};

const urlBase64ToUint8Array = (base64String) => {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i += 1) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
};

/**
 * Subscribe current browser for server Web Push notifications
 */
export const subscribeToWebPush = async () => {
  if (typeof window !== 'undefined' && !window.isSecureContext) {
    throw new Error('Push notifications require a secure connection (https://).');
  }

  const hasPermission = await requestNotificationPermission();
  if (!hasPermission) {
    throw new Error('Notification permission not granted');
  }

  if (!('serviceWorker' in navigator)) {
    throw new Error('Service worker not supported in this browser');
  }

  const vapidPublicKey = process.env.REACT_APP_VAPID_PUBLIC_KEY;
  if (!vapidPublicKey) {
    throw new Error('VAPID public key missing (REACT_APP_VAPID_PUBLIC_KEY)');
  }

  const registration = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
  await registration.update();

  const pushSubscribeTimeoutMs = 60000;
  let subscription = await Promise.race([
    (async () => {
      let sub = await registration.pushManager.getSubscription();
      if (!sub) {
        sub = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
        });
      }
      return sub;
    })(),
    new Promise((_, reject) => {
      setTimeout(
        () => reject(new Error('Browser push setup timed out. Try again or check your connection.')),
        pushSubscribeTimeoutMs,
      );
    }),
  ]);

  const serializable = typeof subscription.toJSON === 'function'
    ? subscription.toJSON()
    : subscription;

  const subscribePostTimeoutMs = 45000;
  const controller = new AbortController();
  const abortTimer = setTimeout(() => controller.abort(), subscribePostTimeoutMs);

  try {
    await api.post(
      '/notifications/subscribe',
      { subscription: serializable },
      { signal: controller.signal },
    );
  } catch (err) {
    if (err.code === 'ERR_CANCELED' || err.name === 'CanceledError' || err.message === 'canceled') {
      throw new Error('Saving your notification settings timed out. Check your connection and try again.');
    }
    const data = err.response?.data;
    const msg =
      (typeof data?.message === 'string' && data.message) ||
      data?.errors?.[0]?.msg ||
      err.message ||
      'Failed to save push subscription';
    throw new Error(msg);
  } finally {
    clearTimeout(abortTimer);
  }

  return subscription;
};

/**
 * Check online status
 */
export const isOnline = () => navigator.onLine;

/**
 * Listen to online/offline events
 */
export const onOnlineStatusChange = (callback) => {
  const onlineHandler = () => callback(true);
  const offlineHandler = () => callback(false);
  window.addEventListener('online', onlineHandler);
  window.addEventListener('offline', offlineHandler);
  return () => {
    window.removeEventListener('online', onlineHandler);
    window.removeEventListener('offline', offlineHandler);
  };
};

const pwa = {
  initPWA,
  showInstallPrompt,
  isInstallPromptAvailable,
  onInstallPromptChange,
  handleInstallClick,
  isAppInstalled,
  isIOSBrowser,
  isStandaloneDisplayMode,
  shouldShowIOSInstallHelp,
  getPWACapabilities,
  requestNotificationPermission,
  sendNotification,
  subscribeToWebPush,
  isOnline,
  onOnlineStatusChange,
};

export default pwa;
