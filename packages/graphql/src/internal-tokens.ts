import type { Token } from '@fluojs/core';

import type { GraphqlModuleOptions } from './types.js';

/**
 * DI token for providing GraphQL module configuration options.
 */
export const GRAPHQL_INTERNAL_MODULE_OPTIONS_TOKEN: Token<GraphqlModuleOptions> = Symbol.for(
  'fluo.graphql.module-options',
);
