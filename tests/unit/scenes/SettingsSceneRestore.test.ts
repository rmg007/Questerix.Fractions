/**
 * Unit tests for SettingsScene backup-restore UI wiring.
 *
 * Covers the `doRestore` method and the file-input cleanup on shutdown.
 * Does NOT re-test restoreFromFile in isolation — that is covered by
 * tests/integration/persistence.test.ts. This file proves the
 * SettingsScene wiring: message shown on success/failure, and DOM cleanup.
 *
 * Why bypass super()?
 *   SettingsScene extends Phaser.Scene. Constructing a real Phaser scene
 *   requires a WebGL/Canvas context unavailable in jsdom. We use
 *   Object.create(SettingsScene.prototype) and stub only the Phaser APIs
 *   the methods under test actually call (add.text, time.delayedCall).
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Mock Phaser before importing anything that imports it ──────────────────
vi.mock('phaser', () => {
  class Scene {}
  return {
    Scene,
    GameObjects: { Container: class {}, Text: class {}, Rectangle: class {}, Graphics: class {} },
    default: { Scene },
  };
});

// Mock other imports pulled in by SettingsScene that need real modules
vi.mock('@/scenes/utils/sceneTransition', () => ({ fadeAndStart: vi.fn() }));
vi.mock('@/components/PreferenceToggle', () => ({
  PreferenceToggle: class { destroy() {} static destroyAll() {} },
}));
vi.mock('@/scenes/utils/TestHooks', () => ({
  TestHooks: {
    unmountAll: vi.fn(),
    mountSentinel: vi.fn(),
    mountInteractive: vi.fn(),
    unmount: vi.fn(),
    isEnabled: vi.fn(() => false),
  },
  testHooksEnabled: vi.fn(() => false),
}));
vi.mock('@/persistence/db', () => ({
  db: {
    delete: vi.fn(),
    students: {},
    sessions: {},
    attempts: {},
    skillMastery: {},
    deviceMeta: {},
    bookmarks: {},
    sessionTelemetry: {},
    hintEvents: {},
  },
}));
vi.mock('@/persistence/lastUsedStudent', () => ({
  lastUsedStudent: { clear: vi.fn() },
}));

// ── Mock backup module — controls restoreFromFile resolution/rejection ─────
const mockRestoreFromFile = vi.fn<(file: File) => Promise<{ added: number; skipped: number }>>();
vi.mock('@/persistence/backup', () => ({
  backupToFile: vi.fn(),
  restoreFromFile: (...args: Parameters<typeof mockRestoreFromFile>) => mockRestoreFromFile(...args),
}));

// eslint-disable-next-line import/order
import { SettingsScene } from '@/scenes/SettingsScene';

// ── Type helper ────────────────────────────────────────────────────────────

type AnyScene = SettingsScene & {
  doRestore: (file?: File) => Promise<void>;
  setupFileInput: () => void;
  cleanup: () => void;
  shutdown: () => void;
  showRestoreStatus: (msg: string, isError?: boolean) => void;
  fileInput: HTMLInputElement | null;
  restoreStatusText: { destroy: () => void } | null;
  toggles: Array<{ destroy: () => void }>;
  _keyHandler: ((e: KeyboardEvent) => void) | null;
  _restoreTimerId: number | null;
  _restoreIntervalId: number | null;
  _restoreCountdownText: { destroy: () => void } | null;
  _restoreCancelGraphic: { destroy: () => void } | null;
  _restoreCancelBtnText: { destroy: () => void } | null;
  _restoreCancelHit: { destroy: () => void } | null;
  add: {
    text: (x: number, y: number, msg: string, style: object) => {
      setOrigin: (n: number) => { setDepth: (n: number) => object };
    };
  };
  time: {
    delayedCall: (ms: number, cb: () => void) => void;
  };
};

// ── Scene factory ──────────────────────────────────────────────────────────

function makeScene(): AnyScene {
  const scene = Object.create(SettingsScene.prototype) as AnyScene;

  // Initialize fields read by doRestore, showRestoreStatus, cleanup, shutdown
  scene.restoreStatusText = null;
  scene.fileInput = null;
  scene.toggles = [];
  scene._keyHandler = null;
  scene._restoreTimerId = null;
  scene._restoreIntervalId = null;
  scene._restoreCountdownText = null;
  scene._restoreCancelGraphic = null;
  scene._restoreCancelBtnText = null;
  scene._restoreCancelHit = null;

  // Track the last message passed to add.text() for assertions
  const capturedText = { msg: '' };

  scene.add = {
    text: (_x: number, _y: number, msg: string, _style: object) => ({
      setOrigin: (_n: number) => ({
        setDepth: (_d: number) => {
          capturedText.msg = msg;
          return { destroy: vi.fn(), setText: vi.fn() };
        },
      }),
      destroy: vi.fn(),
      setText: vi.fn(),
    }),
    graphics: () => ({
      fillStyle: vi.fn(function () { return this; }),
      fillRoundedRect: vi.fn(function () { return this; }),
      setDepth: vi.fn(function () { return this; }),
      destroy: vi.fn(),
    }),
    rectangle: () => ({
      setInteractive: vi.fn(function () { return this; }),
      setDepth: vi.fn(function () { return this; }),
      on: vi.fn(),
      destroy: vi.fn(),
      emit: vi.fn(),
      setVisible: vi.fn(),
    }),
  };

  scene.time = {
    delayedCall: vi.fn(),
  };

  // Expose captured text so tests can assert on it
  (scene as unknown as { _capturedText: typeof capturedText })._capturedText = capturedText;

  return scene;
}

function capturedStatus(scene: AnyScene): string {
  return (scene as unknown as { _capturedText: { msg: string } })._capturedText.msg;
}

// ── Setup ──────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
  // Prevent the reload triggered on success from interfering with tests
  // Mock all timer functions used by startRestoreCountdown and _clearRestoreCountdown
  vi.stubGlobal('window', {
    setTimeout: vi.fn(),
    clearTimeout: vi.fn(),
    setInterval: vi.fn(),
    clearInterval: vi.fn(),
  });
});

// ── Happy path ─────────────────────────────────────────────────────────────

describe('SettingsScene doRestore — happy path', () => {
  it('shows "Restored N records — reloading…" when restoreFromFile resolves', async () => {
    mockRestoreFromFile.mockResolvedValue({ added: 7, skipped: 0 });

    const scene = makeScene();
    const file = new File(['{}'], 'backup.json', { type: 'application/json' });
    await scene.doRestore(file);

    expect(capturedStatus(scene)).toBe('Restored 7 records — reloading…');
  });

  it('shows "Restored 0 records — reloading…" when backup was empty but valid', async () => {
    mockRestoreFromFile.mockResolvedValue({ added: 0, skipped: 3 });

    const scene = makeScene();
    const file = new File(['{}'], 'backup.json', { type: 'application/json' });
    await scene.doRestore(file);

    expect(capturedStatus(scene)).toBe('Restored 0 records — reloading…');
  });
});

// ── Error paths ────────────────────────────────────────────────────────────

describe('SettingsScene doRestore — error paths', () => {
  it('shows "not a valid backup file" when restoreFromFile throws invalid JSON', async () => {
    mockRestoreFromFile.mockRejectedValue(new Error('backup.restore: invalid JSON'));

    const scene = makeScene();
    const file = new File(['not-json'], 'bad.json', { type: 'application/json' });
    await scene.doRestore(file);

    expect(capturedStatus(scene)).toBe('Error: not a valid backup file');
  });

  it('shows "incompatible backup file" when restoreFromFile throws unsupported schema version', async () => {
    mockRestoreFromFile.mockRejectedValue(
      new Error('backup.restore: unsupported schema version 99 (expected 1)')
    );

    const scene = makeScene();
    const file = new File(['{}'], 'old.json', { type: 'application/json' });
    await scene.doRestore(file);

    expect(capturedStatus(scene)).toBe('Error: incompatible backup file');
  });

  it('shows generic fallback for unexpected errors', async () => {
    mockRestoreFromFile.mockRejectedValue(new Error('IndexedDB quota exceeded'));

    const scene = makeScene();
    const file = new File(['{}'], 'backup.json', { type: 'application/json' });
    await scene.doRestore(file);

    expect(capturedStatus(scene)).toBe('Restore failed — please try again');
  });

  it('returns early without calling restoreFromFile when no file is provided', async () => {
    const scene = makeScene();
    await scene.doRestore(undefined);

    expect(mockRestoreFromFile).not.toHaveBeenCalled();
    expect(capturedStatus(scene)).toBe('');
  });
});

// ── DOM cleanup on shutdown ────────────────────────────────────────────────

describe('SettingsScene file input cleanup', () => {
  it('removes the file input element from the DOM when shutdown() is called', () => {
    const scene = makeScene();

    // Simulate the file input that setupFileInput() creates and appends
    const input = document.createElement('input');
    input.type = 'file';
    input.style.display = 'none';
    document.body.appendChild(input);
    scene.fileInput = input;

    expect(input.isConnected).toBe(true);

    // shutdown() is the public Phaser lifecycle hook (wraps cleanup())
    scene.shutdown();

    expect(input.isConnected).toBe(false);
    expect(scene.fileInput).toBeNull();
  });

  it('handles shutdown gracefully when no file input was created', () => {
    const scene = makeScene();
    scene.fileInput = null;

    expect(() => scene.shutdown()).not.toThrow();
  });
});
