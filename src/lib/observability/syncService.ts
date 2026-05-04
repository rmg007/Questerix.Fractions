/**
 * Service for periodically flushing buffered telemetry events to the server.
 *
 * MVP: network egress is disabled per C1 (no external data egress).
 * Events remain buffered in IndexedDB until a future release re-enables sync.
 * The class interface is preserved so callers need no changes when sync is re-enabled.
 */
class TelemetrySyncService {
  // DR-04: hard-disabled for MVP — no fetch, no interval, no egress.
  init(): void {
    // no-op until C1 constraint is revisited post-MVP
  }

  async sync(): Promise<void> {
    // no-op
  }

  stop(): void {
    // no-op
  }
}

export const telemetrySyncService = new TelemetrySyncService();
export default telemetrySyncService;
