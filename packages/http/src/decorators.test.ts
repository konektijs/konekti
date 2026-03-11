import { describe, expect, it } from 'vitest';

import { getControllerMetadata, getRouteMetadata } from '@konekti/core';

import { Controller, Get, UseGuard, UseInterceptor } from './decorators';

describe('http decorators', () => {
  it('writes controller and route metadata using helper APIs', () => {
    class ClassGuard {
      canActivate() {}
    }

    class MethodGuard {
      canActivate() {}
    }

    class ClassInterceptor {
      intercept(_context: unknown, next: { handle(): Promise<unknown> }) {
        return next.handle();
      }
    }

    class MethodInterceptor {
      intercept(_context: unknown, next: { handle(): Promise<unknown> }) {
        return next.handle();
      }
    }

    class ExampleController {
      getUser() {
        return { ok: true };
      }
    }

    Controller('/users')(ExampleController);
    UseGuard(ClassGuard)(ExampleController);
    UseInterceptor(ClassInterceptor)(ExampleController);
    Get('/:id')(ExampleController.prototype, 'getUser');
    UseGuard(MethodGuard)(
      ExampleController.prototype,
      'getUser',
      Object.getOwnPropertyDescriptor(ExampleController.prototype, 'getUser')!,
    );
    UseInterceptor(MethodInterceptor)(
      ExampleController.prototype,
      'getUser',
      Object.getOwnPropertyDescriptor(ExampleController.prototype, 'getUser')!,
    );

    expect(getControllerMetadata(ExampleController)).toEqual({
      basePath: '/users',
      guards: [ClassGuard],
      interceptors: [ClassInterceptor],
    });

    expect(getRouteMetadata(ExampleController.prototype, 'getUser')).toEqual({
      guards: [MethodGuard],
      interceptors: [MethodInterceptor],
      method: 'GET',
      path: '/:id',
      request: undefined,
      successStatus: undefined,
    });
  });
});
