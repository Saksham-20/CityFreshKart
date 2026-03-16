import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import { initPWA } from './utils/pwa';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// Initialize PWA capabilities
if (initPWA) {
  try {
    initPWA();
  } catch (error) {
    console.log('PWA initialization failed:', error);
  }
}
