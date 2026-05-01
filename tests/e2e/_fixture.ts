/**
 * Playwright fixture that auto-injects ?testHooks=1 into all page.goto() calls.
 * This ensures E2E tests always target the special test mode where boot-start-btn is mounted.
 * Import this instead of @playwright/test in any tests/e2e spec file.
 */
import { test as base, expect } from '@playwright/test'
import { TEST_HOOKS_PARAM, DEV_URL } from '../../src/config/shared'

export const test = base.extend({
  page: async ({ page }, use) => {
    const originalGoto = page.goto.bind(page)

    // Override page.goto() to auto-append ?testHooks=1
    page.goto = async (url: string | URL | null, options?: any) => {
      if (url === null) {
        return originalGoto(null, options)
      }

      const urlStr = String(url)
      const urlObj = new URL(urlStr, DEV_URL)
      urlObj.searchParams.set(TEST_HOOKS_PARAM, '1')

      return originalGoto(urlObj.toString(), options)
    }

    await use(page)
  },
})

export { expect }
