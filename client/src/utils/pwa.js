/**
 * PWA Registration & Management
 * Handles service worker registration and app installation
 */

let deferredPrompt;

/**
 * Initialize PWA functionality
 */
export const initPWA = () => {
  // Register service worker
  if (process.env.NODE_ENV === 'production' && 'serviceWorker' in navigator) {
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
    showInstallPrompt();
  });

  // Handle app installed
  window.addEventListener('appinstalled', () => {
    console.log('✓ App installed successfully');
    deferredPrompt = null;
    localStorage.setItem('cityfreshkart-app-installed', 'true');
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

/**
 * Check online status
 */
export const isOnline = () => navigator.onLine;

/**
 * Listen to online/offline events
 */
export const onOnlineStatusChange = (callback) => {
  window.addEventListener('online', () => callback(true));
  window.addEventListener('offline', () => callback(false));
};

export default {
  initPWA,
  showInstallPrompt,
  handleInstallClick,
  isAppInstalled,
  getPWACapabilities,
  requestNotificationPermission,
  sendNotification,
  isOnline,
  onOnlineStatusChange,
};
