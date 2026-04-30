import { onCLS, onFCP, onLCP, onTTFB, onINP, type Metric } from 'web-vitals';
import { logger } from './logger';

class MeterService {
  init() {
    // Only track vitals if in production or explicitly enabled
    if (import.meta.env.PROD || localStorage.getItem('DEBUG_VITALS')) {
      this.trackVitals();
    }
  }

  private trackVitals() {
    const report = (metric: Metric) => {
      logger.info(`WEB_VITAL: ${metric.name}`, {
        category: 'PERF',
        data: {
          value: metric.value,
          rating: metric.rating, // 'good' | 'needs-improvement' | 'poor'
          id: metric.id,
        },
      });
    };

    onCLS(report);
    onFCP(report);
    onLCP(report);
    onTTFB(report);
    onINP(report);
  }

  /**
   * Log a custom timing metric.
   */
  measure(name: string, durationMs: number, attributes?: Record<string, any>) {
    logger.info(`MEASURE: ${name}`, {
      category: 'PERF',
      data: {
        durationMs,
        ...attributes,
      },
    });
  }
}

export const meterService = new MeterService();
export default meterService;
