import { spawn } from "node:child_process";

const npmCmd = process.platform === "win32" ? "npm.cmd" : "npm";

function runScript(scriptName) {
  return spawn(npmCmd, ["run", scriptName], {
    stdio: "inherit",
    shell: process.platform === "win32",
  });
}

const app = runScript("dev:app");
const roadie = runScript("roadie");

let shuttingDown = false;

function shutdown(signal) {
  if (shuttingDown) return;
  shuttingDown = true;

  if (roadie.exitCode === null) {
    roadie.kill(signal);
  }

  if (app.exitCode === null) {
    app.kill(signal);
  }
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));

app.on("exit", (code) => {
  // If Vite exits, terminate Roadie and exit with the same status.
  shutdown("SIGTERM");
  process.exit(code ?? 0);
});

roadie.on("exit", (code) => {
  // If Roadie exits unexpectedly, keep behavior predictable by stopping Vite too.
  if (!shuttingDown) {
    shutdown("SIGTERM");
    process.exit(code ?? 0);
  }
});
