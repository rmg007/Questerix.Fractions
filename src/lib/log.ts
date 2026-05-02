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
 *   sessionStorage.LOG = '*'          → all categories (default in DEV)
 *   sessionStorage.LOG = 'Q,VALID'    → only Q and VALID
 *   sessionStorage.LOG = ''           → silence all (resets on tab close)
 *   URL ?log=Q,VALID also works
 *
 * In production builds (import.meta.env.PROD) only WARN/ERROR are emitted.
 */

import { errorReporter, logger } from './observability';

const START = Date.now();

// ── Phase 10: ring buffer + ambient context + perf helpers ───────────────────

export const RING_SIZE = 500;

export interface RingEntry {
  ts: number;
  lvl: 'log' | 'warn' | 'error' | 'fatal';
  cat: string;
  event: string;
  data?: unknown;
  ctx?: Record<string, unknown>;
}

const _ring: RingEntry[] = [];

export function getRing(): RingEntry[] {
  return _ring;
}

let _ctx: Record<string, unknown> = {};

export function setContext(ctx: Record<string, unknown>): void {
  _ctx = { ...ctx };
}

export function patchContext(patch: Record<string, unknown>): void {
  Object.assign(_ctx, patch);
}

export function getContext(): Record<string, unknown> {
  return { ..._ctx };
}

function pushRing(entry: RingEntry): void {
  _ring.push(entry);
  if (_ring.length > RING_SIZE) {
    _ring.splice(0, _ring.length - RING_SIZE);
  }
}

export function perfMark(label: string): void {
  try {
    performance.mark(label);
  } catch {
    // safe to swallow — performance.mark may not exist in some test envs
  }
}

export async function timed<T>(label: string, fn: () => Promise<T>): Promise<T> {
  const t0 = performance.now();
  try {
    return await fn();
  } finally {
    const ms = +(performance.now() - t0).toFixed(2);
    emit('log', 'PERF', label, { ms });
  }
}

export function timedSync<T>(label: string, fn: () => T): T {
  const t0 = performance.now();
  try {
    return fn();
  } finally {
    const ms = +(performance.now() - t0).toFixed(2);
    emit('log', 'PERF', label, { ms });
  }
}

export function logAssert(condition: unknown, message: string, data?: unknown): void {
  if (condition) return;
  emit('error', 'ASSERT', message, data);
  if (import.meta.env.DEV) {
    throw new Error(`[ASSERT] ${message}`);
  }
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function getFilter(): string {
  try {
    const url = new URLSearchParams(window.location.search).get('log');
    if (url !== null) return url;
    return sessionStorage.getItem('LOG') ?? '*';
  } catch {
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

type ConsoleFn = 'log' | 'warn' | 'error' | 'fatal';

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
  // Phase 10: always push to ring buffer regardless of filter (forensic tail)
  const ringCat = category.toUpperCase();
  const ctxSnapshot = Object.keys(_ctx).length > 0 ? { ..._ctx } : undefined;
  const entry: RingEntry = {
    ts: Date.now() - START,
    lvl: fn,
    cat: ringCat,
    event,
    ...(data !== undefined ? { data } : {}),
    ...(ctxSnapshot ? { ctx: ctxSnapshot } : {}),
  };
  pushRing(entry);

  // We keep the isEnabled check for console filtering
  const enabled = isEnabled(category);

  // Always log to observability logger (it handles its own filtering/consent)
  const logData =
    typeof data === 'object' && data !== null ? (data as Record<string, unknown>) : undefined;
  if (fn === 'fatal') {
    // Phase 12.4: `fatal` is the session-ending severity. Route through
    // `errorReporter.report()` so Sentry capture happens unconditionally
    // (no consent gate — fatals are the user's last breadcrumb of a crash
    // they cannot opt out of). errorReporter.report() forwards to
    // logger.error() under the hood for the local ring buffer / console.
    const err = data instanceof Error ? data : new Error(event);
    const ctx = logData !== undefined ? { category, ...logData } : { category };
    errorReporter.report(err, ctx);
  } else if (fn === 'error') {
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

  if (!enabled && fn !== 'fatal') return;

  const cat = category.toUpperCase().padEnd(5);
  const style = STYLES[cat.trim()] ?? 'color:#374151;font-weight:700';
  const prefix = `%c[${ts()}] ${cat}%c ${event}`;
  const reset = 'color:inherit;font-weight:normal';

  // Console: `fatal` lands on console.error so it's visible even when LOG=off.
  const consoleFn: 'log' | 'warn' | 'error' = fn === 'fatal' ? 'error' : fn;

  if (data !== undefined) {
    (console[consoleFn] as (...a: unknown[]) => void)(prefix, style, reset, data);
  } else {
    (console[consoleFn] as (...a: unknown[]) => void)(prefix, style, reset);
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
  // Phase 10 categories
  lifecycle: (event: string, data?: unknown) => emit('log', 'LIFECYCLE', event, data),
  net: (event: string, data?: unknown) => emit('log', 'NET', event, data),
  pwa: (event: string, data?: unknown) => emit('log', 'PWA', event, data),
  a11y: (event: string, data?: unknown) => emit('log', 'A11Y', event, data),
  tts: (event: string, data?: unknown) => emit('log', 'TTS', event, data),
  storage: (event: string, data?: unknown) => emit('log', 'STORAGE', event, data),
  migrate: (event: string, data?: unknown) => emit('log', 'MIGRATE', event, data),
  errBoundary: (event: string, data?: unknown) => emit('log', 'ERR_BOUNDARY', event, data),
  warn: (category: string, event: string, data?: unknown) => emit('warn', category, event, data),
  error: (category: string, event: string, data?: unknown) => emit('error', category, event, data),
  /**
   * Phase 12.4 — session-ending severity. Always invokes
   * `errorReporter.report()` so Sentry receives the event when initialized,
   * regardless of telemetry-consent state (a crash is by definition not
   * something the user can opt out of breadcrumbing).
   */
  fatal: (category: string, event: string, data?: unknown) => emit('fatal', category, event, data),
};

// Expose globally for console-based inspection during dev
if (import.meta.env.DEV) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (window as any).__LOG = {
    setFilter: (f: string) => {
      sessionStorage.setItem('LOG', f);
      console.log(`[LOG] filter set to: "${f}" — reload not required`);
    },
    getFilter,
    silence: () => {
      sessionStorage.setItem('LOG', '');
      console.log('[LOG] silenced');
    },
    all: () => {
      sessionStorage.setItem('LOG', '*');
      console.log('[LOG] all categories enabled');
    },
  };
}
