/**
 * LoggerSystem — sends telemetry and event logs to the local dev server.
 */
export default class LoggerSystem {
    private static instance: LoggerSystem;
    private buffer: any[] = [];
    private flushInterval: number = 2000; // 2 seconds

    private constructor() {
        setInterval(() => this.flush(), this.flushInterval);
    }

    public static getInstance(): LoggerSystem {
        const win = window as any;
        if (!win._loggerInstance) {
            win._loggerInstance = new LoggerSystem();
        }
        return win._loggerInstance;
    }

    public log(message: string, category: string = 'GAME', level: 'INFO' | 'WARN' | 'ERROR' = 'INFO') {
        const payload = {
            message,
            category,
            level,
            timestamp: Date.now()
        };

        // Print to console too
        const style = level === 'ERROR' ? 'color: red' : level === 'WARN' ? 'color: orange' : 'color: #00ffd1';
        console.log(`%c[${category}] ${message}`, style);

        this.buffer.push(payload);
        
        // Immediate flush for errors
        if (level === 'ERROR') this.flush();
    }

    private async flush() {
        if (this.buffer.length === 0) return;

        const toSend = [...this.buffer];
        this.buffer = [];

        for (const item of toSend) {
            try {
                await fetch('/api/log', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(item)
                });
            } catch (err) {
                console.warn('[Logger] Failed to reach logging server', err);
                // Put back in buffer? No, avoid infinite loops if server is down
            }
        }
    }
}

// Global logger shorthand
export const Logger = LoggerSystem.getInstance();
