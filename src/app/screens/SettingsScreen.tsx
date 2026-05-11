import { useLocation } from 'wouter';

export function SettingsScreen() {
  const [, setLocation] = useLocation();

  return (
    <div className="settings-screen">
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
            <input type="checkbox" name="reduced-motion" />
            Reduce motion (respects OS setting)
          </label>
        </fieldset>
      </div>

      <button onClick={() => setLocation('/')}>Back to Menu</button>
    </div>
  );
}
