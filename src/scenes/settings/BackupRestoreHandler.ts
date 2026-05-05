import * as Phaser from 'phaser';
import { BODY_FONT } from '../utils/levelTheme';
import { backupToFile, restoreFromFile } from '../../persistence/backup';
import { AccessibilityAnnouncer } from '../../components/AccessibilityAnnouncer';

const CW = 800;

export class BackupRestoreHandler {
  private scene: Phaser.Scene;
  private fileInput: HTMLInputElement | null = null;
  private statusText: Phaser.GameObjects.Text | null = null;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.setupFileInput();
  }

  private setupFileInput(): void {
    if (typeof document === 'undefined') return;
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.style.display = 'none';
    input.setAttribute('aria-hidden', 'true');
    input.addEventListener('change', () => {
      const file = input.files?.[0];
      if (file) void this.doRestore(file);
      input.value = '';
    });
    document.body.appendChild(input);
    this.fileInput = input;
  }

  triggerFilePicker(): void {
    this.fileInput?.click();
  }

  async doExport(y: number): Promise<void> {
    try {
      await backupToFile();
      this.showStatus('Saved! Check your downloads.', y);
      AccessibilityAnnouncer.announce('Backup downloaded successfully.');
    } catch (err) {
      this.showStatus('Export failed — please try again.', y, 3000, true);
      AccessibilityAnnouncer.announce('Export failed. Please try again.');
    }
  }

  async doRestore(file: File): Promise<void> {
    const y = 850; // Matches restore button y-position in SettingsScene (Phase 3 layout shift +90)
    try {
      const result = await restoreFromFile(file);
      this.showStatus(`Restored ${result.added} records — reloading…`, y);
      AccessibilityAnnouncer.announce(`Restored ${result.added} records successfully. Reloading…`);
      this.scene.time.delayedCall(3000, () => {
        if (typeof location !== 'undefined') location.reload();
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      if (msg.includes('unsupported schema version')) {
        this.showStatus('Error: incompatible backup file', y, 3000, true);
        AccessibilityAnnouncer.announce('Error: incompatible backup file.');
      } else if (msg.includes('invalid JSON')) {
        this.showStatus('Error: not a valid backup file', y, 3000, true);
        AccessibilityAnnouncer.announce('Error: not a valid backup file.');
      } else {
        this.showStatus('Restore failed — please try again', y, 3000, true);
        AccessibilityAnnouncer.announce('Restore failed. Please try again.');
      }
    }
  }

  showStatus(msg: string, y: number, duration: number | null = 3000, isError = false): void {
    this.statusText?.destroy();
    const color = isError ? '#DC2626' : '#059669';
    this.statusText = this.scene.add
      .text(CW / 2, y, msg, { fontSize: '16px', fontFamily: BODY_FONT, color })
      .setOrigin(0.5)
      .setDepth(5);
    if (duration) {
      this.scene.time.delayedCall(duration, () => {
        this.statusText?.destroy();
        this.statusText = null;
      });
    }
  }

  destroy(): void {
    this.statusText?.destroy();
    if (this.fileInput) {
      this.fileInput.remove();
      this.fileInput = null;
    }
  }
}
