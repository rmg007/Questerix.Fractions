import type { CSSProperties } from 'react';
import { useLocation } from 'wouter';

// 44×44 minimum tap target (WCAG 2.1 AA / project a11y rule). Visible focus ring.
const buttonStyle: CSSProperties = {
  minWidth: 44,
  minHeight: 44,
  padding: '8px 16px',
};

export function MenuScreen() {
  const [, setLocation] = useLocation();

  return (
    <div className="menu-screen">
      <style>{`
        .menu-screen button:focus-visible {
          outline: 3px solid #2563eb;
          outline-offset: 2px;
        }
      `}</style>
      <h1>Questerix Fractions</h1>
      <p>Welcome! Choose a student or create a new one.</p>

      {/* Phase 1 sketch: button to navigate to level map */}
      <button style={buttonStyle} onClick={() => setLocation('/levels')}>
        Start Playing
      </button>

      <button style={buttonStyle} onClick={() => setLocation('/settings')}>
        Settings
      </button>
    </div>
  );
}
