import type { Provider } from '@fluojs/di';
import { defineModule, type ModuleType } from '@fluojs/runtime';

import {
  COOKIE_AUTH_OPTIONS,
  COOKIE_AUTH_STRATEGY_NAME,
  CookieAuthStrategy,
  type CookieAuthOptions,
} from './cookie-auth.js';
import { CookieManager, type CookieManagerConfig } from './cookie-manager.js';
import type { AuthStrategyRegistration } from '../types.js';

type CookieAuthModuleType = ModuleType;

/**
 * Configures the built-in cookie-auth strategy and cookie manager preset.
 */
export interface CookieAuthPresetConfig {
  cookieAuth?: CookieAuthOptions;
  cookieManager?: CookieManagerConfig;
}

/**
 * Creates the providers required by the built-in cookie-auth preset.
 *
 * @param config Optional cookie strategy and cookie manager configuration.
 * @returns Provider definitions for `COOKIE_AUTH_OPTIONS`, `CookieAuthStrategy`, and `CookieManager`.
 */
export function createCookieAuthProviders(config?: CookieAuthPresetConfig): Provider[] {
  return [
    {
      provide: COOKIE_AUTH_OPTIONS,
      useValue: config?.cookieAuth ?? {},
    },
    CookieAuthStrategy,
    {
      inject: [],
      provide: CookieManager,
      useFactory: () => new CookieManager(config?.cookieManager),
    },
  ];
}

/**
 * Creates the passport strategy registration for the built-in cookie preset.
 *
 * @returns The named strategy registration consumed by `PassportModule.forRoot(...)`.
 */
export function createCookieAuthStrategyRegistration(): AuthStrategyRegistration {
  return {
    name: COOKIE_AUTH_STRATEGY_NAME,
    token: CookieAuthStrategy,
  };
}

/**
 * Creates a compatibility preset bundle for manual provider composition.
 *
 * @param config Optional cookie strategy and cookie manager configuration.
 * @returns The preset providers plus the matching cookie strategy registration.
 */
export function createCookieAuthPreset(config?: CookieAuthPresetConfig): {
  providers: Provider[];
  strategy: AuthStrategyRegistration;
} {
  return {
    providers: createCookieAuthProviders(config),
    strategy: createCookieAuthStrategyRegistration(),
  };
}

/**
 * Canonical module-first entrypoint for the built-in cookie-auth preset.
 */
export class CookieAuthModule {
  /**
   * Registers the cookie-auth strategy and `CookieManager` preset as a module.
   *
   * @param config Optional cookie strategy and cookie manager configuration.
   * @returns A module definition that exports `CookieAuthStrategy` and `CookieManager`.
   *
   * @example
   * ```ts
   * import { Module } from '@fluojs/core';
   * import {
   *   CookieAuthModule,
   *   CookieAuthStrategy,
   *   COOKIE_AUTH_STRATEGY_NAME,
   *   PassportModule,
   * } from '@fluojs/passport';
   *
   * @Module({
   *   imports: [
   *     CookieAuthModule.forRoot(),
   *     PassportModule.forRoot(
   *       { defaultStrategy: COOKIE_AUTH_STRATEGY_NAME },
   *       [{ name: COOKIE_AUTH_STRATEGY_NAME, token: CookieAuthStrategy }],
   *     ),
   *   ],
   * })
   * export class AuthModule {}
   * ```
   */
  static forRoot(config?: CookieAuthPresetConfig): CookieAuthModuleType {
    class CookieAuthRuntimeModule extends CookieAuthModule {}

    return defineModule(CookieAuthRuntimeModule, {
      exports: [CookieAuthStrategy, CookieManager],
      providers: createCookieAuthProviders(config),
    });
  }
}
