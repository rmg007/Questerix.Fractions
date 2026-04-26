/**
 * FractionBank repository — static curriculum store.
 * per persistence-spec.md §4, data-schema.md §2.6
 */

import { db } from '../db';
import type { FractionBank } from '../../types';

export const fractionBankRepo = {
  async get(id: string): Promise<FractionBank | undefined> {
    try {
      return await db.fractionBank.get(id);
    } catch {
      return undefined;
    }
  },

  async getAll(): Promise<FractionBank[]> {
    try {
      return await db.fractionBank.toArray();
    } catch {
      return [];
    }
  },

  async getByDenominatorFamily(family: FractionBank['denominatorFamily']): Promise<FractionBank[]> {
    try {
      return await db.fractionBank.where('denominatorFamily').equals(family).toArray();
    } catch {
      return [];
    }
  },

  async getByBenchmark(benchmark: FractionBank['benchmark']): Promise<FractionBank[]> {
    try {
      return await db.fractionBank.where('benchmark').equals(benchmark).toArray();
    } catch {
      return [];
    }
  },

  async bulkPut(fractions: FractionBank[]): Promise<void> {
    await db.fractionBank.bulkPut(fractions);
  },

  async clear(): Promise<void> {
    await db.fractionBank.clear();
  },
};
