// Synthetic playtest result aggregator
// per playtest-protocol.md §5 (telemetry) and §7.1 (quantitative analysis)
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export interface AttemptRecord {
  sessionId: string;
  personaName: string;
  level: number;
  attemptIndex: number;
  outcome: 'correct' | 'wrong' | 'timeout';
  hintUsed: boolean;
  responseTimeMs: number;
  feedbackShownMs: number | null; // ms from click to feedback-overlay visible
}

export interface SessionRecord {
  sessionId: string;
  personaName: string;
  startLevel: number;
  finalLevel: number;
  attempts: AttemptRecord[];
  completed: boolean;       // reached completion-screen or 5 attempts done
  abandoned: boolean;       // persona decided to bail mid-session
  crashed: boolean;         // uncaught JS error
  consoleErrors: string[];
  totalDurationMs: number;
  // p95 frame budget violations count (from page.metrics TaskDuration)
  taskDurationMs: number | null;
}

export interface AggregatedReport {
  timestamp: string;
  totalSessions: number;
  completedSessions: number;
  abandonedSessions: number;
  crashedSessions: number;
  completionRate: number;         // 0..1
  meanAttemptsPerSession: number;
  meanSessionDurationMs: number;
  p95SessionDurationMs: number;
  feedbackLatencyPass: boolean;   // ≥90% feedback shown <800ms
  feedbackLatencyP95Ms: number;
  perPersona: Record<string, {
    sessions: number;
    completed: number;
    abandoned: number;
    crashed: number;
    meanAccuracy: number;         // fraction of correct/(correct+wrong)
    meanResponseTimeMs: number;
  }>;
  // pass/fail criteria per playtest-protocol.md §5
  passed: boolean;
  failReasons: string[];
}

export function aggregate(sessions: SessionRecord[]): AggregatedReport {
  const timestamp = new Date().toISOString();
  const total = sessions.length;
  const completed = sessions.filter(s => s.completed).length;
  const abandoned = sessions.filter(s => s.abandoned).length;
  const crashed = sessions.filter(s => s.crashed).length;

  const allAttempts = sessions.flatMap(s => s.attempts);
  const meanAttempts = allAttempts.length / Math.max(total, 1);
  const totalDurations = sessions.map(s => s.totalDurationMs).filter(d => d > 0);
  const meanDuration = totalDurations.reduce((a, b) => a + b, 0) / Math.max(totalDurations.length, 1);

  // p95 session duration
  const sorted = [...totalDurations].sort((a, b) => a - b);
  const p95Idx = Math.floor(sorted.length * 0.95);
  const p95Duration = sorted[p95Idx] ?? 0;

  // Feedback latency: % of attempts where feedback appeared <800ms
  const latencies = allAttempts
    .map(a => a.feedbackShownMs)
    .filter((v): v is number => v !== null);
  const fastFeedback = latencies.filter(l => l < 800).length;
  const feedbackLatencyPass = latencies.length > 0
    ? fastFeedback / latencies.length >= 0.90
    : true; // no data = don't fail
  const sortedLatencies = [...latencies].sort((a, b) => a - b);
  const latP95Idx = Math.floor(sortedLatencies.length * 0.95);
  const feedbackLatencyP95Ms = sortedLatencies[latP95Idx] ?? 0;

  // Per-persona breakdown
  const personaNames = [...new Set(sessions.map(s => s.personaName))];
  const perPersona: AggregatedReport['perPersona'] = {};
  for (const name of personaNames) {
    const pSessions = sessions.filter(s => s.personaName === name);
    const pAttempts = pSessions.flatMap(s => s.attempts);
    const correct = pAttempts.filter(a => a.outcome === 'correct').length;
    const scored = pAttempts.filter(a => a.outcome !== 'timeout').length;
    perPersona[name] = {
      sessions: pSessions.length,
      completed: pSessions.filter(s => s.completed).length,
      abandoned: pSessions.filter(s => s.abandoned).length,
      crashed: pSessions.filter(s => s.crashed).length,
      meanAccuracy: scored > 0 ? correct / scored : 0,
      meanResponseTimeMs: pAttempts.reduce((a, b) => a + b.responseTimeMs, 0) / Math.max(pAttempts.length, 1),
    };
  }

  // Pass/fail criteria
  const failReasons: string[] = [];
  const completionRate = total > 0 ? completed / total : 0;
  if (completionRate < 0.95) {
    failReasons.push(`Completion rate ${(completionRate * 100).toFixed(1)}% < 95% threshold`);
  }
  if (crashed > 0) {
    failReasons.push(`${crashed} session(s) crashed (uncaught JS error)`);
  }
  if (!feedbackLatencyPass) {
    failReasons.push(`Feedback latency p95=${feedbackLatencyP95Ms}ms — <90% of attempts within 800ms budget`);
  }

  const report: AggregatedReport = {
    timestamp,
    totalSessions: total,
    completedSessions: completed,
    abandonedSessions: abandoned,
    crashedSessions: crashed,
    completionRate,
    meanAttemptsPerSession: meanAttempts,
    meanSessionDurationMs: meanDuration,
    p95SessionDurationMs: p95Duration,
    feedbackLatencyPass,
    feedbackLatencyP95Ms,
    perPersona,
    passed: failReasons.length === 0,
    failReasons,
  };

  return report;
}

export function saveReport(report: AggregatedReport): string {
  const resultsDir = path.join(__dirname, 'results');
  fs.mkdirSync(resultsDir, { recursive: true });
  const filename = `${report.timestamp.replace(/[:.]/g, '-')}.json`;
  const filepath = path.join(resultsDir, filename);
  fs.writeFileSync(filepath, JSON.stringify(report, null, 2));
  return filepath;
}

export function printSummary(report: AggregatedReport): void {
  const pct = (n: number) => `${(n * 100).toFixed(1)}%`;
  const ms = (n: number) => `${n.toFixed(0)}ms`;
  console.log('\n╔══════════════════════════════════════════════════════╗');
  console.log('║        Synthetic Playtest Results Summary            ║');
  console.log('╚══════════════════════════════════════════════════════╝');
  console.log(`  Status:          ${report.passed ? '✅ PASSED' : '❌ FAILED'}`);
  console.log(`  Sessions:        ${report.totalSessions} total | ${report.completedSessions} completed | ${report.abandonedSessions} abandoned | ${report.crashedSessions} crashed`);
  console.log(`  Completion rate: ${pct(report.completionRate)} (threshold: ≥95%)`);
  console.log(`  Mean attempts:   ${report.meanAttemptsPerSession.toFixed(1)} per session`);
  console.log(`  Mean duration:   ${ms(report.meanSessionDurationMs)} | p95: ${ms(report.p95SessionDurationMs)}`);
  console.log(`  Feedback <800ms: ${report.feedbackLatencyPass ? 'PASS' : 'FAIL'} (p95=${ms(report.feedbackLatencyP95Ms)})`);
  console.log('\n  Per-persona breakdown:');
  for (const [name, p] of Object.entries(report.perPersona)) {
    console.log(`    ${name.padEnd(18)} sessions=${p.sessions} complete=${p.completed} abandon=${p.abandoned} crash=${p.crashed} accuracy=${pct(p.meanAccuracy)} avgResp=${ms(p.meanResponseTimeMs)}`);
  }
  if (report.failReasons.length > 0) {
    console.log('\n  Failure reasons:');
    for (const r of report.failReasons) {
      console.log(`    • ${r}`);
    }
  }
  console.log('');
}
