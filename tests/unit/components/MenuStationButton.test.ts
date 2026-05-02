/**
 * Static-source guard for MenuStationButton — confirms the factory was
 * extracted out of MenuScene and that MenuScene no longer holds a local
 * StationButtonOpts interface or createStationButton method. The pixel
 * behavior (hover, press, click) is exercised by the existing menu E2E
 * flow because every menu interaction routes through this factory.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const STATION_BTN_PATH = resolve(__dirname, '../../../src/components/MenuStationButton.ts');
const MENU_SCENE_PATH = resolve(__dirname, '../../../src/scenes/MenuScene.ts');

const stationSource = readFileSync(STATION_BTN_PATH, 'utf8');
const menuSource = readFileSync(MENU_SCENE_PATH, 'utf8');

describe('MenuStationButton extraction', () => {
  it('exports createStationButton and StationButtonOpts', () => {
    expect(stationSource).toMatch(/export\s+function\s+createStationButton\s*\(/);
    expect(stationSource).toMatch(/export\s+interface\s+StationButtonOpts\b/);
  });

  it('MenuScene imports createStationButton from MenuStationButton', () => {
    expect(menuSource).toMatch(
      /import\s*\{[^}]*\bcreateStationButton\b[^}]*\}\s*from\s*['"][^'"]*MenuStationButton['"]/
    );
  });

  it('MenuScene no longer declares its own createStationButton method', () => {
    expect(menuSource).not.toMatch(/private\s+createStationButton\s*\(/);
  });

  it('MenuScene no longer declares a local StationButtonOpts interface', () => {
    expect(menuSource).not.toMatch(/interface\s+StationButtonOpts\b/);
  });
});
