import React from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';
import './workspace.css';
import { AdminApp } from './AdminApp';
import { ResortPartnerApp } from './ResortPartnerApp';
import { PasswordResetApp } from './PasswordResetApp';

const chunkReloadKey = 'divergram_admin_chunk_reload';
const recoverFromStaleChunk = (event) => {
  const message = String(event?.reason?.message || event?.message || '');
  const isChunkError = event?.type === 'vite:preloadError'
    || /dynamically imported module|failed to fetch|chunkloaderror/i.test(message);
  if (!isChunkError) return;
  event?.preventDefault?.();
  if (window.sessionStorage.getItem(chunkReloadKey)) return;
  window.sessionStorage.setItem(chunkReloadKey, '1');
  window.location.reload();
};

window.addEventListener('vite:preloadError', recoverFromStaleChunk);
window.addEventListener('unhandledrejection', recoverFromStaleChunk);

const isPartnerPortal = ['partner.divergram.com', 'mns.divergram.com'].includes(window.location.hostname)
  || window.location.pathname === '/partner'
  || window.location.pathname.startsWith('/partner/');
const isPasswordReset = window.location.pathname === '/reset-password';

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    {isPasswordReset ? <PasswordResetApp /> : isPartnerPortal ? <ResortPartnerApp /> : <AdminApp />}
  </React.StrictMode>
);

window.setTimeout(() => window.sessionStorage.removeItem(chunkReloadKey), 5000);
