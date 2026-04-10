import type { Token } from '@fluojs/core';

import type { WebSocketModuleOptions } from './types.js';

/**
 * Internal injection token for the WebSocket module options.
 */
export const WEBSOCKET_OPTIONS_INTERNAL: Token<WebSocketModuleOptions> = Symbol.for('fluo.websocket.options');
