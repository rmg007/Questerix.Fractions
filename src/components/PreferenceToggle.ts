/**
 * PreferenceToggle — accessible ARIA switch for a DeviceMeta preference key.
 * Mounts a real DOM button alongside the Phaser canvas (not a Phaser object)
 * so screen readers and keyboard navigation work natively.
 * per accessibility.md §3 (keyboard), §4 (reduced motion), §5 (ARIA)
 */

import { deviceMetaRepo } from '../persistence/repositories/deviceMeta';
import type { DeviceMeta } from '../types';

export type PrefKey = keyof DeviceMeta['preferences'];

interface ToggleOpts {
  /** Preference key to read/write. */
  key: PrefKey;
  /** Human-readable label shown next to the toggle. */
  label: string;
  /** When true the toggle is read-only (no pointer/keyboard interaction). */
  readOnly?: boolean;
  /** Called after the preference value changes. */
  onChange?: (newValue: boolean | string) => void;
}

const CONTAINER_ID = 'qf-pref-toggles';

function getOrCreateContainer(): HTMLElement {
  let el = document.getElementById(CONTAINER_ID);
  if (!el) {
    el = document.createElement('div');
    el.id = CONTAINER_ID;
    // Accessible overlay — sits above canvas, screen reader visible
    Object.assign(el.style, {
      position: 'fixed',
      top: '0',
      left: '0',
      width: '100%',
      height: '100%',
      pointerEvents: 'none',
      zIndex: '10000',
    });
    document.body.appendChild(el);
  }
  return el;
}

export class PreferenceToggle {
  private wrapper: HTMLElement;
  private btn: HTMLButtonElement;
  private labelEl: HTMLSpanElement;
  private valueEl: HTMLSpanElement;
  private key: PrefKey;
  private readOnly: boolean;
  private onChange: ((v: boolean | string) => void) | undefined;
  private clickHandler?: () => void;
  private keydownHandler?: (e: KeyboardEvent) => void;

  constructor(opts: ToggleOpts, position: { top: string; left: string }) {
    this.key = opts.key;
    this.readOnly = opts.readOnly ?? false;
    this.onChange = opts.onChange;

    const container = getOrCreateContainer();

    // Wrapper row
    this.wrapper = document.createElement('div');
    Object.assign(this.wrapper.style, {
      position: 'absolute',
      top: position.top,
      left: position.left,
      transform: 'translateX(-50%)',
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      pointerEvents: 'auto',
    });

    // Label
    const labelId = `pref-label-${opts.key}`;
    this.labelEl = document.createElement('span');
    this.labelEl.id = labelId;
    this.labelEl.textContent = opts.label;
    Object.assign(this.labelEl.style, {
      fontFamily: '"Nunito", system-ui, sans-serif',
      fontSize: '18px',
      color: '#374151',
      minWidth: '180px',
    });

    // Toggle button wrapper — 44×44 outer hit area per C7, visual unchanged
    const btnWrapper = document.createElement('div');
    Object.assign(btnWrapper.style, {
      position: 'relative',
      width: '44px',
      height: '44px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: '0',
    });

    // Toggle button (visual: 52×28 inner)
    this.btn = document.createElement('button');
    this.btn.setAttribute('role', 'switch');
    this.btn.setAttribute('aria-checked', 'false');
    this.btn.setAttribute('aria-labelledby', labelId);
    this.btn.setAttribute('data-testid', `pref-toggle-${opts.key}`);
    if (this.readOnly) {
      this.btn.setAttribute('aria-disabled', 'true');
      this.btn.setAttribute('tabindex', '-1');
    }
    Object.assign(this.btn.style, {
      width: '52px',
      height: '28px',
      borderRadius: '14px',
      border: '2px solid #9CA3AF',
      background: '#E5E7EB',
      cursor: this.readOnly ? 'default' : 'pointer',
      position: 'relative',
      transition: 'background 0.2s, border-color 0.2s',
    });

    // Thumb
    const thumb = document.createElement('span');
    Object.assign(thumb.style, {
      position: 'absolute',
      top: '2px',
      left: '2px',
      width: '20px',
      height: '20px',
      borderRadius: '50%',
      background: '#fff',
      boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
      transition: 'left 0.2s',
      pointerEvents: 'none',
    });
    this.btn.appendChild(thumb);

    // Value display (for read-only or status)
    this.valueEl = document.createElement('span');
    Object.assign(this.valueEl.style, {
      fontFamily: '"Nunito", system-ui, sans-serif',
      fontSize: '14px',
      color: '#6B7280',
    });

    btnWrapper.appendChild(this.btn);

    this.wrapper.appendChild(this.labelEl);
    this.wrapper.appendChild(btnWrapper); // C6.7: wrapped in 44×44 container
    this.wrapper.appendChild(this.valueEl);
    container.appendChild(this.wrapper);

    // Wire click
    if (!this.readOnly) {
      this.clickHandler = () => void this.toggle();
      this.keydownHandler = (e) => {
        if (e.key === ' ' || e.key === 'Enter') {
          e.preventDefault();
          void this.toggle();
        }
      };
      this.btn.addEventListener('click', this.clickHandler);
      this.btn.addEventListener('keydown', this.keydownHandler);
    }

    // Load current value
    void this.refresh();
  }

  async refresh(): Promise<void> {
    const meta = await deviceMetaRepo.get();
    const raw = meta.preferences[this.key];
    const checked = typeof raw === 'boolean' ? raw : false;
    this.setChecked(checked, raw);
  }

  private setChecked(checked: boolean, raw: boolean | string): void {
    this.btn.setAttribute('aria-checked', String(checked));
    const thumb = this.btn.querySelector('span') as HTMLSpanElement;
    if (checked) {
      this.btn.style.background = '#6C63FF';
      this.btn.style.borderColor = '#6C63FF';
      if (thumb) thumb.style.left = '26px';
    } else {
      this.btn.style.background = '#E5E7EB';
      this.btn.style.borderColor = '#9CA3AF';
      if (thumb) thumb.style.left = '2px';
    }
    // Read-only value display
    if (this.readOnly) {
      if (typeof raw === 'boolean') {
        this.valueEl.textContent = raw ? 'Granted' : 'Denied';
        this.valueEl.style.color = raw ? '#059669' : '#DC2626';
      } else {
        this.valueEl.textContent = String(raw);
      }
    }
  }

  private async toggle(): Promise<void> {
    const meta = await deviceMetaRepo.get();
    const current = meta.preferences[this.key];
    if (typeof current !== 'boolean') return;
    const next = !current;
    await deviceMetaRepo.updatePreferences({ [this.key]: next } as Partial<
      DeviceMeta['preferences']
    >);
    this.setChecked(next, next);
    this.onChange?.(next);
  }

  destroy(): void {
    // Remove event listeners before removing DOM
    if (this.clickHandler) {
      this.btn.removeEventListener('click', this.clickHandler);
    }
    if (this.keydownHandler) {
      this.btn.removeEventListener('keydown', this.keydownHandler);
    }
    this.wrapper.remove();
  }

  static destroyAll(): void {
    document.getElementById(CONTAINER_ID)?.remove();
  }
}
