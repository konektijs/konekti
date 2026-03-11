import { describe, expect, it } from 'vitest';

import { Controller, Get } from './decorators';
import { RouteConflictError } from './errors';
import { createHandlerMapping } from './mapping';

describe('handler mapping', () => {
  it('normalizes paths and extracts path params', () => {
    class UsersController {
      getUser() {
        return { ok: true };
      }
    }

    Controller('//users/')(UsersController);
    Get('/:id/')(UsersController.prototype, 'getUser');

    const mapping = createHandlerMapping([
      {
        controllerToken: UsersController,
      },
    ]);

    const match = mapping.match({
      body: undefined,
      cookies: {},
      headers: {},
      method: 'GET',
      params: {},
      path: '/users/42/',
      query: {},
      raw: {},
      url: '/users/42/',
    });

    expect(match).toMatchObject({
      descriptor: {
        controllerToken: UsersController,
        methodName: 'getUser',
        route: {
          method: 'GET',
          path: '/users/:id',
        },
      },
      params: {
        id: '42',
      },
    });
  });

  it('fails fast on duplicate normalized route registrations', () => {
    class HealthController {
      first() {
        return { ok: true };
      }
    }

    Controller('/health')(HealthController);
    Get('/')(HealthController.prototype, 'first');

    class DuplicateHealthController {
      second() {
        return { ok: true };
      }
    }

    Controller('//health//')(DuplicateHealthController);
    Get('')(DuplicateHealthController.prototype, 'second');

    expect(() =>
      createHandlerMapping([
        { controllerToken: HealthController },
        { controllerToken: DuplicateHealthController },
      ]),
    ).toThrow(RouteConflictError);
  });
});
