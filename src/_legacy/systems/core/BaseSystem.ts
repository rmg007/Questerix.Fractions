/**
 * Base interface for all modular systems in Questerix.
 */
export interface GameSystem {
    /**
     * Optional initialization/cleanup logic for specific level context.
     */
    create?(...args: any[]): void;

    /**
     * Optional frame-by-frame update.
     */
    update?(): void;

    /**
     * Mandatory cleanup to prevent memory leaks and overlapping event listeners.
     */
    destroy(): void;
}
