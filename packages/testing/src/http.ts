import type { Dispatcher, FrameworkRequest, FrameworkResponse, HttpMethod } from '@konekti/http';

export interface TestRequest {
  method?: string;
  path: string;
  body?: unknown;
  headers?: Record<string, string>;
  query?: Record<string, string | string[]>;
}

export interface TestResponse {
  status: number;
  body: unknown;
  headers: Record<string, string>;
}

type MutableFrameworkResponse = FrameworkResponse & { statusSet?: boolean };

function buildFrameworkRequest(req: TestRequest): FrameworkRequest {
  const method = (req.method ?? 'GET').toUpperCase() as HttpMethod;
  const queryString = req.query
    ? '?' + new URLSearchParams(
        Object.entries(req.query).flatMap(([key, value]) =>
          Array.isArray(value) ? value.map((v) => [key, v]) : [[key, value]],
        ),
      ).toString()
    : '';

  return {
    method,
    path: req.path,
    url: req.path + queryString,
    headers: req.headers ?? {},
    query: req.query ?? {},
    cookies: {},
    params: {},
    body: req.body,
    raw: req,
  };
}

function buildFrameworkResponse(): { response: MutableFrameworkResponse; result: TestResponse } {
  const result: TestResponse = { status: 200, body: undefined, headers: {} };

  const response: MutableFrameworkResponse = {
    statusCode: undefined,
    headers: {},
    committed: false,

    setStatus(code: number) {
      result.status = code;
      this.statusCode = code;
      this.statusSet = true;
    },

    setHeader(name: string, value: string) {
      result.headers[name] = value;
      this.headers[name] = value;
    },

    redirect(status: number, location: string) {
      this.setStatus(status);
      this.setHeader('location', location);
      this.committed = true;
    },

    async send(body: unknown) {
      result.body = body;
      this.committed = true;
    },

    statusSet: false,
  };

  return { response, result };
}

export async function makeRequest(dispatcher: Dispatcher, req: TestRequest): Promise<TestResponse> {
  const frameworkRequest = buildFrameworkRequest(req);
  const { response, result } = buildFrameworkResponse();

  await dispatcher.dispatch(frameworkRequest, response);

  return result;
}
