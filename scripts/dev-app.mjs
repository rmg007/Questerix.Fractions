import fs from 'node:fs';
import path from 'node:path';
import { spawn, execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const localDir = path.join(rootDir, '.local');
const pidFile = path.join(localDir, 'dev-app.pid');
const viteBin = path.join(rootDir, 'node_modules', 'vite', 'bin', 'vite.js');

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function readDevPort() {
  const sharedConfigPath = path.join(rootDir, 'src', 'config', 'shared.ts');
  try {
    const contents = fs.readFileSync(sharedConfigPath, 'utf8');
    const match = contents.match(/\bDEV_PORT\s*=\s*(\d+)\s*;/);
    if (match) return Number(match[1]);
  } catch {
    // Fall through.
  }
  return 5000;
}

function isPidRunning(pid) {
  if (!Number.isInteger(pid) || pid <= 0) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

function killTree(pid) {
  if (!Number.isInteger(pid) || pid <= 0) return;

  if (process.platform === 'win32') {
    execFileSync('taskkill', ['/PID', String(pid), '/T', '/F'], { stdio: 'ignore', windowsHide: true });
    return;
  }

  try {
    process.kill(pid, 'SIGTERM');
  } catch {
    // ignore
  }
}

async function killTreeHard(pid) {
  if (!Number.isInteger(pid) || pid <= 0) return;

  if (process.platform === 'win32') {
    killTree(pid);
    return;
  }

  killTree(pid);
  const deadline = Date.now() + 5000;
  while (Date.now() < deadline) {
    if (!isPidRunning(pid)) return;
    // eslint-disable-next-line no-await-in-loop
    await sleep(100);
  }
  try {
    process.kill(pid, 'SIGKILL');
  } catch {
    // ignore
  }
}

function tryReadPidFile() {
  try {
    const raw = fs.readFileSync(pidFile, 'utf8').trim();
    const pid = Number(raw);
    return Number.isFinite(pid) ? pid : null;
  } catch {
    return null;
  }
}

function removePidFile() {
  try {
    fs.unlinkSync(pidFile);
  } catch {
    // ignore
  }
}

function ensureLocalDir() {
  fs.mkdirSync(localDir, { recursive: true });
}

function listProjectVitePidsWindows() {
  const rootNeedle = rootDir.replace(/\\/g, '\\\\');
  const viteSuffix = '\\\\vite\\\\bin\\\\vite.js';
  const script =
    `$p = Get-CimInstance Win32_Process -Filter "Name='node.exe'" | ` +
    `Where-Object { $_.CommandLine -like '*${rootNeedle}*${viteSuffix}*' } | ` +
    `Select-Object -ExpandProperty ProcessId; ` +
    `if ($p) { $p }`;

  const out = execFileSync('powershell.exe', ['-NoProfile', '-Command', script], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'ignore'],
    windowsHide: true,
  }).trim();

  if (!out) return [];
  return out
    .split(/\r?\n/)
    .map((line) => Number(line.trim()))
    .filter((pid) => Number.isInteger(pid) && pid > 0);
}

function listListeningPidsWindows(port) {
  const script =
    `$p = Get-NetTCPConnection -State Listen -LocalPort ${port} -ErrorAction SilentlyContinue | ` +
    `Select-Object -ExpandProperty OwningProcess -Unique; ` +
    `if ($p) { $p }`;

  const out = execFileSync('powershell.exe', ['-NoProfile', '-Command', script], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'ignore'],
    windowsHide: true,
  }).trim();

  if (!out) return [];
  return out
    .split(/\r?\n/)
    .map((line) => Number(line.trim()))
    .filter((pid) => Number.isInteger(pid) && pid > 0);
}

async function stopExistingServers(port) {
  const killed = new Set();

  // 1) Stop previously recorded PID (fast path).
  const recordedPid = tryReadPidFile();
  if (recordedPid && isPidRunning(recordedPid)) {
    console.log(`[dev:app] Stopping previous dev server PID ${recordedPid}...`);
    await killTreeHard(recordedPid);
    killed.add(recordedPid);
  }
  removePidFile();

  // 2) Stop any Vite dev servers from THIS repo, even if the pid file was lost.
  if (process.platform === 'win32') {
    try {
      const projectPids = listProjectVitePidsWindows();
      for (const pid of projectPids) {
        if (killed.has(pid)) continue;
        if (!isPidRunning(pid)) continue;
        console.log(`[dev:app] Stopping orphan dev server PID ${pid} (project Vite)...`);
        // eslint-disable-next-line no-await-in-loop
        await killTreeHard(pid);
        killed.add(pid);
      }
    } catch {
      // best-effort
    }
  }

  // 3) Ensure the canonical port is free so Vite never auto-increments.
  if (process.platform === 'win32') {
    try {
      const portPids = listListeningPidsWindows(port);
      for (const pid of portPids) {
        if (killed.has(pid)) continue;
        if (!isPidRunning(pid)) continue;
        console.log(`[dev:app] Port ${port} in use; stopping PID ${pid}...`);
        // eslint-disable-next-line no-await-in-loop
        await killTreeHard(pid);
        killed.add(pid);
      }
    } catch {
      // best-effort
    }
  }
}

function startVite(port) {
  if (!fs.existsSync(viteBin)) {
    console.error(`[dev:app] Missing Vite binary at ${viteBin}. Did you run npm install?`);
    process.exit(1);
  }

  const args = [viteBin, '--port', String(port), '--strictPort'];
  const child = spawn(process.execPath, args, {
    cwd: rootDir,
    stdio: 'inherit',
    env: process.env,
    windowsHide: true,
  });

  fs.writeFileSync(pidFile, String(child.pid), 'utf8');

  const cleanupAndExit = async (signal) => {
    removePidFile();
    if (child.pid && isPidRunning(child.pid)) {
      try {
        await killTreeHard(child.pid);
      } catch {
        // ignore
      }
    }
    process.exit(signal ? 130 : 0);
  };

  process.on('SIGINT', () => cleanupAndExit('SIGINT'));
  process.on('SIGTERM', () => cleanupAndExit('SIGTERM'));

  child.on('exit', (code, signal) => {
    removePidFile();
    if (signal) process.exit(1);
    process.exit(code ?? 0);
  });
}

async function main() {
  ensureLocalDir();
  const port = readDevPort();
  await stopExistingServers(port);
  startVite(port);
}

await main();
