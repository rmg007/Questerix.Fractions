/**
 * In-app log viewer — overlay that shows the ring buffer for bug reports.
 *
 * Activation:
 *   ?logViewer=1     — auto-mount on boot
 *   Ctrl+Shift+L     — toggle visibility (any time)
 *   window.__LOG.viewer.show()/.hide()/.toggle()/.dump()
 *
 * The viewer is a position:fixed DOM panel — does not block the canvas.
 * "Copy" button serializes the current ring buffer + context to clipboard
 * as JSON for pasting into bug reports.
 */

import { getRing, getContext } from './log';

const VIEWER_ID = 'qf-log-viewer';

function buildPanel(): HTMLElement {
  const panel = document.createElement('div');
  panel.id = VIEWER_ID;
  Object.assign(panel.style, {
    position: 'fixed',
    bottom: '8px',
    right: '8px',
    width: 'min(540px, calc(100vw - 16px))',
    height: 'min(360px, 50vh)',
    background: 'rgba(15, 23, 42, 0.95)',
    color: '#e2e8f0',
    fontFamily: '"SF Mono", Consolas, monospace',
    fontSize: '11px',
    zIndex: '20000',
    border: '1px solid #475569',
    borderRadius: '6px',
    display: 'flex',
    flexDirection: 'column',
    boxShadow: '0 6px 24px rgba(0,0,0,0.4)',
  });

  const header = document.createElement('div');
  Object.assign(header.style, {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '6px 8px',
    background: '#1e293b',
    borderBottom: '1px solid #475569',
    flexShrink: '0',
  });

  const title = document.createElement('span');
  title.textContent = 'Log Viewer';
  Object.assign(title.style, { fontWeight: '700', flexGrow: '1' });

  const copyBtn = document.createElement('button');
  copyBtn.textContent = 'Copy';
  const refreshBtn = document.createElement('button');
  refreshBtn.textContent = 'Refresh';
  const closeBtn = document.createElement('button');
  closeBtn.textContent = '×';

  for (const b of [copyBtn, refreshBtn, closeBtn]) {
    Object.assign(b.style, {
      background: '#334155',
      color: '#e2e8f0',
      border: '1px solid #475569',
      borderRadius: '3px',
      padding: '2px 8px',
      cursor: 'pointer',
      fontSize: '11px',
    });
  }
  closeBtn.style.padding = '2px 6px';

  header.appendChild(title);
  header.appendChild(refreshBtn);
  header.appendChild(copyBtn);
  header.appendChild(closeBtn);

  const body = document.createElement('pre');
  body.id = `${VIEWER_ID}-body`;
  Object.assign(body.style, {
    margin: '0',
    padding: '8px',
    overflow: 'auto',
    flexGrow: '1',
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
  });

  panel.appendChild(header);
  panel.appendChild(body);

  const render = () => {
    const ring = getRing();
    const ctx = getContext();
    const lines = [
      `# context: ${JSON.stringify(ctx)}`,
      `# entries: ${ring.length}`,
      '',
      ...ring.map((e) => {
        const dt = new Date(e.t).toISOString().slice(11, 23);
        const dataStr = e.data !== undefined ? ` ${JSON.stringify(e.data)}` : '';
        return `${dt} [${e.lvl.padEnd(5)}] ${e.cat.padEnd(11)} ${e.event}${dataStr}`;
      }),
    ];
    body.textContent = lines.join('\n');
    body.scrollTop = body.scrollHeight;
  };

  refreshBtn.addEventListener('click', render);
  closeBtn.addEventListener('click', () => hide());
  copyBtn.addEventListener('click', () => {
    const payload = {
      context: getContext(),
      ring: getRing(),
      capturedAt: new Date().toISOString(),
    };
    const text = JSON.stringify(payload, null, 2);
    navigator.clipboard?.writeText(text).then(
      () => {
        copyBtn.textContent = 'Copied!';
        setTimeout(() => (copyBtn.textContent = 'Copy'), 1200);
      },
      () => {
        copyBtn.textContent = 'Failed';
        setTimeout(() => (copyBtn.textContent = 'Copy'), 1200);
      },
    );
  });

  render();
  return panel;
}

export function show(): void {
  if (typeof document === 'undefined') return;
  if (document.getElementById(VIEWER_ID)) return;
  document.body.appendChild(buildPanel());
}

export function hide(): void {
  document.getElementById(VIEWER_ID)?.remove();
}

export function toggle(): void {
  if (document.getElementById(VIEWER_ID)) hide();
  else show();
}

export function dump(): { context: Readonly<Record<string, unknown>>; ring: readonly unknown[] } {
  return { context: getContext(), ring: getRing() };
}

let installed = false;

export function install(): void {
  if (installed || typeof window === 'undefined') return;
  installed = true;

  window.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.shiftKey && (e.key === 'L' || e.key === 'l')) {
      e.preventDefault();
      toggle();
    }
  });

  try {
    const params = new URLSearchParams(window.location.search);
    if (params.get('logViewer') === '1') show();
  } catch (_e) {
    /* noop */
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const w = window as any;
  w.__LOG = w.__LOG ?? {};
  w.__LOG.viewer = { show, hide, toggle, dump };
}
