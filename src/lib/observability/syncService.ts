import { db } from '../../persistence/db';

/**
 * Stable per-input pseudonymization. FNV-1a 32-bit → 8 hex chars.
 * Mirrors the helper in errorReporter.ts; kept local to avoid an internal
 * cross-import. The goal is correlation pseudonymity for the X-Install-ID
 * header so downstream telemetry can group by install without storing the
 * raw UUID.
 */
function pseudonymize(s: string | undefined): string {
  if (!s) return 'unknown';
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).padStart(8, '0');
}

/**
 * Service for periodically flushing buffered telemetry events to the server.
 * Handles network awareness and batching.
 *
 * Privacy: events are buffered by `logger` only when telemetryConsent is true,
 * so the buffer itself is the consent gate. We additionally pseudonymize the
 * X-Install-ID header so the network endpoint never sees the raw UUID.
 */
class TelemetrySyncService {
  private intervalId: number | undefined;
  private isSyncing = false;
  private syncInterval = 60000; // 1 minute
  private batchSize = 50;

  /**
   * Start the sync cycle.
   */
  init() {
    if (this.intervalId || typeof window === 'undefined') return;

    // Listen for network changes to trigger immediate sync when coming back online
    window.addEventListener('online', () => this.sync());

    // Periodic sync
    this.intervalId = window.setInterval(() => this.sync(), this.syncInterval);

    // Initial sync attempt after a short delay to avoid contention during boot
    setTimeout(() => this.sync(), 5000);
  }

  /**
   * Manually trigger a sync.
   */
  async sync() {
    if (this.isSyncing || !navigator.onLine) return;

    this.isSyncing = true;
    try {
      await this.flushEvents();
    } catch (err) {
      if (import.meta.env.DEV) {
        console.error('[TelemetrySync] Unexpected error:', err);
      }
    } finally {
      this.isSyncing = false;
    }
  }

  /**
   * Flush events in batches to the backend.
   */
  private async flushEvents() {
    // Get unsynced events
    const events = await db.telemetryEvents
      .where('syncState')
      .equals('local')
      .limit(this.batchSize)
      .toArray();

    if (events.length === 0) return;

    // The telemetry endpoint should be configured in the environment.
    // Falls back to a dummy if not present to avoid crashes.
    const endpoint = import.meta.env.VITE_TELEMETRY_URL;

    if (!endpoint) {
      if (import.meta.env.DEV) {
        console.warn('[TelemetrySync] VITE_TELEMETRY_URL not defined. Events remain buffered.');
      }
      return;
    }

    try {
      const deviceMeta = await db.deviceMeta.toCollection().first();

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // Pseudonymized — see comment on `pseudonymize()` above.
          'X-Install-ID': pseudonymize(deviceMeta?.installId),
        },
        body: JSON.stringify({
          events,
          sentAt: new Date().toISOString(),
          version: (import.meta.env.VITE_GIT_SHA as string) || 'dev',
        }),
      });

      if (response.ok) {
        const ids = events.map((e) => e.id).filter((id): id is number => id !== undefined);

        // Remove successfully synced events to free up IndexedDB space.
        // Telemetry is treated as a fire-and-forget log; persistence on server is the goal.
        await db.telemetryEvents.bulkDelete(ids);

        // If we processed a full batch, there might be more. Continue flushing.
        if (events.length === this.batchSize) {
          // Avoid recursion depth issues, just schedule next flush
          setTimeout(() => this.flushEvents(), 100);
        }
      } else {
        if (import.meta.env.DEV) {
          console.error(
            '[TelemetrySync] Server rejected events:',
            response.status,
            response.statusText
          );
        }
      }
    } catch (err) {
      if (import.meta.env.DEV) {
        console.error('[TelemetrySync] Network error during flush:', err);
      }
      // Stop flushing for this cycle on network error
    }
  }

  /**
   * Stops the periodic sync.
   */
  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = undefined;
    }
  }
}

export const telemetrySyncService = new TelemetrySyncService();
export default telemetrySyncService;
