import { useLocation } from 'wouter';

export function LevelMapScreen() {
  const [, setLocation] = useLocation();

  // Phase 1 sketch: mock level list (will be real in Phase 2)
  const levels = [1, 2, 3, 4, 5, 6, 7, 8, 9];

  return (
    <div className="level-map-screen">
      <h2>Choose a Level</h2>
      <div className="level-grid">
        {levels.map((level) => (
          <button
            key={level}
            onClick={() => setLocation(`/level/${level}`)}
            className="level-button"
          >
            Level {level}
          </button>
        ))}
      </div>
      <button onClick={() => setLocation('/')}>Back to Menu</button>
    </div>
  );
}
