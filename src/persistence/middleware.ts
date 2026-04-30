import type { DBCore, DBCoreTable, Middleware } from 'dexie';
import { errorReporter, tracerService } from '../lib/observability';

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
            const span = tracerService.startSpan(`db.${req.type}`, {
              table: tableName,
              type: req.type,
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
                table: tableName,
                operation: req.type,
                durationMs: duration,
              });
              span.setStatus({ code: 1, message: String(err) });
              span.end();
              throw err;
            }
          },
          get: async (req) => {
            const span = tracerService.startSpan('db.get', { table: tableName });
            try {
              const res = await downlevelTable.get(req);
              span.end();
              return res;
            } catch (err) {
              errorReporter.report(err instanceof Error ? err : new Error(String(err)), {
                category: 'DB',
                table: tableName,
                operation: 'get',
              });
              span.setStatus({ code: 1, message: String(err) });
              span.end();
              throw err;
            }
          },
          query: async (req) => {
            const span = tracerService.startSpan('db.query', { table: tableName });
            try {
              const res = await downlevelTable.query(req);
              span.end();
              return res;
            } catch (err) {
              errorReporter.report(err instanceof Error ? err : new Error(String(err)), {
                category: 'DB',
                table: tableName,
                operation: 'query',
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
