import type { Token } from '@fluojs/core';

import type { SocketIoModuleOptions } from './types.js';

/**
 * Internal injection token for the Socket.IO module options.
 */
export const SOCKETIO_OPTIONS_INTERNAL: Token<SocketIoModuleOptions> = Symbol.for('fluo.socketio.options');
