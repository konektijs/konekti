import { vi } from 'vitest';
import type { Mock } from 'vitest';

export type MockedMethods<T> = {
  [K in keyof T]: T[K] extends (...args: never[]) => unknown ? Mock<T[K]> : T[K];
};

export function createMock<T extends object>(partial: Partial<MockedMethods<T>> = {}): MockedMethods<T> {
  const autoMocks = new Map<PropertyKey, unknown>();

  return new Proxy({ ...partial } as MockedMethods<T>, {
    get(target, prop, receiver) {
      if (Reflect.has(target, prop)) {
        return Reflect.get(target, prop, receiver);
      }

      if (!autoMocks.has(prop)) {
        autoMocks.set(prop, vi.fn());
      }

      return autoMocks.get(prop);
    },
  });
}

export function asMock<T extends (...args: never[]) => unknown>(fn: T): Mock<T> {
  return fn as unknown as Mock<T>;
}
