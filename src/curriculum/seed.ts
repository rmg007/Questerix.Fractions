/**
 * Curriculum seed — bootstrap sequence per persistence-spec.md §5.
 * Handles version comparison, store wiping, and bulk seeding.
 * per persistence-spec.md §5 (bootstrap sequence steps 2–4)
 * per runtime-architecture.md §5 (BootScene step 3c — static seed)
 */

import { db } from '../persistence/db';
import { deviceMetaRepo } from '../persistence/repositories/deviceMeta';
import { questionTemplateRepo } from '../persistence/repositories/questionTemplate';
import { loadCurriculumBundle, type ParsedBundle } from './loader';
import type { DeviceMeta } from '../types';

// ── APP_CONTENT_VERSION ────────────────────────────────────────────────────

/**
 * Content version baked into the build.
 * Bumped when curriculum content changes significantly (new activities, misconceptions, etc.).
 * Must match CurriculumBundle.contentVersion for no wipe.
 * Per persistence-spec.md §5 step 3.
 */
const APP_CONTENT_VERSION = '1.0.0';

// Derive levelGroup from template ID format 'q:<arch>:L{N}:NNNN'
function deriveLevelGroup(id: string): '01-02' | '03-05' | '06-09' {
  const match = /L(\d+):/i.exec(id);
  const matched = match?.[1];
  if (!matched) {
    console.warn(`[deriveLevelGroup] Failed to extract level from template ID "${id}", defaulting to 01-02`);
    return '01-02';
  }
  const level = parseInt(matched, 10);
  if (level <= 2) return '01-02';
  if (level <= 5) return '03-05';
  return '06-09';
}

export interface SeedResult {
  seeded: number;
  alreadySeeded: boolean;
  contentVersion: string;
  wiped: boolean;
}

// ── Seed entrypoint ────────────────────────────────────────────────────────

/**
 * Bootstrap curriculum on every app load.
 * per persistence-spec.md §5 (bootstrap sequence)
 * Safe to call on every boot — idempotent.
 * Never throws: failure logs warnings and returns degraded state.
 */
export async function seedIfEmpty(): Promise<SeedResult> {
  try {
    // ── Step 2: Read or create deviceMeta ──────────────────────────────────
    // per persistence-spec.md §5 step 2

    let deviceMeta = await db.deviceMeta.toCollection().first();
    let isFirstBoot = false;

    if (!deviceMeta) {
      isFirstBoot = true;
      // Create singleton on first launch
      const newMeta: DeviceMeta = {
        installId: crypto.randomUUID(),
        schemaVersion: 3,
        contentVersion: '',
        preferences: {
          audio: true,
          reduceMotion: false,
          highContrast: false,
          ttsLocale: 'en-US',
          largeTouchTargets: false,
          persistGranted: false,
        },
        lastBackupAt: null,
        lastRestoredAt: null,
        pendingSyncCount: 0,
        syncState: 'local',
      };
      await db.deviceMeta.add(newMeta);
      deviceMeta = newMeta;
      console.info(`[seedIfEmpty] First boot detected (installId: ${newMeta.installId})`);
    }

    // ── Step 3: Compare versions and decide on wiping ──────────────────────
    // per persistence-spec.md §5 step 3

    const versionMatch = deviceMeta.contentVersion === APP_CONTENT_VERSION;
    let wiped = false;

    if (!versionMatch && !isFirstBoot) {
      // Version mismatch → wipe all static stores
      console.info(
        `[seedIfEmpty] Content version mismatch: ${deviceMeta.contentVersion} → ${APP_CONTENT_VERSION} (wiping static stores)`,
      );
      await wipeStaticStores();
      wiped = true;
    }

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
    const seeded = await seedAllStores(bundle);

    // Update deviceMeta with new version
    if (seeded > 0 || bundle.contentVersion !== deviceMeta.contentVersion) {
      await deviceMetaRepo.update({
        contentVersion: bundle.contentVersion || APP_CONTENT_VERSION,
      });
    }

    console.info(`[seedIfEmpty] Seeded ${seeded} total records (contentVersion: ${bundle.contentVersion || APP_CONTENT_VERSION})`);

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
 * Wipe all static (curriculum) stores.
 * Safe to call — will be re-seeded immediately after.
 */
async function wipeStaticStores(): Promise<void> {
  const stores = [
    db.curriculumPacks,
    db.standards,
    db.skills,
    db.activities,
    db.activityLevels,
    db.fractionBank,
    db.questionTemplates,
    db.misconceptions,
    db.hints,
  ];

  await Promise.all(stores.map((store) => store.clear()));
  console.info('[seedIfEmpty] Wiped all static stores');
}

/**
 * Bulk seed all static stores from the curriculum bundle.
 * Returns total record count seeded.
 */
async function seedAllStores(bundle: ParsedBundle): Promise<number> {
  let total = 0;

  // Pre-transform questionTemplates to add levelGroup before transaction
  const templatesWithGroup = bundle.questionTemplates.map((t) => ({
    ...t,
    levelGroup: deriveLevelGroup(t.id) as '01-02' | '03-05' | '06-09',
  }));

  // Transaction wraps all seeds in one atomic operation per persistence-spec.md §5
  await db.transaction('rw', [db.curriculumPacks, db.standards, db.skills, db.activities, db.activityLevels, db.fractionBank, db.questionTemplates, db.misconceptions, db.hints], async () => {
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
      await db.questionTemplates.bulkPut(templatesWithGroup as any);
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
  });

  return total;
}
