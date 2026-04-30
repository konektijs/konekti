import { afterEach, describe, expect, it, vi } from 'vitest';

import { MinLength } from '@fluojs/validation';

import { FromQuery, RequestDto } from '../decorators.js';
import { HttpDtoValidationAdapter } from '../adapters/dto-validation-adapter.js';
import { invokeControllerHandler } from './dispatch-handler-policy.js';
import type { FrameworkRequest, FrameworkResponse, HandlerDescriptor } from '../types.js';

function createRequest(overrides: Partial<FrameworkRequest> = {}): FrameworkRequest {
  return {
    body: undefined,
    cookies: {},
    headers: {},
    method: 'GET',
    params: {},
    path: '/search',
    query: {},
    raw: {},
    url: '/search',
    ...overrides,
  };
}

function createResponse(): FrameworkResponse {
  return {
    committed: false,
    headers: {},
    redirect(status, location) {
      this.setStatus(status);
      this.setHeader('Location', location);
      this.committed = true;
    },
    send() {
      this.committed = true;
    },
    setHeader(name, value) {
      this.headers[name] = value;
    },
    setStatus(code) {
      this.statusCode = code;
      this.statusSet = true;
    },
    statusCode: undefined,
    statusSet: false,
  };
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('invokeControllerHandler', () => {
  it('skips dto validation when the RequestDto has no validation rules', async () => {
    class SearchRequest {
      @FromQuery('q')
      query = '';
    }

    class SearchController {
      @RequestDto(SearchRequest)
      search(input: SearchRequest) {
        return input.query;
      }
    }

    const controller = new SearchController();
    const validateSpy = vi.spyOn(HttpDtoValidationAdapter.prototype, 'validate');
    const result = await invokeControllerHandler(
      {
        controllerToken: SearchController,
        metadata: {
          controllerPath: '/search',
          effectivePath: '/search',
          moduleMiddleware: [],
          pathParams: [],
        },
        methodName: 'search',
        route: {
          method: 'GET',
          path: '/search',
          request: SearchRequest,
        },
      } satisfies HandlerDescriptor,
      {
        container: {
          async dispose() {
            return undefined;
          },
          async resolve<T>() {
            return controller as T;
          },
        },
        metadata: {},
        request: createRequest({ query: { q: 'fluo' } }),
        response: createResponse(),
      },
    );

    expect(result).toBe('fluo');
    expect(validateSpy).not.toHaveBeenCalled();
  });

  it('keeps validation enabled when the RequestDto declares validation rules', async () => {
    class SearchRequest {
      @FromQuery('q')
      @MinLength(1, { code: 'QUERY_REQUIRED', message: 'q is required' })
      query = '';
    }

    class SearchController {
      @RequestDto(SearchRequest)
      search(input: SearchRequest) {
        return input.query;
      }
    }

    const controller = new SearchController();
    const validateSpy = vi.spyOn(HttpDtoValidationAdapter.prototype, 'validate');

    await invokeControllerHandler(
      {
        controllerToken: SearchController,
        metadata: {
          controllerPath: '/search',
          effectivePath: '/search',
          moduleMiddleware: [],
          pathParams: [],
        },
        methodName: 'search',
        route: {
          method: 'GET',
          path: '/search',
          request: SearchRequest,
        },
      } satisfies HandlerDescriptor,
      {
        container: {
          async dispose() {
            return undefined;
          },
          async resolve<T>() {
            return controller as T;
          },
        },
        metadata: {},
        request: createRequest({ query: { q: 'fluo' } }),
        response: createResponse(),
      },
    );

    expect(validateSpy).toHaveBeenCalledOnce();
  });
});
