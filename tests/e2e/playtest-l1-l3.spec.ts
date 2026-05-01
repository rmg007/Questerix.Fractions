/**
 * Playtest synthetic-replay backstop: L1 → L2 → L3 full session loop.
 *
 * Walks a fresh device through three levels (5 questions each), exits to the
 * menu, opens Settings, taps "Export My Backup", captures the download, then
 * mirrors the top-level assertions from `validation-data/scripts/check.py` so
 * a regression in the export pipeline trips before a kid is in the room.
 *
 * Per the task brief this test does NOT validate gameplay correctness — the
 * unit suite owns that. The interaction handlers below intentionally pick the
 * lowest-friction "submit any answer" path for each archetype because the
 * goal is shape-of-export, not curriculum accuracy.
 *
 * Coordinates with the parallel `_fixture.ts` parse-error fix: this test
 * imports from the canonical `./_fixture` per the existing pattern in
 * level01.spec.ts. If the fixture is broken, this file will not enumerate
 * until that lands — accepted per task instructions.
 */
import { test, expect, type Page, type Locator } from './_fixture';

// ── Outcome enum mirrored from src/types/entities.ts (attemptSchema) ─────────
const VALID_OUTCOMES = new Set(['EXACT', 'CLOSE', 'WRONG', 'ASSISTED', 'ABANDONED']);

// ── Backup envelope shape (subset we assert on) ──────────────────────────────
// Matches `BackupEnvelope` in src/persistence/backup.ts. We avoid pulling that
// type directly because the test must keep working even when the runtime
// types churn — the structural assertions below are what `check.py` cares
// about, and that is the contract we are guarding here.
interface BackupAttempt {
  sessionId: string;
  studentId: string;
  outcome: string;
  responseMs: number;
  submittedAt: number;
}

interface BackupSession {
  id: string;
  studentId: string;
  levelNumber: number;
}

interface BackupStudent {
  id: string;
  displayName: string;
}

interface BackupDeviceMeta {
  contentVersion?: string;
}

interface BackupEnvelope {
  version: number;
  exportedAt: number;
  tables: {
    students: BackupStudent[];
    sessions: BackupSession[];
    attempts: BackupAttempt[];
    deviceMeta: BackupDeviceMeta[];
    skillMastery: unknown[];
    bookmarks: unknown[];
    sessionTelemetry: unknown[];
    hintEvents: unknown[];
    misconceptionFlags: unknown[];
    progressionStat: unknown[];
  };
}

/**
 * Submit one answer for whichever archetype is currently mounted.
 *
 * The L1 path uses `partition-target` (PartitionInteraction) — clicking it
 * commits the current handle position so any value submits.
 *
 * For L2/L3 the curriculum can route to `partition`, `identify`,
 * `equal_or_not`, or `label`. We probe each archetype's primary commit
 * affordance in priority order and click the first one we find. Touchpoints:
 *   - PartitionInteraction.ts → `partition-target`
 *   - IdentifyInteraction.ts  → `identify-option-0` then `identify-submit`
 *   - LabelInteraction.ts     → `label-tile-0` then `label-submit`
 *   - EqualOrNotInteraction.ts → `equal-btn` (always submits — answer="equal")
 *
 * Whatever we submit goes through the validator and produces a feedback
 * overlay regardless of correctness, which is all this backstop needs.
 */
async function submitOneAnswer(page: Page): Promise<void> {
  const partitionTarget = page.locator('[data-testid="partition-target"]');
  if (await partitionTarget.isVisible().catch(() => false)) {
    await partitionTarget.click({ force: true });
    return;
  }

  const identifyOption = page.locator('[data-testid="identify-option-0"]');
  if (await identifyOption.isVisible().catch(() => false)) {
    await identifyOption.click({ force: true });
    const identifySubmit = page.locator('[data-testid="identify-submit"]');
    await identifySubmit.click({ force: true });
    return;
  }

  const labelTile = page.locator('[data-testid="label-tile-0"]');
  if (await labelTile.isVisible().catch(() => false)) {
    await labelTile.click({ force: true });
    const labelSubmit = page.locator('[data-testid="label-submit"]');
    await labelSubmit.click({ force: true });
    return;
  }

  const equalBtn = page.locator('[data-testid="equal-btn"]');
  if (await equalBtn.isVisible().catch(() => false)) {
    await equalBtn.click({ force: true });
    return;
  }

  throw new Error(
    'submitOneAnswer: no known interaction testid is visible. ' +
      'Expected one of partition-target, identify-option-0, label-tile-0, equal-btn.'
  );
}

/** Wait for the per-question feedback overlay, then dismiss it. */
async function dismissFeedback(page: Page): Promise<void> {
  const feedbackOverlay = page.locator('[data-testid="feedback-overlay"]');
  await expect(feedbackOverlay).toBeVisible({ timeout: 8000 });
  const feedbackNext = page.locator('[data-testid="feedback-next-btn"]');
  // The overlay can auto-dismiss before we get here; force-click and swallow.
  await feedbackNext.click({ force: true, timeout: 1500 }).catch(() => {});
  await expect(feedbackOverlay).toBeHidden({ timeout: 8000 });
}

/**
 * Drive a level scene through five attempts and return when the
 * completion-screen sentinel appears. Caller is responsible for advancing.
 */
async function completeFiveAttempts(page: Page, sceneSelector: Locator): Promise<void> {
  await expect(sceneSelector).toBeVisible({ timeout: 15000 });
  for (let i = 1; i <= 5; i++) {
    await submitOneAnswer(page);
    if (i < 5) {
      await dismissFeedback(page);
    } else {
      // On the final attempt the LevelScene/Level01Scene transitions into the
      // SessionCompleteOverlay rather than another question. We still need to
      // tap "next" once to clear the feedback before the overlay paints.
      const feedbackOverlay = page.locator('[data-testid="feedback-overlay"]');
      await expect(feedbackOverlay).toBeVisible({ timeout: 8000 });
      await page
        .locator('[data-testid="feedback-next-btn"]')
        .click({ force: true, timeout: 1500 })
        .catch(() => {});
    }
  }
  await expect(page.locator('[data-testid="completion-screen"]')).toBeVisible({ timeout: 15000 });
}

test.describe('Playtest backstop — L1 → L2 → L3 full export', () => {
  test.beforeEach(async ({ page }) => {
    // Mirror level01.spec.ts: navigate to a fresh page and click through Boot.
    await page.goto('/');
    await page.locator('[data-testid="boot-start-btn"]').click();
    await expect(page.locator('[data-testid="menu-scene"]')).toBeVisible({ timeout: 15000 });
  });

  test.afterEach(async ({ page }) => {
    // Clear IndexedDB so subsequent tests start from a fresh device profile.
    // We ignore failures because the page may already be torn down.
    await page
      .evaluate(async () => {
        try {
          // Prefer the modern API where available.
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const dbs = await (indexedDB as unknown as { databases?: () => Promise<{ name?: string }[]> })
            .databases?.();
          if (dbs) {
            await Promise.all(
              dbs
                .map((d) => d.name)
                .filter((n): n is string => !!n)
                .map(
                  (n) =>
                    new Promise<void>((res) => {
                      const req = indexedDB.deleteDatabase(n);
                      req.onsuccess = () => res();
                      req.onerror = () => res();
                      req.onblocked = () => res();
                    })
                )
            );
          }
          localStorage.clear();
        } catch {
          /* swallow — best-effort cleanup */
        }
      })
      .catch(() => {});
  });

  test('completes L1 → L2 → L3, exports backup, JSON envelope passes check.py shape', async ({
    page,
  }) => {
    // ── L1 ──────────────────────────────────────────────────────────────────
    // level-card-L1 opens LevelMapScene; map-level-1 starts L1 (Level01Scene).
    await page.locator('[data-testid="level-card-L1"]').click();
    await expect(page.locator('[data-testid="level-map-scene"]')).toBeVisible({ timeout: 15000 });
    await page.locator('[data-testid="map-level-1"]').click();

    const l1Scene = page.locator('[data-testid="level01-scene"]');
    await completeFiveAttempts(page, l1Scene);

    // Advance L1 → L2 via Next Level button on the SessionCompleteOverlay.
    await page.locator('[data-testid="next-level-btn"]').click({ force: true });

    // ── L2 ──────────────────────────────────────────────────────────────────
    const l2Scene = page.locator('[data-testid="level02-scene"]');
    await completeFiveAttempts(page, l2Scene);
    await page.locator('[data-testid="next-level-btn"]').click({ force: true });

    // ── L3 ──────────────────────────────────────────────────────────────────
    const l3Scene = page.locator('[data-testid="level03-scene"]');
    await completeFiveAttempts(page, l3Scene);

    // ── Back to Menu ────────────────────────────────────────────────────────
    // The L3 SessionCompleteOverlay's "Back to Menu" button has no testid;
    // its A11yLayer mirror exposes data-testid="session-complete-menu" via
    // SessionCompleteOverlay.addMenuButton().
    // TODO: needs scene-level testid for the Back-to-Menu button on the
    // canvas; falling back to the A11yLayer DOM mirror for now.
    await page.locator('[data-testid="session-complete-menu"]').click({ force: true });
    await expect(page.locator('[data-testid="menu-scene"]')).toBeVisible({ timeout: 15000 });

    // ── Settings → Export ───────────────────────────────────────────────────
    // MenuScene's gear icon does not expose a TestHooks overlay; its A11yLayer
    // mirror (data-testid="a11y-settings") is the only DOM-addressable handle.
    // TODO: needs scene-level testid for the Settings gear in MenuScene
    // (currently relying on the A11yLayer button data-testid="a11y-settings").
    await page.locator('[data-testid="a11y-settings"]').click({ force: true });
    await expect(page.locator('[data-testid="settings-scene"]')).toBeVisible({ timeout: 15000 });

    const exportBtn = page.locator('[data-testid="settings-export-btn"]');
    await expect(exportBtn).toBeVisible({ timeout: 5000 });

    // Capture the file emitted by `backupToFile()` — it triggers a synthetic
    // <a download="questerix-YYYY-MM-DD.json"> click, which Playwright sees
    // as a Page download event.
    const downloadPromise = page.waitForEvent('download', { timeout: 15000 });
    await exportBtn.click({ force: true });
    const download = await downloadPromise;

    // Filename sanity — `backupToFile()` builds it from `todayISO()`.
    expect(download.suggestedFilename()).toMatch(/^questerix-\d{4}-\d{2}-\d{2}\.json$/);

    const downloadPath = await download.path();
    expect(downloadPath, 'Playwright should materialise the download to disk').toBeTruthy();

    // Read via Playwright's helper rather than node:fs so the test does not
    // depend on the runner's working directory.
    const stream = await download.createReadStream();
    const chunks: Buffer[] = [];
    for await (const chunk of stream) {
      chunks.push(Buffer.from(chunk));
    }
    const raw = Buffer.concat(chunks).toString('utf-8');
    const envelope = JSON.parse(raw) as BackupEnvelope;

    // ── Envelope shape — mirrors check.py validate_envelope() ───────────────
    expect(envelope.version, 'envelope.version must equal SUPPORTED_ENVELOPE_VERSION').toBe(1);
    expect(typeof envelope.exportedAt, 'envelope.exportedAt must be numeric').toBe('number');
    expect(envelope.tables, 'envelope.tables must be present').toBeTruthy();

    // deviceMeta singleton must have a non-empty contentVersion — check.py
    // logs this on every run and treats `<missing>` as a smell.
    expect(envelope.tables.deviceMeta.length, 'deviceMeta singleton must exist').toBeGreaterThan(0);
    const deviceMeta = envelope.tables.deviceMeta[0]!;
    expect(typeof deviceMeta.contentVersion).toBe('string');
    expect((deviceMeta.contentVersion ?? '').length).toBeGreaterThan(0);

    // ── Cardinality — one student, three sessions, ≥ fifteen attempts ──────
    expect(envelope.tables.students.length, 'at least one student record').toBeGreaterThanOrEqual(1);
    expect(envelope.tables.sessions.length, 'one session per level played').toBeGreaterThanOrEqual(
      3
    );
    expect(
      envelope.tables.attempts.length,
      'five attempts × three levels minimum'
    ).toBeGreaterThanOrEqual(15);

    // ── Outcome enum — mirrors check.py validate_attempts() ────────────────
    for (const att of envelope.tables.attempts) {
      expect(VALID_OUTCOMES.has(att.outcome), `outcome "${att.outcome}" must be a valid enum`).toBe(
        true
      );
    }
  });
});
