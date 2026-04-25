import * as Phaser from 'phaser';
import './index.css';
import { gameConfig, validateConfig } from './data/config';
import FractionScene from './scenes/FractionScene';
import MenuScene from './scenes/MenuScene';
import { Logger } from './systems/core/LoggerSystem';

// Cleanup previous instance if it exists (HMR support)
if ((window as any).game) {
    Logger.log('Destroying existing game instance for HMR refresh', 'BOOT');
    (window as any).game.destroy(true);
    (window as any).game = null;
}

Logger.log('Application Initializing...', 'BOOT');

// Validate configuration
try {
    validateConfig();
} catch (error: any) {
    Logger.log(`Configuration validation failed: ${error.message}`, 'BOOT', 'ERROR');
}

// Wire Scenes
gameConfig.scene = [MenuScene, FractionScene];

// Create Phaser game instance
Logger.log('Creating game instance', 'BOOT');
const game = new Phaser.Game(gameConfig);

// Attach to window for debugging and HMR singleton check
(window as any).game = game;

window.addEventListener('error', (event) => {
    Logger.log(`Uncaught error: ${event.message} at ${event.filename}`, 'SYSTEM', 'ERROR');
});

Logger.log('Questerix ready for operation!', 'BOOT');
