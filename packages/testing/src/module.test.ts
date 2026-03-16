import { describe, expect, it, vi } from 'vitest';

import { Inject, Module } from '@konekti/core';
import type { Dispatcher } from '@konekti/http';

import { asMock, createMock } from './mock.js';
import { makeRequest } from './http.js';
import { createTestingModule } from './module.js';

describe('@konekti/testing', () => {
  it('creates a testing module and resolves providers from the module graph', async () => {
    class Logger {
      readonly name = 'logger';
    }

    @Inject([Logger])
    class UserService {
      constructor(readonly logger: Logger) {}
    }

    @Module({
      providers: [Logger, UserService],
    })
    class AppModule {}

    const testingModule = await createTestingModule({
      rootModule: AppModule,
    }).compile();

    const service = await testingModule.resolve(UserService);

    expect(testingModule.has(UserService)).toBe(true);
    expect(service.logger.name).toBe('logger');
  });

  it('overrides providers before resolution', async () => {
    class Logger {
      readonly name = 'logger';
    }

    @Inject([Logger])
    class UserService {
      constructor(readonly logger: Logger) {}
    }

    @Module({
      providers: [Logger, UserService],
    })
    class AppModule {}

    const testingModule = await createTestingModule({
      rootModule: AppModule,
    })
      .overrideProvider(Logger, { name: 'fake-logger' })
      .compile();

    const service = await testingModule.resolve(UserService);

    expect(service.logger).toEqual({ name: 'fake-logger' });
  });
});

describe('createMock', () => {
  it('returns vi.fn() for any accessed method not in the partial', () => {
    interface MyService {
      doSomething(): string;
      doOther(): number;
    }

    const mock = createMock<MyService>();

    expect(typeof mock.doSomething).toBe('function');
    expect(typeof mock.doOther).toBe('function');
  });

  it('uses provided partial values over auto-generated mocks', () => {
    interface Counter {
      increment(): number;
      decrement(): number;
    }

    const increment = vi.fn().mockReturnValue(1);
    const mock = createMock<Counter>({ increment });

    expect(mock.increment()).toBe(1);
    expect(increment).toHaveBeenCalledOnce();
  });

  it('returns the same auto-generated mock fn across multiple accesses to the same property', () => {
    interface Greeter {
      greet(): string;
    }

    const mock = createMock<Greeter>();
    const first = mock.greet;
    const second = mock.greet;

    expect(first).toBe(second);
  });
});

describe('asMock', () => {
  it('casts a vi.fn() to a typed MockInstance without runtime errors', () => {
    const fn = vi.fn().mockReturnValue(42);
    const typed = asMock(fn as () => number);

    typed.mockReturnValue(99);

    expect(fn()).toBe(99);
  });
});

describe('makeRequest', () => {
  it('dispatches a normalized request and captures the response', async () => {
    const dispatcher: Dispatcher = {
      async dispatch(request, response) {
        expect(request.method).toBe('POST');
        expect(request.path).toBe('/users');
        expect(request.url).toBe('/users?page=1&tag=a&tag=b');
        expect(request.query).toEqual({ page: '1', tag: ['a', 'b'] });
        expect(request.headers).toEqual({ 'x-test': '1' });
        expect(request.body).toEqual({ name: 'Ada' });

        response.setStatus(201);
        response.setHeader('x-powered-by', 'konekti');
        await response.send({ ok: true });
      },
    };

    const result = await makeRequest(dispatcher, {
      method: 'post',
      path: '/users',
      query: { page: '1', tag: ['a', 'b'] },
      headers: { 'x-test': '1' },
      body: { name: 'Ada' },
    });

    expect(result).toEqual({
      status: 201,
      headers: { 'x-powered-by': 'konekti' },
      body: { ok: true },
    });
  });
});
