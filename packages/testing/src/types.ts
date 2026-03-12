import type { Token } from '@konekti/core';
import type { Container, Provider } from '@konekti-internal/di';
import type { BootstrapResult, BootstrapModuleOptions, ModuleType } from '@konekti-internal/module';

export interface TestingModuleOptions extends BootstrapModuleOptions {
  rootModule: ModuleType;
}

export interface TestingModuleRef extends BootstrapResult {
  has(token: Token): boolean;
  resolve<T>(token: Token<T>): Promise<T>;
}

export interface TestingModuleBuilder {
  compile(): Promise<TestingModuleRef>;
  overrideProvider<T>(token: Token<T>, provider: Provider<T>): this;
  overrideProvider<T>(token: Token<T>, value: T): this;
}

export interface TestingBootstrapResult {
  container: Container;
  modules: BootstrapResult['modules'];
  rootModule: ModuleType;
}
