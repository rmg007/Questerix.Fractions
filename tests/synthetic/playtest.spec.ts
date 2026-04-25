// Synthetic playtest orchestrator — 100 simulated kid sessions (4 personas × 25 each)
// per playtest-protocol.md §5 (telemetry), §4.3 (what to record)
// Run via: npm run playtest:synthetic  (or :quick for 5 sessions/persona)
import { test, expect, Browser, BrowserContext, Page } from '@playwright/test';
import { ALL_PERSONAS, Persona } from './personas.js';
import { SessionRecord, AttemptRecord, aggregate, saveReport, printSummary } from './aggregator.js';

const SESSIONS_PER_PERSONA = parseInt(process.env['SYNTHETIC_SESSIONS_PER_PERSONA'] ?? '25', 10);
const ATTEMPTS_PER_SESSION = 5;
// Hard limits per playtest-protocol.md §5 time-budget
const SESSION_TIMEOUT_MS = 90_000;
const TOTAL_TIMEOUT_MS = 30 * 60 * 1000;

const allSessions: SessionRecord[] = [];

// ── helpers ──────────────────────────────────────────────────────────────────

async function sleep(ms: number): Promise<void> {
  await new Promise(resolve => setTimeout(resolve, ms));
}

/** Clear IndexedDB between sessions to ensure independence. */
async function clearStorage(page: Page): Promise<void> {
  await page.evaluate(async () => {
    // Delete the Dexie database used by Questerix Fractions
    await new Promise<void>((resolve, reject) => {
      const req = indexedDB.deleteDatabase('questerix-fractions');
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
      req.onblocked = () => resolve(); // proceed even if blocked
    });
    // Also clear localStorage and sessionStorage for a clean slate
    localStorage.clear();
    sessionStorage.clear();
  });
}

/** Navigate from boot screen to level selection. Returns false if boot fails. */
async function bootToMenu(page: Page): Promise<boolean> {
  try {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    const startBtn = page.locator('[data-testid="boot-start-btn"]');
    await expect(startBtn).toBeVisible({ timeout: 8000 });
    await startBtn.click();
    await expect(page.locator('[data-testid="menu-scene"]')).toBeVisible({ timeout: 5000 });
    return true;
  } catch {
    return false;
  }
}

/** Navigate to a level card. Returns false if the card isn't found. */
async function selectLevel(page: Page, level: number): Promise<boolean> {
  try {
    const card = page.locator(`[data-testid="level-card-L${level}"]`);
    await expect(card).toBeVisible({ timeout: 3000 });
    await card.click();
    await expect(page.locator('[data-testid="level01-scene"], [data-testid^="level"]')).toBeVisible({ timeout: 6000 });
    return true;
  } catch {
    return false;
  }
}

/** Determine if the feedback text indicates a correct answer. */
async function isCorrectFeedback(page: Page): Promise<boolean> {
  try {
    const liveRegion = page.locator('[aria-live="polite"]');
    const text = await liveRegion.textContent({ timeout: 500 });
    if (!text) return false;
    return /correct|great|nice|perfect|yes|well done/i.test(text);
  } catch {
    return false;
  }
}

/** Simulate one attempt: think-time → click → wait for feedback. */
async function simulateAttempt(
  page: Page,
  persona: Persona,
  level: number,
  attemptIndex: number,
  sessionId: string,
): Promise<AttemptRecord> {
  const thinkMs = persona.responseTimeMs();

  // Simulate think time (no synthetic clock injection needed — just delay)
  await sleep(Math.min(thinkMs, 8000)); // cap so CI doesn't time out per attempt

  const t0 = Date.now();
  let outcome: AttemptRecord['outcome'] = 'timeout';
  let feedbackShownMs: number | null = null;
  let hintUsed = false;

  // Optionally ask for hint (only if a previous wrong is likely)
  const shouldHint = Math.random() < persona.hintProbability();
  if (shouldHint) {
    try {
      const hintBtn = page.locator('[data-testid="hint-btn"]');
      const visible = await hintBtn.isVisible({ timeout: 500 });
      if (visible) {
        await hintBtn.click();
        hintUsed = true;
        await sleep(800);
      }
    } catch { /* hint not available; continue */ }
  }

  // Decide correct vs wrong based on persona accuracy
  const willBeCorrect = Math.random() < persona.accuracyByLevel(level);

  try {
    const partitionTarget = page.locator('[data-testid="partition-target"]');
    await expect(partitionTarget).toBeVisible({ timeout: 4000 });

    if (willBeCorrect) {
      // Click the primary target (correct action)
      await partitionTarget.click();
    } else {
      // Click a random position near (but not on) the target to simulate a wrong answer
      const box = await partitionTarget.boundingBox();
      if (box) {
        const offsetX = (Math.random() - 0.5) * box.width * 2.5;
        const offsetY = (Math.random() - 0.5) * box.height * 2.5;
        await page.mouse.click(
          box.x + box.width / 2 + offsetX,
          box.y + box.height / 2 + offsetY,
        );
      } else {
        await partitionTarget.click(); // fallback
      }
    }

    // Wait for feedback overlay
    const feedbackOverlay = page.locator('[data-testid="feedback-overlay"]');
    await expect(feedbackOverlay).toBeVisible({ timeout: 2000 });
    feedbackShownMs = Date.now() - t0;

    const correct = await isCorrectFeedback(page);
    outcome = correct ? 'correct' : 'wrong';

    // Dismiss feedback
    const nextBtn = page.locator('[data-testid="feedback-next-btn"]');
    const nextVisible = await nextBtn.isVisible({ timeout: 500 });
    if (nextVisible) {
      await nextBtn.click();
      await expect(feedbackOverlay).toBeHidden({ timeout: 1500 });
    }
  } catch {
    outcome = 'timeout';
  }

  return {
    sessionId,
    personaName: persona.name,
    level,
    attemptIndex,
    outcome,
    hintUsed,
    responseTimeMs: thinkMs,
    feedbackShownMs,
  };
}

/** Run one complete session for a persona. */
async function runSession(
  browser: Browser,
  persona: Persona,
  sessionIndex: number,
): Promise<SessionRecord> {
  const sessionId = `${persona.name}-${sessionIndex}-${Date.now()}`;
  const context: BrowserContext = await browser.newContext({
    viewport: { width: 1280, height: 720 },
  });
  const page: Page = await context.newPage();

  const consoleErrors: string[] = [];
  page.on('console', msg => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });
  page.on('pageerror', err => {
    consoleErrors.push(`[uncaught] ${err.message}`);
  });

  const sessionRecord: SessionRecord = {
    sessionId,
    personaName: persona.name,
    startLevel: 1,
    finalLevel: 1,
    attempts: [],
    completed: false,
    abandoned: false,
    crashed: false,
    consoleErrors,
    totalDurationMs: 0,
    taskDurationMs: null,
  };

  const sessionStart = Date.now();

  try {
    // Clear IndexedDB to ensure session independence
    await page.goto('/');
    await clearStorage(page);

    const booted = await bootToMenu(page);
    if (!booted) {
      sessionRecord.crashed = true;
      return sessionRecord;
    }

    let currentLevel = 1;
    const levelSelected = await selectLevel(page, currentLevel);
    if (!levelSelected) {
      sessionRecord.crashed = true;
      return sessionRecord;
    }
    sessionRecord.startLevel = currentLevel;

    // Check early abandon
    if (Math.random() < persona.abandonProbability()) {
      sessionRecord.abandoned = true;
      return sessionRecord;
    }

    // Run ATTEMPTS_PER_SESSION attempts
    let feedbackSeenCount = 0;
    for (let i = 0; i < ATTEMPTS_PER_SESSION; i++) {
      const attempt = await simulateAttempt(page, persona, currentLevel, i, sessionId);
      sessionRecord.attempts.push(attempt);

      if (attempt.feedbackShownMs !== null) {
        feedbackSeenCount++;
      }

      // Check mid-session abandon (after attempt 2)
      if (i >= 1 && Math.random() < persona.abandonProbability() * 0.4) {
        sessionRecord.abandoned = true;
        break;
      }
    }

    // Session complete if we did all attempts OR saw the completion screen
    const completionScreen = page.locator('[data-testid="completion-screen"]');
    const completionVisible = await completionScreen.isVisible({ timeout: 3000 }).catch(() => false);

    if (completionVisible || sessionRecord.attempts.length >= ATTEMPTS_PER_SESSION) {
      sessionRecord.completed = true;
    }

    // Assertion: every session must have seen feedback-overlay at least once
    // per harness requirements
    if (feedbackSeenCount === 0 && !sessionRecord.abandoned) {
      consoleErrors.push('[harness] feedback-overlay never shown in this session');
    }

    // Optionally advance level if router offers it
    try {
      const nextLevelBtn = page.locator('[data-testid="next-level-btn"], [data-testid="advance-btn"]');
      const canAdvance = await nextLevelBtn.isVisible({ timeout: 1500 });
      if (canAdvance && currentLevel < 9) {
        currentLevel++;
        await nextLevelBtn.click();
      }
    } catch { /* no advance offered */ }
    sessionRecord.finalLevel = currentLevel;

    // Capture performance metrics
    try {
      const metrics = await page.metrics();
      sessionRecord.taskDurationMs = (metrics['TaskDuration'] as number ?? null);
    } catch { /* metrics not available */ }

  } catch (err: unknown) {
    sessionRecord.crashed = true;
    consoleErrors.push(`[crash] ${err instanceof Error ? err.message : String(err)}`);
  } finally {
    sessionRecord.totalDurationMs = Date.now() - sessionStart;
    await context.close();
  }

  return sessionRecord;
}

// ── Playwright test entrypoint ───────────────────────────────────────────────

test.describe('Synthetic Playtest Harness', () => {
  test.setTimeout(TOTAL_TIMEOUT_MS);

  test('runs all persona sessions and validates completion/crash/latency criteria', async ({ browser }) => {
    const runStart = Date.now();

    for (const persona of ALL_PERSONAS) {
      for (let i = 0; i < SESSIONS_PER_PERSONA; i++) {
        // Abort entire run if wall-clock budget exhausted
        if (Date.now() - runStart > TOTAL_TIMEOUT_MS - SESSION_TIMEOUT_MS) {
          console.warn(`[playtest] Time budget nearly exhausted; stopping at session ${allSessions.length}`);
          break;
        }

        const record = await Promise.race([
          runSession(browser, persona, i),
          // Session hard timeout — kill and continue
          new Promise<SessionRecord>(resolve =>
            setTimeout(() => resolve({
              sessionId: `${persona.name}-${i}-timeout`,
              personaName: persona.name,
              startLevel: 1,
              finalLevel: 1,
              attempts: [],
              completed: false,
              abandoned: false,
              crashed: true,
              consoleErrors: ['[harness] session timed out after 90s'],
              totalDurationMs: SESSION_TIMEOUT_MS,
              taskDurationMs: null,
            }), SESSION_TIMEOUT_MS)
          ),
        ]);

        allSessions.push(record);
        process.stdout.write(
          `\r[playtest] ${allSessions.length}/${ALL_PERSONAS.length * SESSIONS_PER_PERSONA} sessions (${persona.name} #${i + 1})`
        );
      }
    }

    console.log('\n[playtest] All sessions complete. Aggregating...');

    const report = aggregate(allSessions);
    const reportPath = saveReport(report);
    printSummary(report);
    console.log(`[playtest] Report saved to: ${reportPath}`);

    // ── Assertions ──────────────────────────────────────────────────────────

    // Zero uncaught JS errors across all sessions (per harness requirements)
    const sessionErrors = allSessions
      .filter(s => s.consoleErrors.some(e => e.startsWith('[uncaught]')))
      .map(s => `${s.sessionId}: ${s.consoleErrors.filter(e => e.startsWith('[uncaught]')).join('; ')}`);

    expect(
      sessionErrors,
      `Uncaught JS errors detected:\n${sessionErrors.join('\n')}`
    ).toHaveLength(0);

    // Zero unhandled rejections
    const rejectionErrors = allSessions
      .filter(s => s.consoleErrors.some(e => e.includes('UnhandledPromiseRejection')))
      .length;
    expect(rejectionErrors, 'Unhandled promise rejections detected').toBe(0);

    // Every non-abandoned session must have seen feedback-overlay at least once
    const noFeedbackSessions = allSessions.filter(
      s => !s.abandoned && !s.crashed && s.attempts.filter(a => a.feedbackShownMs !== null).length === 0
    );
    expect(
      noFeedbackSessions,
      `Sessions that never reached feedback-overlay: ${noFeedbackSessions.map(s => s.sessionId).join(', ')}`
    ).toHaveLength(0);

    // Overall pass/fail per aggregated criteria
    expect(
      report.passed,
      `Playtest FAILED:\n${report.failReasons.join('\n')}`
    ).toBe(true);
  });
});
