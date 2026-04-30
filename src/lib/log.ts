/**
 * Structured game logger.
 *
 * Usage:
 *   import { log } from '@/lib/log';
 *   log.q('load', { index: 0, id: 'q:ph:L1:0001' });
 *   log.valid('result', { outcome: 'correct', score: 1 });
 *
 * Categories:
 *   SCENE  — scene lifecycle (init, create, destroy)
 *   TMPL   — template loading from Dexie / fallback
 *   Q      — question flow (load, correct, wrong, advance)
 *   DRAG   — drag-handle events (start, move, commit)
 *   INPUT  — user input (button taps, choices, key presses)
 *   VALID  — validator calls and results
 *   HINT   — hint ladder (request, tier shown, recorded)
 *   SESS   — session persistence (open, close)
 *   ATMP   — attempt persistence (record, BKT update)
 *   BKT    — mastery / Bayesian Knowledge Tracing
 *   MISC   — misconception detector results
 *   PERF   — performance / timing data
 *
 * Filtering at runtime:
 *   localStorage.LOG = '*'            → all categories (default in DEV)
 *   localStorage.LOG = 'Q,VALID'      → only Q and VALID
 *   localStorage.LOG = ''             → silence all
 *   URL ?log=Q,VALID also works
 *
 * In production builds (import.meta.env.PROD) only WARN/ERROR are emitted.
 */

import { logger } from './observability';

const START = Date.now();

// ── Helpers ──────────────────────────────────────────────────────────────────

function getFilter(): string {
  try {
    const url = new URLSearchParams(window.location.search).get('log');
    if (url !== null) return url;
    return localStorage.getItem('LOG') ?? '*';
  } catch (err) {
    return '*';
  }
}

function isEnabled(category: string): boolean {
  if (import.meta.env.PROD) return false;
  const f = getFilter();
  if (f === '' || f === 'off') return false;
  if (f === '*' || f === 'all') return true;
  return f.split(',').some((s) => s.trim().toUpperCase() === category.toUpperCase());
}

function ts(): string {
  const ms = Date.now() - START;
  return `+${(ms / 1000).toFixed(3)}s`;
}

type ConsoleFn = 'log' | 'warn' | 'error';

const STYLES: Record<string, string> = {
  SCENE: 'color:#7c3aed;font-weight:700',
  TMPL: 'color:#0369a1;font-weight:700',
  Q: 'color:#065f46;font-weight:700',
  DRAG: 'color:#92400e;font-weight:700',
  INPUT: 'color:#be185d;font-weight:700',
  VALID: 'color:#1d4ed8;font-weight:700',
  HINT: 'color:#b45309;font-weight:700',
  SESS: 'color:#6b7280;font-weight:700',
  ATMP: 'color:#374151;font-weight:700',
  BKT: 'color:#6d28d9;font-weight:700',
  MISC: 'color:#b91c1c;font-weight:700',
  PERF: 'color:#047857;font-weight:700',
};

function emit(fn: ConsoleFn, category: string, event: string, data?: unknown): void {
  // We keep the isEnabled check for console filtering
  const enabled = isEnabled(category);

  // Always log to observability logger (it handles its own filtering/consent)
  const logData =
    typeof data === 'object' && data !== null ? (data as Record<string, unknown>) : undefined;
  if (fn === 'error') {
    if (logData !== undefined) {
      logger.error(event, { category, data: logData });
    } else {
      logger.error(event, { category });
    }
  } else if (fn === 'warn') {
    if (logData !== undefined) {
      logger.warn(event, { category, data: logData });
    } else {
      logger.warn(event, { category });
    }
  } else {
    if (logData !== undefined) {
      logger.info(event, { category, data: logData });
    } else {
      logger.info(event, { category });
    }
  }

  if (!enabled) return;

  const cat = category.toUpperCase().padEnd(5);
  const style = STYLES[cat.trim()] ?? 'color:#374151;font-weight:700';
  const prefix = `%c[${ts()}] ${cat}%c ${event}`;
  const reset = 'color:inherit;font-weight:normal';

  if (data !== undefined) {
    (console[fn] as (...a: unknown[]) => void)(prefix, style, reset, data);
  } else {
    (console[fn] as (...a: unknown[]) => void)(prefix, style, reset);
  }
}

// ── Public API ───────────────────────────────────────────────────────────────

export const log = {
  scene: (event: string, data?: unknown) => emit('log', 'SCENE', event, data),
  tmpl: (event: string, data?: unknown) => emit('log', 'TMPL', event, data),
  q: (event: string, data?: unknown) => emit('log', 'Q', event, data),
  drag: (event: string, data?: unknown) => emit('log', 'DRAG', event, data),
  input: (event: string, data?: unknown) => emit('log', 'INPUT', event, data),
  valid: (event: string, data?: unknown) => emit('log', 'VALID', event, data),
  hint: (event: string, data?: unknown) => emit('log', 'HINT', event, data),
  sess: (event: string, data?: unknown) => emit('log', 'SESS', event, data),
  atmp: (event: string, data?: unknown) => emit('log', 'ATMP', event, data),
  bkt: (event: string, data?: unknown) => emit('log', 'BKT', event, data),
  misc: (event: string, data?: unknown) => emit('log', 'MISC', event, data),
  perf: (event: string, data?: unknown) => emit('log', 'PERF', event, data),
  warn: (category: string, event: string, data?: unknown) => emit('warn', category, event, data),
  error: (category: string, event: string, data?: unknown) => emit('error', category, event, data),
};

// Expose globally for console-based inspection during dev
if (import.meta.env.DEV) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (window as any).__LOG = {
    setFilter: (f: string) => {
      localStorage.setItem('LOG', f);
      console.log(`[LOG] filter set to: "${f}" — reload not required`);
    },
    getFilter,
    silence: () => {
      localStorage.setItem('LOG', '');
      console.log('[LOG] silenced');
    },
    all: () => {
      localStorage.setItem('LOG', '*');
      console.log('[LOG] all categories enabled');
    },
  };
}
