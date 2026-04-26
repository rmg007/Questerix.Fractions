/**
 * Hints seeding script — loads hints.json and populates Dexie stores.
 * Validates hints structure, tests query by templateId, and reports results.
 *
 * Usage: npm run seed:hints (requires explicit entry in package.json scripts)
 * or: npx tsx .claude/seed_hints.ts
 */

import { db } from '../src/persistence/db';
import { hintRepo } from '../src/persistence/repositories/hint';
import fs from 'fs';
import path from 'path';

// ── Types ──────────────────────────────────────────────────────────────────

interface SeedReport {
  timestamp: string;
  hintsLoaded: number;
  hintsSeeded: number;
  uniqueTemplates: number;
  templateSample: string[];
  queriedByTemplate: Record<string, number>;
  queryTestResults: Array<{
    templateId: string;
    hintsFound: number;
    orderValid: boolean;
  }>;
  errors: string[];
  success: boolean;
}

// ── Main seeding function ──────────────────────────────────────────────────

async function seedHints(): Promise<SeedReport> {
  const report: SeedReport = {
    timestamp: new Date().toISOString(),
    hintsLoaded: 0,
    hintsSeeded: 0,
    uniqueTemplates: 0,
    templateSample: [],
    queriedByTemplate: {},
    queryTestResults: [],
    errors: [],
    success: false,
  };

  try {
    // ── Step 1: Load hints.json ─────────────────────────────────────────────

    const hintsPath = path.join(__dirname, '../pipeline/output/hints.json');
    if (!fs.existsSync(hintsPath)) {
      throw new Error(`hints.json not found at ${hintsPath}`);
    }

    const rawData = fs.readFileSync(hintsPath, 'utf-8');
    const hints = JSON.parse(rawData);

    if (!Array.isArray(hints)) {
      throw new Error('hints.json root must be an array');
    }

    report.hintsLoaded = hints.length;
    console.log(`[seedHints] Loaded ${hints.length} hints from hints.json`);

    // ── Step 2: Validate hint structure ────────────────────────────────────

    const templateIds = new Set<string>();
    for (let i = 0; i < hints.length; i++) {
      const hint = hints[i];

      // Validate required fields
      if (!hint.id || typeof hint.id !== 'string') {
        report.errors.push(`Hint[${i}] missing or invalid id`);
        continue;
      }
      if (!hint.questionTemplateId || typeof hint.questionTemplateId !== 'string') {
        report.errors.push(`Hint[${i}] (${hint.id}) missing or invalid questionTemplateId`);
        continue;
      }
      if (![1, 2, 3].includes(hint.order)) {
        report.errors.push(`Hint[${i}] (${hint.id}) invalid order (must be 1, 2, or 3)`);
        continue;
      }
      if (!['verbal', 'visual_overlay', 'worked_example'].includes(hint.type)) {
        report.errors.push(`Hint[${i}] (${hint.id}) invalid type`);
        continue;
      }

      templateIds.add(hint.questionTemplateId);
    }

    report.uniqueTemplates = templateIds.size;
    report.templateSample = Array.from(templateIds).slice(0, 5);

    if (report.errors.length > 0) {
      console.warn(
        `[seedHints] Validation found ${report.errors.length} errors. First 5:`,
        report.errors.slice(0, 5),
      );
    }

    // ── Step 3: Clear hints store and bulk insert ────────────────────────────

    await hintRepo.clear();
    console.log('[seedHints] Cleared existing hints');

    await hintRepo.bulkPut(hints);
    report.hintsSeeded = hints.length;
    console.log(`[seedHints] Seeded ${hints.length} hints`);

    // ── Step 4: Query test by templateId ────────────────────────────────────

    const testTemplates = Array.from(templateIds).slice(0, 10);
    console.log(`[seedHints] Testing queries on ${testTemplates.length} templates...`);

    for (const templateId of testTemplates) {
      const queried = await hintRepo.getForQuestion(templateId);
      report.queriedByTemplate[templateId] = queried.length;

      // Validate query result
      let orderValid = true;
      const seenOrders = new Set<number>();

      for (const hint of queried) {
        if (!seenOrders.has(hint.order)) {
          seenOrders.add(hint.order);
        } else {
          orderValid = false; // Duplicate order for same template
        }
      }

      // Orders should be sorted 1, 2, 3
      if (queried.length > 0) {
        for (let i = 0; i < queried.length; i++) {
          if (queried[i].order !== i + 1) {
            orderValid = false;
          }
        }
      }

      report.queryTestResults.push({
        templateId,
        hintsFound: queried.length,
        orderValid,
      });

      console.log(
        `  ${templateId}: ${queried.length} hints (order valid: ${orderValid})`,
      );
    }

    // ── Step 5: Spot-check individual hint retrieval ────────────────────────

    const sampleHintId = hints[0]?.id;
    if (sampleHintId) {
      const fetched = await hintRepo.get(sampleHintId);
      if (!fetched) {
        report.errors.push(`Failed to fetch sample hint by id: ${sampleHintId}`);
      } else {
        console.log(`[seedHints] Spot-check OK: fetched ${sampleHintId}`);
      }
    }

    report.success = true;
    console.log('[seedHints] ✓ Seeding complete');
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    report.errors.push(`Fatal: ${msg}`);
    console.error('[seedHints] ✗ Seeding failed:', msg);
  }

  return report;
}

// ── Export and execute ──────────────────────────────────────────────────────

export { seedHints };

// Run if this is the entry point
if (require.main === module) {
  seedHints().then((report) => {
    // Print summary table
    console.log('\n══════════════════════════════════════════════════════');
    console.log('HINTS SEED REPORT');
    console.log('══════════════════════════════════════════════════════');
    console.log(`Timestamp:            ${report.timestamp}`);
    console.log(`Hints Loaded:         ${report.hintsLoaded}`);
    console.log(`Hints Seeded:         ${report.hintsSeeded}`);
    console.log(`Unique Templates:     ${report.uniqueTemplates}`);
    console.log(`Template Sample:      ${report.templateSample.join(', ')}`);
    console.log(`Query Tests Passed:   ${report.queryTestResults.filter((r) => r.orderValid).length}/${report.queryTestResults.length}`);
    console.log(`Validation Errors:    ${report.errors.length}`);
    console.log(`Status:               ${report.success ? '✓ SUCCESS' : '✗ FAILED'}`);
    console.log('══════════════════════════════════════════════════════\n');

    if (report.errors.length > 0) {
      console.log('ERRORS:');
      report.errors.forEach((e) => console.log(`  - ${e}`));
    }

    // Save report to disk
    const reportPath = path.join(__dirname, './reports/hints_seed_report.json');
    fs.mkdirSync(path.dirname(reportPath), { recursive: true });
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`\nReport saved to: ${reportPath}`);

    process.exit(report.success ? 0 : 1);
  });
}
