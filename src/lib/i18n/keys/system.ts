/**
 * System, menu, and mascot copy — tone: system (plain English allowed for clarity).
 *
 * This includes:
 *   - Offline indicator (connectivity status)
 *   - Menu navigation prompts (level selection)
 *   - Map toast messages (progression hints)
 *   - Mascot encouragement at key moments (session start, final question)
 *   - Welcome announcements for accessibility
 *   - Error/status messages (settings operations)
 */

import { registerCatalog, type Catalog } from '../catalog';

const SYSTEM_COPY: Catalog = {
  // ── Offline indicator ──────────────────────────────────────────────────
  'system.offline.banner': {
    text: 'You are offline — progress is saved on this device.',
    notes: 'Banner shown when connectivity is lost. Reassures about data safety.',
    tone: 'system',
  },
  'system.offline.announce': {
    text: 'You are offline.',
    notes: 'Accessibility announcement when device goes offline.',
    tone: 'system',
  },
  'system.online.announce': {
    text: 'Back online.',
    notes: 'Accessibility announcement when device comes back online.',
    tone: 'system',
  },

  // ── Menu / level selection ─────────────────────────────────────────────
  'menu.choose_level': {
    text: '🗺 Choose Level',
    notes: 'Button text to open the Adventure Map from menu.',
    tone: 'system',
  },
  'menu.welcome.announce': {
    text: 'Welcome to Questerix Fractions. Press Tab to find game controls, or click Play to open the Adventure Map.',
    notes: 'Accessibility announcement on menu scene entry. Guides navigation.',
    tone: 'system',
  },

  // ── Level Map (progression) ────────────────────────────────────────────
  'map.locked_level_toast': {
    text: 'Finish this one first!',
    notes: 'Toast shown when tapping a locked next level. Guides progression order.',
    tone: 'system',
  },

  // ── Mascot encouragement at question boundaries ────────────────────────
  'mascot.start.encourage.first': {
    text: "Ready? Let's go! 🚀",
    notes: 'Speech bubble shown before first question of a session.',
    tone: 'system',
  },
  'mascot.start.encourage.last': {
    text: "Last one! You've got this!",
    notes: 'Speech bubble shown before final question (question 5 of 5 in a session).',
    tone: 'system',
  },

  // ── Settings / backup operations (accessibility) ───────────────────────
  'settings.reset.announce': {
    text: 'Resetting device. Please wait.',
    notes: 'Accessibility announcement during device reset.',
    tone: 'system',
  },
  'settings.backup.download.success': {
    text: 'Backup downloaded successfully.',
    notes: 'Accessibility announcement after successful backup export.',
    tone: 'system',
  },
  'settings.backup.download.error': {
    text: 'Export failed. Please try again.',
    notes: 'Accessibility announcement when backup export fails.',
    tone: 'system',
  },
  'settings.backup.restore.success': {
    text: 'Restored {count} records successfully. Reloading…',
    notes: 'Accessibility announcement after successful restore. {count} = number of records.',
    tone: 'system',
  },
  'settings.backup.restore.error.incompatible': {
    text: 'Error: incompatible backup file.',
    notes: 'Accessibility announcement when backup file format is incompatible.',
    tone: 'system',
  },
  'settings.backup.restore.error.invalid': {
    text: 'Error: not a valid backup file.',
    notes: 'Accessibility announcement when backup file is corrupted or invalid.',
    tone: 'system',
  },
  'settings.backup.restore.error.generic': {
    text: 'Restore failed. Please try again.',
    notes: 'Accessibility announcement when backup restore fails.',
    tone: 'system',
  },

  // ── Quest Complete overlay ─────────────────────────────────────────────
  'quest.complete.announce.all': {
    text: 'Quest complete! You mastered all 9 levels!',
    notes: 'Accessibility announcement when student completes all levels.',
    tone: 'system',
  },

  // ── Recovery screens ───────────────────────────────────────────────────
  'recovery.title': {
    text: 'Something went wrong.',
    notes: 'Heading shown on the RecoveryScene error recovery screen.',
    tone: 'system',
  },
  'recovery.body': {
    text: 'Want to try again?',
    notes: 'Body text shown on the RecoveryScene error recovery screen.',
    tone: 'system',
  },
  'recovery.cta.retry': {
    text: 'Try again',
    notes: 'CTA button on RecoveryScene — reloads the originating scene.',
    tone: 'system',
  },
  'recovery.cta.menu': {
    text: 'Back to menu',
    notes: 'CTA button on RecoveryScene — returns to MenuScene.',
    tone: 'system',
  },
  'recovery.cta.reload': {
    text: 'Reload content',
    notes:
      'CTA on RecoveryScene curriculum-fail variant — triggers a full page reload to refresh the curriculum bundle.',
    tone: 'system',
  },
  'recovery.curriculum.title': {
    text: 'Content needs to be reloaded.',
    notes: 'Heading shown when curriculum schema validation fails at runtime.',
    tone: 'system',
  },
  'recovery.curriculum.body': {
    text: 'The game content could not load. Tap below to reload.',
    notes: 'Body text shown when curriculum schema validation fails at runtime.',
    tone: 'system',
  },

  // ── DB recovery screen ────────────────────────────────────────────────
  'db.recovery.title': {
    text: 'Your progress data looks broken.',
    notes: 'Heading on the DBRecoveryScene screen when DB integrity probe fails.',
    tone: 'system',
  },
  'db.recovery.body': {
    text: 'What would you like to do?',
    notes: 'Body text on the DBRecoveryScene screen.',
    tone: 'system',
  },
  'db.recovery.cta.backup': {
    text: 'Continue with last backup',
    notes: 'DBRecoveryScene CTA — routes to the backup restore flow.',
    tone: 'system',
  },
  'db.recovery.cta.fresh': {
    text: 'Start fresh',
    notes: 'DBRecoveryScene CTA — deletes the Dexie DB and restarts.',
    tone: 'system',
  },
  'db.recovery.cta.cancel': {
    text: 'Cancel',
    notes: 'DBRecoveryScene CTA — returns to BootScene without any change.',
    tone: 'system',
  },
};

registerCatalog(SYSTEM_COPY);

/** Re-exported for tests that want to introspect just this slice. */
export const SYSTEM_CATALOG = SYSTEM_COPY;
