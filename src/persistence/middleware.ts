import type { Dexie, Middleware } from 'dexie';
import { errorReporter, tracerService } from '../lib/observability';

/**
 * Dexie middleware to auto-instrument database operations.
 * Tracks execution time, query success/failure, and provides spans for tracing.
 * per observability-spec.md §4.1
 */
export const observabilityMiddleware: Middleware<Dexie> = {
  stack: 'dbcore',
  create(downlevelEngine) {
    return {
      ...downlevelEngine,
      mutate: async (req) => {
        const span = tracerService.startSpan(`db.${req.type}`, {
          table: req.table.name,
          type: req.type,
        });

        const start = performance.now();
        try {
          const res = await downlevelEngine.mutate(req);
          span.end();
          return res;
        } catch (err) {
          const duration = performance.now() - start;
          errorReporter.report(err instanceof Error ? err : new Error(String(err)), {
            category: 'DB',
            table: req.table.name,
            operation: req.type,
            durationMs: duration,
          });
          span.setStatus({ code: 1, message: String(err) }); // 1 = Error
          span.end();
          throw err;
        }
      },
      get: async (req) => {
        const span = tracerService.startSpan('db.get', {
          table: req.table.name,
        });
        try {
          const res = await downlevelEngine.get(req);
          span.end();
          return res;
        } catch (err) {
          errorReporter.report(err instanceof Error ? err : new Error(String(err)), {
            category: 'DB',
            table: req.table.name,
            operation: 'get',
          });
          span.setStatus({ code: 1, message: String(err) });
          span.end();
          throw err;
        }
      },
      query: async (req) => {
        const span = tracerService.startSpan('db.query', {
          table: req.table.name,
        });
        try {
          const res = await downlevelEngine.query(req);
          span.end();
          return res;
        } catch (err) {
          errorReporter.report(err instanceof Error ? err : new Error(String(err)), {
            category: 'DB',
            table: req.table.name,
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
