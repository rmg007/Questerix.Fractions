#!/usr/bin/env node
/**
 * Shared configuration for bundle, CI, and lint checks.
 * Single source of truth for size budgets and constraints.
 * Consumed by: measure-bundle.mjs, CI jobs, residual-lint.mjs
 */

// Total gzipped JS budget: 1.0 MB
export const BUDGET_BYTES = 1_048_576;

// Per-chunk budgets (gzipped, in KB)
export const CHUNK_BUDGETS = {
  phaser: 380,
  scenes: 100,
  observability: 12,
  dexie: 35,
};

// Convert chunk budgets to bytes for easier comparison
export const CHUNK_BUDGETS_BYTES = Object.fromEntries(
  Object.entries(CHUNK_BUDGETS).map(([name, kb]) => [name, kb * 1024])
);
