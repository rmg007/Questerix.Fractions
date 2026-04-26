/**
 * Integration test for hints seeding.
 * Validates loading hints from hints.json, seeding into Dexie, and querying by template.
 *
 * Per persistence-spec.md §5 (bootstrap sequence) and data-schema.md §2.9 (hints schema).
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { db } from '../../src/persistence/db';
import { hintRepo } from '../../src/persistence/repositories/hint';
import fs from 'fs';
import path from 'path';
import type { HintTemplate } from '../../src/types';

describe('Hints Seeding Integration', () => {
  let hintsData: HintTemplate[];

  beforeAll(async () => {
    // Load hints.json
    const hintsPath = path.join(__dirname, '../../pipeline/output/hints.json');
    if (!fs.existsSync(hintsPath)) {
      throw new Error(`hints.json not found at ${hintsPath}`);
    }
    const rawData = fs.readFileSync(hintsPath, 'utf-8');
    hintsData = JSON.parse(rawData);

    // Clear hints store before tests
    await hintRepo.clear();
  });

  afterAll(async () => {
    // Clean up after tests
    await hintRepo.clear();
  });

  it('should load hints.json with valid structure', () => {
    expect(Array.isArray(hintsData)).toBe(true);
    expect(hintsData.length).toBeGreaterThan(0);

    // Check a few samples
    const sample = hintsData[0];
    expect(sample).toHaveProperty('id');
    expect(sample).toHaveProperty('questionTemplateId');
    expect(sample).toHaveProperty('type');
    expect(sample).toHaveProperty('order');
    expect(sample).toHaveProperty('content');
    expect(sample).toHaveProperty('pointCost');
  });

  it('should validate hint IDs and template associations', () => {
    const templateIds = new Set<string>();

    for (const hint of hintsData) {
      // Validate format (supports both 2-3 char archetypes: h:pt:L1:0001:T1, h:cmp:L6:0001:T1)
      expect(hint.id).toMatch(/^h:[a-z]{2,3}:L\d+:\d{4}:T[1-3]$/);
      expect(hint.questionTemplateId).toMatch(/^q:[a-z]{2,3}:L\d+:\d{4}$/);

      // Validate order and type
      expect([1, 2, 3]).toContain(hint.order);
      expect(['verbal', 'visual_overlay', 'worked_example']).toContain(hint.type);

      // Track unique templates
      templateIds.add(hint.questionTemplateId);
    }

    expect(templateIds.size).toBeGreaterThan(0);
  });

  it('should seed all hints to hintRepo without errors', async () => {
    await hintRepo.bulkPut(hintsData);

    // Verify count by querying a sample template
    if (hintsData.length > 0) {
      const firstTemplate = hintsData[0].questionTemplateId;
      const queried = await hintRepo.getForQuestion(firstTemplate);
      expect(queried.length).toBeGreaterThan(0);
    }
  });

  it('should retrieve hints by individual id', async () => {
    await hintRepo.bulkPut(hintsData);

    const testHint = hintsData[0];
    const retrieved = await hintRepo.get(testHint.id);

    expect(retrieved).toBeDefined();
    expect(retrieved?.id).toBe(testHint.id);
    expect(retrieved?.questionTemplateId).toBe(testHint.questionTemplateId);
  });

  it('should query hints by questionTemplateId with correct ordering', async () => {
    await hintRepo.bulkPut(hintsData);

    // Get a template with multiple hints
    const templateCounts = new Map<string, number>();
    for (const hint of hintsData) {
      templateCounts.set(
        hint.questionTemplateId,
        (templateCounts.get(hint.questionTemplateId) ?? 0) + 1,
      );
    }

    // Find a template with 3 hints
    let testTemplate: string | null = null;
    for (const [id, count] of templateCounts) {
      if (count === 3) {
        testTemplate = id;
        break;
      }
    }

    expect(testTemplate).not.toBeNull();

    if (testTemplate) {
      const hints = await hintRepo.getForQuestion(testTemplate);

      // Should have exactly 3 hints
      expect(hints.length).toBe(3);

      // Should be ordered by order field (1, 2, 3)
      expect(hints[0].order).toBe(1);
      expect(hints[1].order).toBe(2);
      expect(hints[2].order).toBe(3);

      // All should share the same templateId
      expect(hints.every((h) => h.questionTemplateId === testTemplate)).toBe(true);
    }
  });

  it('should handle content structure correctly', async () => {
    await hintRepo.bulkPut(hintsData);

    const testHint = hintsData[0];
    const retrieved = await hintRepo.get(testHint.id);

    expect(retrieved?.content).toBeDefined();
    expect(retrieved?.content).toHaveProperty('text');
    expect(retrieved?.content).toHaveProperty('ttsKey');

    // ttsKey should be non-empty for verbal hints
    if (testHint.type === 'verbal') {
      expect(retrieved?.content.ttsKey).toBeTruthy();
    }

    expect(retrieved?.pointCost).toBe(0);
  });

  it('should handle empty result for non-existent template', async () => {
    await hintRepo.bulkPut(hintsData);

    const hints = await hintRepo.getForQuestion('q:xx:L0:0000');
    expect(hints).toEqual([]);
  });

  it('should report accurate hint statistics', () => {
    const stats = {
      total: hintsData.length,
      byType: {} as Record<string, number>,
      byTemplate: {} as Record<string, number>,
      byOrder: { 1: 0, 2: 0, 3: 0 },
    };

    for (const hint of hintsData) {
      stats.byType[hint.type] = (stats.byType[hint.type] ?? 0) + 1;
      stats.byTemplate[hint.questionTemplateId] =
        (stats.byTemplate[hint.questionTemplateId] ?? 0) + 1;
      stats.byOrder[hint.order as 1 | 2 | 3]++;
    }

    // Sanity checks
    expect(stats.total).toBeGreaterThan(0);
    expect(Object.keys(stats.byType).length).toBeGreaterThan(0);
    expect(Object.keys(stats.byTemplate).length).toBeGreaterThan(0);

    // All orders should be represented
    expect(stats.byOrder[1]).toBeGreaterThan(0);
    expect(stats.byOrder[2]).toBeGreaterThan(0);
    expect(stats.byOrder[3]).toBeGreaterThan(0);

    console.log(
      `\nHints Statistics:\n  Total: ${stats.total}\n  By Type:`,
      stats.byType,
      '\n  By Order:',
      stats.byOrder,
      '\n  Unique Templates:',
      Object.keys(stats.byTemplate).length,
    );
  });
});
