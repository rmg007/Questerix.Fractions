import type { DBCore, DBCoreTable, Middleware } from 'dexie';
import { errorReporter, tracerService } from '../lib/observability';
import { SPAN_NAMES } from '../lib/observability/span-names';

/**
 * Dexie middleware to auto-instrument database operations.
 * Tracks execution time, query success/failure, and provides spans for tracing.
 * per observability-spec.md §4.1
 */
export const observabilityMiddleware: Middleware<DBCore> = {
  stack: 'dbcore',
  create(downlevelDatabase) {
    return {
      ...downlevelDatabase,
      table(tableName: string): DBCoreTable {
        const downlevelTable = downlevelDatabase.table(tableName);
        return {
          ...downlevelTable,
          mutate: async (req) => {
            const span = tracerService.startSpan(SPAN_NAMES.DB.MUTATE, {
              'db.table': tableName,
              'db.operation': req.type,
            });
            const start = performance.now();
            try {
              const res = await downlevelTable.mutate(req);
              span.end();
              return res;
            } catch (err) {
              const duration = performance.now() - start;
              errorReporter.report(err instanceof Error ? err : new Error(String(err)), {
                category: 'DB',
                'db.table': tableName,
                'db.operation': req.type,
                durationMs: duration,
              });
              span.setStatus({ code: 1, message: String(err) });
              span.end();
              throw err;
            }
          },
          get: async (req) => {
            const span = tracerService.startSpan(SPAN_NAMES.DB.GET, {
              'db.table': tableName,
              'db.operation': 'get',
            });
            try {
              const res = await downlevelTable.get(req);
              span.end();
              return res;
            } catch (err) {
              errorReporter.report(err instanceof Error ? err : new Error(String(err)), {
                category: 'DB',
                'db.table': tableName,
                'db.operation': 'get',
              });
              span.setStatus({ code: 1, message: String(err) });
              span.end();
              throw err;
            }
          },
          query: async (req) => {
            const span = tracerService.startSpan(SPAN_NAMES.DB.QUERY, {
              'db.table': tableName,
              'db.operation': 'query',
            });
            try {
              const res = await downlevelTable.query(req);
              span.end();
              return res;
            } catch (err) {
              errorReporter.report(err instanceof Error ? err : new Error(String(err)), {
                category: 'DB',
                'db.table': tableName,
                'db.operation': 'query',
              });
              span.setStatus({ code: 1, message: String(err) });
              span.end();
              throw err;
            }
          },
        };
      },
    };
  },
};
