import { WebTracerProvider, BatchSpanProcessor } from '@opentelemetry/sdk-trace-web';
import { SimpleSpanProcessor, ConsoleSpanExporter } from '@opentelemetry/sdk-trace-base';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { registerInstrumentations } from '@opentelemetry/instrumentation';
import { FetchInstrumentation } from '@opentelemetry/instrumentation-fetch';
import { ZoneContextManager } from '@opentelemetry/context-zone';
import { resourceFromAttributes } from '@opentelemetry/resources';
import { SEMRESATTRS_SERVICE_NAME, SEMRESATTRS_SERVICE_VERSION } from '@opentelemetry/semantic-conventions';
import { trace, type Tracer } from '@opentelemetry/api';

class TracerService {
  private provider: WebTracerProvider | null = null;
  private tracer: Tracer | null = null;

  init() {
    if (this.provider) return;

    this.provider = new WebTracerProvider({
      resource: resourceFromAttributes({
        [SEMRESATTRS_SERVICE_NAME]: 'questerix-fractions',
        [SEMRESATTRS_SERVICE_VERSION]: import.meta.env.VITE_GIT_SHA || 'dev',
      }),
    });

    // 1. Console export for DX
    if (import.meta.env.DEV) {
      this.provider.addSpanProcessor(new SimpleSpanProcessor(new ConsoleSpanExporter()));
    }

    // 2. OTLP Export for production/telemetry
    const otlpUrl = import.meta.env.VITE_OTLP_URL;
    if (otlpUrl) {
      const exporter = new OTLPTraceExporter({
        url: otlpUrl,
        headers: {}, // Add auth headers if needed
      });
      this.provider.addSpanProcessor(new BatchSpanProcessor(exporter));
    }

    this.provider.register({
      contextManager: new ZoneContextManager(),
    });

    registerInstrumentations({
      instrumentations: [
        new FetchInstrumentation({
          ignoreUrls: [/localhost/], // Don't instrument local dev server calls
        }),
      ],
    });

    this.tracer = trace.getTracer('questerix-fractions');
  }

  getTracer(): Tracer {
    if (!this.tracer) {
      return trace.getTracer('noop');
    }
    return this.tracer;
  }

  /**
   * Start a manual span.
   */
  startSpan(name: string, attributes?: Record<string, any>) {
    return this.getTracer().startSpan(name, { attributes });
  }
}

export const tracerService = new TracerService();
export default tracerService;
