/**
 * BootScene — minimal startup scene.
 * Requests durable storage, reads lastUsedStudentId, transitions to PreloadScene.
 * per runtime-architecture.md §5 (Boot Sequence steps 3–4)
 * per persistence-spec.md §3.2 (persist grant), §5 (bootstrap)
 * per C5 — only allowed localStorage key is lastUsedStudentId
 */

import * as Phaser from 'phaser';
import { TestHooks } from './utils/TestHooks';

const LAST_STUDENT_KEY = 'questerix.lastUsedStudentId'; // per lastUsedStudent.ts + C5

export class BootScene extends Phaser.Scene {
  private lastStudentId: string | null = null;
  /** Guard against double-advance when test button fires mid-async-boot. */
  private _advanced = false;

  constructor() {
    super({ key: 'BootScene' });
  }

  create(): void {
    console.info('[BootScene] Starting boot sequence…');

    // ── Test hooks ─────────────────────────────────────────────────────────
    TestHooks.unmountAll();
    TestHooks.mountSentinel('boot-scene');
    // boot-start-btn: interactive overlay that forwards to PreloadScene transition
    TestHooks.mountInteractive(
      'boot-start-btn',
      () => {
        void this.advanceToPreload();
      },
      { width: '200px', height: '60px', top: '50%', left: '50%' }
    );

    // Fire-and-forget: async work runs without returning a Promise to Phaser,
    // preventing Phaser 4 from treating the returned Promise as a scene restart signal.
    void this._bootAsync();
  }

  private async _bootAsync(): Promise<void> {
    // ── Step 1: Request durable IndexedDB storage ──────────────────────────
    // per runtime-architecture.md §5.3e — called after first engagement signal
    // We attempt immediately and degrade gracefully if denied.
    try {
      const { ensurePersistenceGranted } = await import('../persistence/db');
      const granted = await ensurePersistenceGranted();
      console.info(`[BootScene] Persistence granted: ${granted}`);

      // Sync state with deviceMeta so SettingsScene shows correct status
      const { deviceMetaRepo } = await import('../persistence/repositories/deviceMeta');
      await deviceMetaRepo.updatePreferences({ persistGranted: granted });
    } catch (err) {
      // Volatile mode — game continues without durable storage per §10 (failure modes)
      console.warn('[BootScene] Persistence grant failed — running in volatile mode:', err);
    }

    // ── Step 1b: Seed curriculum on first boot ─────────────────────────────
    // per persistence-spec.md §5 step 4 — bulkPut static stores after DB open.
    try {
      const { seedIfEmpty } = await import('../curriculum/seed');
      const result = await seedIfEmpty();
      if (result.alreadySeeded) {
        console.info(`[BootScene] Curriculum already seeded (${result.seeded} templates)`);
      } else {
        console.info(`[BootScene] Curriculum seeded: ${result.seeded} templates`);
      }
    } catch (err) {
      // Tolerate failure — game runs with synthetic content per runtime-architecture.md §10
      console.warn('[BootScene] Curriculum seed failed — continuing in synthetic mode:', err);
    }

    // ── Step 2: Read lastUsedStudentId from localStorage ───────────────────
    // per runtime-architecture.md §5.4a, C5 (only allowed localStorage key)
    try {
      this.lastStudentId = localStorage.getItem(LAST_STUDENT_KEY);
      if (this.lastStudentId) {
        console.info(`[BootScene] Found last student: ${this.lastStudentId}`);

        // Verify student still exists in DB
        const { studentRepo } = await import('../persistence/repositories/student');
        const student = await studentRepo.get(this.lastStudentId as import('@/types').StudentId);
        if (!student) {
          console.info('[BootScene] Last student not found in DB — clearing pointer');
          this.lastStudentId = null;
          localStorage.removeItem(LAST_STUDENT_KEY);
        }
      }

      // ── First launch: no student yet — auto-create an anonymous one ──────
      if (!this.lastStudentId) {
        const { studentRepo } = await import('../persistence/repositories/student');
        const { nanoid } = await import('nanoid').catch(() => ({
          nanoid: () => `s-${Date.now()}`,
        }));
        const newId = nanoid() as import('@/types').StudentId;
        await studentRepo.create({
          id: newId,
          displayName: 'Player',
          avatarConfig: {},
          gradeLevel: 1,
          localOnly: true,
          lastActiveAt: Date.now(),
        });
        localStorage.setItem(LAST_STUDENT_KEY, newId);
        this.lastStudentId = newId;
        console.info(`[BootScene] Created anonymous student: ${newId}`);
      }
    } catch (err) {
      // Storage read/write failed — continue without resume context. per §10 (failure modes)
      console.warn('[BootScene] Could not read/create lastUsedStudentId:', err);
      this.lastStudentId = null;
    }

    // ── Step 3: Transition to PreloadScene ─────────────────────────────────
    // per runtime-architecture.md §5 — BootScene → PreloadScene → MenuScene
    // Only block auto-advance when ?testHooks=1 is explicitly in the URL
    // (i.e. a Playwright e2e run, where we wait for an explicit engagement
    // click to ensure reliable testing of the engagement flow and audio
    // context). In regular dev/prod mode the game auto-starts so the
    // developer can see it without a test harness — using
    // TestHooks.isEnabled() here re-introduces a blank-screen bug because
    // it returns true in dev mode.
    const isExplicitTestRun =
      typeof window !== 'undefined' &&
      new URLSearchParams(window.location.search).get('testHooks') === '1';

    if (!isExplicitTestRun) {
      this.advanceToPreload();
    } else {
      console.info('[BootScene] Test hooks enabled — waiting for boot-start-btn click…');
    }
  }

  private advanceToPreload(): void {
    if (this._advanced) return; // guard against double-advance
    this._advanced = true;
    TestHooks.unmount('boot-start-btn');
    TestHooks.unmount('boot-scene');
    this.scene.start('PreloadScene', { lastStudentId: this.lastStudentId });
  }
}
