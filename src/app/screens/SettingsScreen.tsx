import { useEffect, useState, type CSSProperties, type ChangeEvent } from 'react';
import { useLocation } from 'wouter';
import { updatePreferences } from '../../lib/preferences';
import { deviceMetaRepo } from '../../persistence/repositories/deviceMeta';

// 44×44 minimum tap target (WCAG 2.1 AA / project a11y rule).
const buttonStyle: CSSProperties = {
  minWidth: 44,
  minHeight: 44,
  padding: '8px 16px',
};

export function SettingsScreen() {
  const [, setLocation] = useLocation();
  const [reduceMotion, setReduceMotion] = useState<boolean>(false);

  // Hydrate the checkbox from the persisted preference cache (IndexedDB).
  useEffect(() => {
    let cancelled = false;
    deviceMetaRepo
      .get()
      .then((meta) => {
        if (!cancelled) setReduceMotion(meta.preferences.reduceMotion ?? false);
      })
      .catch(() => {
        /* fall back to default false */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleReduceMotionChange = (e: ChangeEvent<HTMLInputElement>) => {
    const next = e.target.checked;
    setReduceMotion(next);
    // Persist + update runtime cache. The repo write is the source of truth;
    // updatePreferences keeps the in-memory cache in src/lib/preferences.ts in sync.
    void deviceMetaRepo.updatePreferences({ reduceMotion: next });
    void updatePreferences({ reduceMotion: next });
  };

  return (
    <div className="settings-screen">
      <style>{`
        .settings-screen button:focus-visible {
          outline: 3px solid #2563eb;
          outline-offset: 2px;
        }
      `}</style>
      <h2>Settings</h2>
      <div className="settings-form">
        <fieldset>
          <legend>Theme</legend>
          <label>
            <input type="radio" name="theme" value="light" defaultChecked />
            Light
          </label>
          <label>
            <input type="radio" name="theme" value="dark" />
            Dark
          </label>
        </fieldset>

        <fieldset>
          <legend>Animation</legend>
          <label>
            <input
              type="checkbox"
              name="reduced-motion"
              checked={reduceMotion}
              onChange={handleReduceMotionChange}
            />
            Reduce motion (respects OS setting)
          </label>
        </fieldset>
      </div>

      <button style={buttonStyle} onClick={() => setLocation('/')}>
        Back to Menu
      </button>
    </div>
  );
}
