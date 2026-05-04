/**
 * Curriculum seed — bootstrap sequence per persistence-spec.md §5.
 * Handles version comparison, store wiping, and bulk seeding.
 * per persistence-spec.md §5 (bootstrap sequence steps 2–4)
 * per runtime-architecture.md §5 (BootScene step 3c — static seed)
 */

import { db } from '../persistence/db';
import { deviceMetaRepo } from '../persistence/repositories/deviceMeta';
import { questionTemplateRepo } from '../persistence/repositories/questionTemplate';
import { deriveLevelGroup, type LevelGroup } from './levelGroup';
import { loadCurriculumBundle, type ParsedBundle } from './loader';
import { log } from '../lib/log';

// ── APP_CONTENT_VERSION ────────────────────────────────────────────────────

/**
 * Content version baked into the build.
 * Bumped when curriculum content changes significantly (new activities, misconceptions, etc.).
 * Must match CurriculumBundle.contentVersion for no wipe.
 * Per persistence-spec.md §5 step 3.
 */
export const APP_CONTENT_VERSION = '1.0.0';

export interface SeedResult {
  seeded: number;
  alreadySeeded: boolean;
  contentVersion: string;
  wiped: boolean;
}

// ── Concurrency guard (R1) ────────────────────────────────────────────────

let _seeding: Promise<SeedResult> | null = null;

// ── Seed entrypoint ────────────────────────────────────────────────────────

/**
 * Bootstrap curriculum on every app load.
 * per persistence-spec.md §5 (bootstrap sequence)
 * Safe to call on every boot — idempotent. Uses mutex to prevent concurrent reseeding (R1).
 * Never throws: failure logs warnings and returns degraded state.
 */
export async function seedIfEmpty(): Promise<SeedResult> {
  if (!_seeding)
    _seeding = _doSeed().finally(() => {
      _seeding = null;
    });
  return _seeding;
}

/**
 * Internal seed implementation (actual logic, guarded by mutex).
 * Never called directly — always called through seedIfEmpty().
 */
async function _doSeed(): Promise<SeedResult> {
  try {
    // ── Step 2: Read or create deviceMeta ──────────────────────────────────
    // per persistence-spec.md §5 step 2

    const deviceMeta = await deviceMetaRepo.get();
    const isFirstBoot = deviceMeta.contentVersion === '';

    // ── Step 3: Compare versions and decide on wiping ──────────────────────
    // per persistence-spec.md §5 step 3

    const versionMatch = deviceMeta.contentVersion === APP_CONTENT_VERSION;
    let wiped = false;

    // Early return if no seeding needed (already seeded with correct version)
    if (versionMatch && !isFirstBoot) {
      const count = await questionTemplateRepo.count();
      if (count > 0) {
        return {
          seeded: count,
          alreadySeeded: true,
          contentVersion: deviceMeta.contentVersion,
          wiped: false,
        };
      }
    }

    // ── Step 4: Load and seed all static stores ────────────────────────────
    // per persistence-spec.md §5 step 4

    const bundle = await loadCurriculumBundle();

    // If version mismatch, wipe and reseed atomically within transaction (R2)
    if (!versionMatch && !isFirstBoot) {
      console.info(
        `[seedIfEmpty] Content version mismatch: ${deviceMeta.contentVersion} → ${APP_CONTENT_VERSION} (wiping & reseeding atomically)`
      );
      wiped = true;
    }

    const seeded = await seedAllStores(bundle, wiped);

    // Update deviceMeta with new version
    if (seeded > 0 || bundle.contentVersion !== deviceMeta.contentVersion) {
      await deviceMetaRepo.update({
        contentVersion: bundle.contentVersion || APP_CONTENT_VERSION,
      });
    }

    console.info(
      `[seedIfEmpty] Seeded ${seeded} total records (contentVersion: ${bundle.contentVersion || APP_CONTENT_VERSION})`
    );

    return {
      seeded,
      alreadySeeded: false,
      contentVersion: bundle.contentVersion || APP_CONTENT_VERSION,
      wiped,
    };
  } catch (err) {
    // Never crash the game over a missing curriculum. per runtime-architecture.md §10.
    console.error('[seedIfEmpty] Seed failed — game will use synthetic fallback:', err);
    return {
      seeded: 0,
      alreadySeeded: false,
      contentVersion: '',
      wiped: false,
    };
  }
}

// ── Helpers ────────────────────────────────────────────────────────────────

/**
 * Bulk seed all static stores from the curriculum bundle.
 * Optionally wipes stores first (atomically, within transaction) on version mismatch (R2).
 * Returns total record count seeded.
 * Phase 12.3: Validates malformed IDs, bundle shape, and levelGroup population.
 */
async function seedAllStores(bundle: ParsedBundle, shouldWipe: boolean = false): Promise<number> {
  let total = 0;

  // Pre-transform questionTemplates to add levelGroup before transaction
  // Phase 12.3: Guard against malformed template IDs before levelGroup derivation
  const templatesWithGroup = bundle.questionTemplates.map((t) => {
    if (!t.id || typeof t.id !== 'string' || !t.id.match(/^q:[a-z_]+:L[0-9]+:[0-9]{4}$/)) {
      log.warn('CURRICULUM', 'seed.malformed_template_id', { id: t.id });
    }
    return {
      ...t,
      levelGroup: deriveLevelGroup(t.id) satisfies LevelGroup,
    };
  });

  // Transaction wraps all seeds (and optional wipe) in one atomic operation per persistence-spec.md §5 (R2)
  await db.transaction(
    'rw',
    [
      db.curriculumPacks,
      db.standards,
      db.skills,
      db.activities,
      db.activityLevels,
      db.fractionBank,
      db.questionTemplates,
      db.misconceptions,
      db.hints,
    ],
    async () => {
      // Wipe atomically before reseeding if needed (R2)
      if (shouldWipe) {
        await Promise.all([
          db.curriculumPacks.clear(),
          db.standards.clear(),
          db.skills.clear(),
          db.activities.clear(),
          db.activityLevels.clear(),
          db.fractionBank.clear(),
          db.questionTemplates.clear(),
          db.misconceptions.clear(),
          db.hints.clear(),
        ]);
        console.info('[seedAllStores] Wiped all static stores within transaction');
      }

      // Phase 12.3: Guard against malformed bundle shape before seeding
      const badTemplates = bundle.questionTemplates.filter(
        (t) =>
          !t.id ||
          !t.archetype ||
          !t.payload ||
          !t.validatorId ||
          !Array.isArray(t.skillIds) ||
          t.skillIds.length === 0
      );
      if (badTemplates.length > 0) {
        log.warn('CURRICULUM', 'seed.invalid_templates_detected', {
          count: badTemplates.length,
          examples: badTemplates.slice(0, 3).map((t) => {
            const missing: string[] = [];
            if (!t.id) missing.push('id');
            if (!t.archetype) missing.push('archetype');
            if (!t.payload) missing.push('payload');
            if (!t.validatorId) missing.push('validatorId');
            if (!Array.isArray(t.skillIds) || t.skillIds.length === 0) missing.push('skillIds');
            return { id: t.id, missing };
          }),
        });
      }

      if (bundle.curriculumPacks.length > 0) {
        await db.curriculumPacks.bulkPut(bundle.curriculumPacks);
        total += bundle.curriculumPacks.length;
      }
      if (bundle.standards.length > 0) {
        await db.standards.bulkPut(bundle.standards);
        total += bundle.standards.length;
      }
      if (bundle.skills.length > 0) {
        await db.skills.bulkPut(bundle.skills);
        total += bundle.skills.length;
      }
      if (bundle.activities.length > 0) {
        await db.activities.bulkPut(bundle.activities);
        total += bundle.activities.length;
      }
      if (bundle.activityLevels.length > 0) {
        await db.activityLevels.bulkPut(bundle.activityLevels);
        total += bundle.activityLevels.length;
      }
      if (bundle.fractionBank.length > 0) {
        await db.fractionBank.bulkPut(bundle.fractionBank);
        total += bundle.fractionBank.length;
      }
      if (templatesWithGroup.length > 0) {
        // Phase 12.3: Assert levelGroup populated before bulkPut
        // levelGroup is an indexed field in the questionTemplates store
        // (db.ts: 'id, archetype, [archetype+difficultyTier], levelGroup') —
        // it MUST be persisted, not stripped. Without it, getByLevel() returns 0 rows.
        const missingGroup = templatesWithGroup.filter((t) => !t.levelGroup);
        if (missingGroup.length > 0) {
          log.error('CURRICULUM', 'seed.levelGroup_missing', {
            count: missingGroup.length,
            examples: missingGroup.slice(0, 3).map((t) => t.id),
          });
        }
        await db.questionTemplates.bulkPut(templatesWithGroup);
        total += templatesWithGroup.length;
      }
      if (bundle.misconceptions.length > 0) {
        await db.misconceptions.bulkPut(bundle.misconceptions);
        total += bundle.misconceptions.length;
      }
      if (bundle.hints.length > 0) {
        await db.hints.bulkPut(bundle.hints);
        total += bundle.hints.length;
      }
    }
  );

  return total;
}
