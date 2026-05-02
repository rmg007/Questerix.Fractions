/**
 * Single source of truth for config constants shared across vite, playwright, workflows, and tests.
 * Import from here; never hardcode ports, browser lists, or test params elsewhere.
 */

export const DEV_PORT = 5000;
export const BROWSERS = ['chromium', 'webkit'];
export const TEST_HOOKS_PARAM = 'testHooks';

// Derived constants
export const TEST_HOOKS_URL = `http://localhost:${DEV_PORT}/?${TEST_HOOKS_PARAM}=1`;
export const DEV_URL = `http://localhost:${DEV_PORT}`;
