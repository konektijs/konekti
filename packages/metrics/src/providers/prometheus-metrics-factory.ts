import {
  Counter,
  Gauge,
  Histogram,
  type CounterConfiguration,
  type GaugeConfiguration,
  type HistogramConfiguration,
  type Registry,
} from 'prom-client';

/**
 * Create a Prometheus counter bound to the provided registry.
 *
 * @param registry Prometheus registry that should own the created metric.
 * @param config Counter configuration forwarded to `prom-client`.
 * @returns A Prometheus counter registered only on the provided registry.
 */
export function createPrometheusCounter<T extends string = string>(
  registry: Registry,
  config: CounterConfiguration<T>,
): Counter<T> {
  return new Counter({ ...config, registers: [registry] });
}

/**
 * Create a Prometheus gauge bound to the provided registry.
 *
 * @param registry Prometheus registry that should own the created metric.
 * @param config Gauge configuration forwarded to `prom-client`.
 * @returns A Prometheus gauge registered only on the provided registry.
 */
export function createPrometheusGauge<T extends string = string>(
  registry: Registry,
  config: GaugeConfiguration<T>,
): Gauge<T> {
  return new Gauge({ ...config, registers: [registry] });
}

/**
 * Create a Prometheus histogram bound to the provided registry.
 *
 * @param registry Prometheus registry that should own the created metric.
 * @param config Histogram configuration forwarded to `prom-client`.
 * @returns A Prometheus histogram registered only on the provided registry.
 */
export function createPrometheusHistogram<T extends string = string>(
  registry: Registry,
  config: HistogramConfiguration<T>,
): Histogram<T> {
  return new Histogram({ ...config, registers: [registry] });
}
