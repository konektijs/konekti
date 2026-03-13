import type { Provider } from '@konekti/di';
import { AuthGuard } from './guard.js';
import {
  AUTH_STRATEGY_REGISTRY,
  PASSPORT_OPTIONS,
  type AuthStrategyRegistration,
  type AuthStrategyRegistry,
  type PassportModuleOptions,
} from './types.js';

function createStrategyRegistry(strategies: AuthStrategyRegistration[]): AuthStrategyRegistry {
  return Object.fromEntries(strategies.map((strategy) => [strategy.name, strategy.token])) as AuthStrategyRegistry;
}

export function createPassportProviders(
  options: PassportModuleOptions = {},
  strategies: AuthStrategyRegistration[] = [],
): Provider[] {
  return [
    {
      provide: PASSPORT_OPTIONS,
      useValue: { ...options },
    },
    {
      provide: AUTH_STRATEGY_REGISTRY,
      useValue: createStrategyRegistry(strategies),
    },
    AuthGuard,
  ];
}
