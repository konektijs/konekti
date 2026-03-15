import type { Token } from '@konekti/core';
import type { ClassType, Provider } from '@konekti/di';
import { bootstrapModule } from '@konekti/runtime';

import type { TestingModuleBuilder, TestingModuleOptions, TestingModuleRef } from './types.js';

function isProviderDescriptor<T>(value: Provider<T> | T): value is Provider<T> {
  return typeof value === 'object' && value !== null && ('useClass' in value || 'useFactory' in value || 'useValue' in value);
}

function isClassConstructor<T>(value: Provider<T> | T): value is ClassType<T> {
  return typeof value === 'function';
}

function normalizeOverride<T>(token: Token<T>, value: Provider<T> | T): Provider<T> {
  if (isProviderDescriptor(value)) {
    return { ...value, provide: token } as Provider<T>;
  }

  if (isClassConstructor(value)) {
    return { provide: token, useClass: value };
  }

  return { provide: token, useValue: value };
}

class DefaultTestingModuleBuilder implements TestingModuleBuilder {
  private readonly overrides: Provider[] = [];

  constructor(private readonly options: TestingModuleOptions) {}

  overrideProvider<T>(token: Token<T>, value: Provider<T> | T): this {
    this.overrides.push(normalizeOverride(token, value));
    return this;
  }

  async compile(): Promise<TestingModuleRef> {
    const bootstrapped = bootstrapModule(this.options.rootModule, {
      providers: this.options.providers,
    });

    if (this.overrides.length > 0) {
      bootstrapped.container.register(...this.overrides);
    }

    return {
      ...bootstrapped,
      has: (token) => bootstrapped.container.has(token),
      resolve: (token) => bootstrapped.container.resolve(token),
    };
  }
}

export function createTestingModule(options: TestingModuleOptions): TestingModuleBuilder {
  return new DefaultTestingModuleBuilder(options);
}
