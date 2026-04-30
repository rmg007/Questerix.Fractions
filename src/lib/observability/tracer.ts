import { trace, type Tracer } from '@opentelemetry/api';

// Heavy OTel SDK packages are dynamically imported inside init() so they are
// excluded from the main bundle when VITE_OTLP_URL is not set at build time.

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
      { SimpleSpanProcessor, ConsoleSpanExporter },
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

    const provider = new WebTracerProvider({
      resource: resourceFromAttributes({
        'service.name': 'questerix-fractions',
        'service.version': (import.meta.env.VITE_GIT_SHA as string) || 'dev',
      }),
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
