import { Controller, Get, type MiddlewareLike, type RequestContext } from '@konekti/http';
import { defineModule, type ModuleType } from '@konekti/runtime';
import { Registry, collectDefaultMetrics } from 'prom-client';

export interface MetricsModuleOptions {
  path?: string;
  defaultMetrics?: boolean;
  middleware?: MiddlewareLike[];
}

export class MetricsModule {
  static forRoot(options: MetricsModuleOptions = {}): ModuleType {
    const metricsPath = options.path ?? '/metrics';
    const registry = new Registry();

    if (options.defaultMetrics !== false) {
      collectDefaultMetrics({ register: registry });
    }

    @Controller('')
    class MetricsController {
      @Get(metricsPath)
      async getMetrics(_input: undefined, ctx: RequestContext): Promise<string> {
        ctx.response.setHeader('content-type', registry.contentType);
        return registry.metrics();
      }
    }

    class MetricsRuntimeModule {}

    defineModule(MetricsRuntimeModule, {
      controllers: [MetricsController],
      middleware: options.middleware ?? [],
    });

    return MetricsRuntimeModule;
  }
}
