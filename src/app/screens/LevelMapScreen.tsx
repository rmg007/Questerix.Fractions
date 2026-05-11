import type { CSSProperties } from 'react';
import { useLocation } from 'wouter';

// 44×44 minimum tap target (WCAG 2.1 AA / project a11y rule).
const buttonStyle: CSSProperties = {
  minWidth: 44,
  minHeight: 44,
  padding: '8px 16px',
};

export function LevelMapScreen() {
  const [, setLocation] = useLocation();

  // Phase 1 sketch: mock level list (will be real in Phase 2)
  const levels = [1, 2, 3, 4, 5, 6, 7, 8, 9];
  // Phase 1 placeholder for the "active" level — until progression data
  // is wired in Phase 2, treat Level 1 as the default current node so screen
  // readers get an aria-current marker.
  const activeLevel = 1;

  return (
    <div className="level-map-screen">
      <style>{`
        .level-map-screen button:focus-visible {
          outline: 3px solid #2563eb;
          outline-offset: 2px;
        }
      `}</style>
      <h2>Choose a Level</h2>
      <div className="level-grid">
        {levels.map((level) => {
          const isActive = level === activeLevel;
          return (
            <button
              key={level}
              style={buttonStyle}
              onClick={() => setLocation(`/level/${level}`)}
              className="level-button"
              aria-current={isActive ? 'page' : undefined}
            >
              Level {level}
            </button>
          );
        })}
      </div>
      <button style={buttonStyle} onClick={() => setLocation('/')}>
        Back to Menu
      </button>
    </div>
  );
}
