import { trace, type Tracer } from '@opentelemetry/api';

// Heavy OTel SDK packages are dynamically imported inside init() so they are
// excluded from the main bundle when VITE_OTLP_URL is not set at build time.

/** Default fraction of traces to sample if `VITE_SAMPLING_RATE` is unset. */
const DEFAULT_SAMPLING_RATE = 0.1;

/**
 * Parse `VITE_SAMPLING_RATE` from build-env. Falls back to the default for
 * undefined, NaN, or out-of-range `[0, 1]` values. Exported for tests.
 */
export function parseSamplingRate(raw: string | undefined): number {
  if (raw === undefined || raw === '') return DEFAULT_SAMPLING_RATE;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed < 0 || parsed > 1) return DEFAULT_SAMPLING_RATE;
  return parsed;
}

class TracerService {
  private initialized = false;
  private tracer: Tracer | null = null;

  async init(): Promise<void> {
    if (this.initialized) return;

    const otlpUrl = import.meta.env.VITE_OTLP_URL as string | undefined;
    const isDev = import.meta.env.DEV as boolean;

    // Nothing to set up in a standard MVP build — skip the heavy SDK imports.
    if (!otlpUrl && !isDev) return;

    await this._doInit(otlpUrl, isDev);
  }

  private async _doInit(otlpUrl: string | undefined, isDev: boolean): Promise<void> {
    const [
      { WebTracerProvider, StackContextManager, BatchSpanProcessor },
      { SimpleSpanProcessor, ConsoleSpanExporter, TraceIdRatioBasedSampler },
      { registerInstrumentations },
      { FetchInstrumentation },
      { resourceFromAttributes },
    ] = await Promise.all([
      import('@opentelemetry/sdk-trace-web'),
      import('@opentelemetry/sdk-trace-base'),
      import('@opentelemetry/instrumentation'),
      import('@opentelemetry/instrumentation-fetch'),
      import('@opentelemetry/resources'),
    ]);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const spanProcessors: any[] = [];

    if (isDev) {
      spanProcessors.push(new SimpleSpanProcessor(new ConsoleSpanExporter()));
    }

    if (otlpUrl) {
      const { OTLPTraceExporter } = await import('@opentelemetry/exporter-trace-otlp-http');
      spanProcessors.push(
        new BatchSpanProcessor(new OTLPTraceExporter({ url: otlpUrl, headers: {} }))
      );
    }

    // Phase 12.5: client-side sampling. Dexie middleware emits a span per DB
    // operation (potentially hundreds per session); without sampling a full
    // session would fan out into a backend volume that exceeds quota.
    // Trace-id-based ratio sampling guarantees a request either fully samples
    // or fully drops, so child spans are never orphaned.
    const samplingRate = parseSamplingRate(
      import.meta.env.VITE_SAMPLING_RATE as string | undefined
    );

    const provider = new WebTracerProvider({
      resource: resourceFromAttributes({
        'service.name': 'questerix-fractions',
        'service.version': (import.meta.env.VITE_GIT_SHA as string) || 'dev',
      }),
      sampler: new TraceIdRatioBasedSampler(samplingRate),
      spanProcessors,
    });

    provider.register({ contextManager: new StackContextManager() });

    registerInstrumentations({
      instrumentations: [new FetchInstrumentation({ ignoreUrls: [/localhost/] })],
    });

    this.tracer = trace.getTracer('questerix-fractions');
    this.initialized = true;
  }

  getTracer(): Tracer {
    return this.tracer ?? trace.getTracer('noop');
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  startSpan(name: string, attributes?: Record<string, any>) {
    return this.getTracer().startSpan(name, attributes ? { attributes } : {});
  }
}

export const tracerService = new TracerService();
export default tracerService;
