import { Router, Route } from 'wouter';
import { MenuScreen } from './screens/MenuScreen';
import { LevelMapScreen } from './screens/LevelMapScreen';
import { LevelScreen } from './screens/LevelScreen';
import { SettingsScreen } from './screens/SettingsScreen';

export function App() {
  return (
    <Router base="/">
      <div className="app-root">
        <Route path="/" component={MenuScreen} />
        <Route path="/levels" component={LevelMapScreen} />
        <Route path="/level/:levelId" component={LevelScreen} />
        <Route path="/settings" component={SettingsScreen} />
      </div>
    </Router>
  );
}
