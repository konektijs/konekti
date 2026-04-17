import type { Provider } from '@fluojs/di';
import { defineModule, type ModuleType } from '@fluojs/runtime';

import { WEBSOCKET_OPTIONS_INTERNAL } from '../options-token.internal.js';
import { DenoWebSocketGatewayLifecycleService } from './deno-service.js';
import type { WebSocketModuleOptions } from './deno-types.js';

function createDenoWebSocketProviders(options: WebSocketModuleOptions = {}): Provider[] {
  return [
    {
      provide: WEBSOCKET_OPTIONS_INTERNAL,
      useValue: options,
    },
    DenoWebSocketGatewayLifecycleService,
  ];
}

/**
 * Explicit Deno websocket module entrypoint.
 */
export class DenoWebSocketModule {
  /**
   * Registers the Deno websocket lifecycle service for request-upgrade gateway hosting.
   *
   * @param options Websocket gateway runtime options for guards, limits, heartbeat, and shutdown behavior.
   * @returns A runtime module definition scoped to the Deno websocket adapter.
   */
  static forRoot(options: WebSocketModuleOptions = {}): ModuleType {
    class DenoWebSocketRuntimeModule extends DenoWebSocketModule {}

    return defineModule(DenoWebSocketRuntimeModule, {
      providers: createDenoWebSocketProviders(options),
    });
  }
}
