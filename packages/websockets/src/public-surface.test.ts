import { describe, expect, it } from 'vitest';

import * as bun from './bun.js';
import * as workers from './cloudflare-workers.js';
import * as deno from './deno.js';
import * as websockets from './index.js';
import * as node from './node.js';

describe('@fluojs/websockets public surface', () => {
  it('keeps the documented root barrel focused on module-first registration', () => {
    expect(websockets).toHaveProperty('WebSocketModule');
    expect((websockets as { WebSocketModule: { forRoot: unknown } }).WebSocketModule).toHaveProperty('forRoot');
    expect(websockets).toHaveProperty('WebSocketGatewayLifecycleService');
    expect(websockets).not.toHaveProperty('createWebSocketProviders');
    expect(websockets).not.toHaveProperty('WEBSOCKET_OPTIONS_INTERNAL');
    expect(websockets).toHaveProperty('WebSocketGateway');
    expect(websockets).toHaveProperty('OnConnect');
    expect(websockets).toHaveProperty('OnDisconnect');
    expect(websockets).toHaveProperty('OnMessage');
    expect(Object.keys(websockets).sort()).toMatchSnapshot('root');
  });

  it('keeps runtime subpaths focused on explicit module and lifecycle exports', () => {
    expect(node).toHaveProperty('NodeWebSocketModule');
    expect(node).toHaveProperty('NodeWebSocketGatewayLifecycleService');
    expect(node).not.toHaveProperty('createNodeWebSocketProviders');

    expect(bun).toHaveProperty('BunWebSocketModule');
    expect(bun).toHaveProperty('BunWebSocketGatewayLifecycleService');
    expect(bun).not.toHaveProperty('createBunWebSocketProviders');

    expect(deno).toHaveProperty('DenoWebSocketModule');
    expect(deno).toHaveProperty('DenoWebSocketGatewayLifecycleService');
    expect(deno).not.toHaveProperty('createDenoWebSocketProviders');

    expect(workers).toHaveProperty('CloudflareWorkersWebSocketModule');
    expect(workers).toHaveProperty('CloudflareWorkersWebSocketGatewayLifecycleService');
    expect(workers).not.toHaveProperty('createCloudflareWorkersWebSocketProviders');

    expect({
      bun: Object.keys(bun).sort(),
      'cloudflare-workers': Object.keys(workers).sort(),
      deno: Object.keys(deno).sort(),
      node: Object.keys(node).sort(),
    }).toMatchSnapshot('runtime-subpaths');
  });
});
