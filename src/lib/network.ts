/**
 * Offline indicator — shows/hides a banner when connectivity changes.
 * Mounts a DOM element + announces via AccessibilityAnnouncer.
 */

import { AccessibilityAnnouncer } from '../components/AccessibilityAnnouncer';

let banner: HTMLDivElement | null = null;
let listening = false;

function createBanner(): HTMLDivElement {
  const el = document.createElement('div');
  el.id = 'qf-offline-banner';
  el.setAttribute('role', 'status');
  el.setAttribute('aria-live', 'polite');
  el.textContent = 'You are offline — progress is saved on this device.';
  Object.assign(el.style, {
    position: 'fixed',
    top: '0',
    left: '0',
    right: '0',
    padding: '8px 16px',
    background: '#fbbf24',
    color: '#78350f',
    fontFamily: '"Nunito", system-ui, sans-serif',
    fontSize: '14px',
    fontWeight: '600',
    textAlign: 'center',
    zIndex: '90000',
    display: 'none',
  });
  document.body.appendChild(el);
  return el;
}

function show(): void {
  if (!banner) banner = createBanner();
  banner.style.display = 'block';
  AccessibilityAnnouncer.announce('You are offline.');
}

function hide(): void {
  if (banner) banner.style.display = 'none';
  AccessibilityAnnouncer.announce('Back online.');
}

export function initOfflineIndicator(): void {
  if (listening) return;
  listening = true;

  if (!navigator.onLine) show();

  window.addEventListener('offline', show);
  window.addEventListener('online', hide);
}
