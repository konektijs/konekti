/** Counter facade exposed by the metrics abstraction layer. */
export interface MeterCounter {
  inc(labels?: Record<string, string | number>, value?: number): void;
}

/** Gauge facade exposed by the metrics abstraction layer. */
export interface MeterGauge {
  set(value: number, labels?: Record<string, string | number>): void;
}

/** Histogram facade exposed by the metrics abstraction layer. */
export interface MeterHistogram {
  observe(value: number, labels?: Record<string, string | number>): void;
}

/** Provider interface that creates concrete metric instruments for one backend. */
export interface MeterProvider {
  readonly type: 'prometheus' | 'otel' | string;
  createCounter(name: string, help: string, labelNames?: string[]): MeterCounter;
  createGauge(name: string, help: string, labelNames?: string[]): MeterGauge;
  createHistogram(name: string, help: string, labelNames?: string[], buckets?: number[]): MeterHistogram;
}

/** Dependency-injection token for the active framework meter provider. */
export const METER_PROVIDER = Symbol.for('konekti.metrics.meter-provider');
