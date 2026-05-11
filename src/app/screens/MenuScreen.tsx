import React from 'react';
import { useLocation } from 'wouter';

export function MenuScreen() {
  const [, setLocation] = useLocation();

  return (
    <div className="menu-screen">
      <h1>Questerix Fractions</h1>
      <p>Welcome! Choose a student or create a new one.</p>

      {/* Phase 1 sketch: button to navigate to level map */}
      <button onClick={() => setLocation('/levels')}>
        Start Playing
      </button>

      <button onClick={() => setLocation('/settings')}>
        Settings
      </button>
    </div>
  );
}
