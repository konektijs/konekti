import type { IncomingMessage } from 'node:http';
import { EventEmitter } from 'node:events';

import { describe, expect, it } from 'vitest';

import { createFrameworkRequest } from './node-request.js';
import { NodeRequestPayloadTooLargeException } from './internal-node-request.js';

function createIncomingMessage(options: {
  body?: string | Uint8Array;
  bodyChunks?: Array<string | Uint8Array>;
  destroy?: () => void;
  headers: Record<string, string | string[] | undefined>;
  method?: string;
  pause?: () => void;
  url?: string;
}): IncomingMessage {
  const chunks: Uint8Array[] = [];

  if (options.bodyChunks) {
    for (const chunk of options.bodyChunks) {
      chunks.push(typeof chunk === 'string' ? Buffer.from(chunk, 'utf8') : chunk);
    }
  } else if (options.body !== undefined) {
    chunks.push(typeof options.body === 'string' ? Buffer.from(options.body, 'utf8') : options.body);
  }

  return {
    destroy: options.destroy,
    headers: options.headers,
    method: options.method ?? 'GET',
    pause: options.pause,
    async *[Symbol.asyncIterator]() {
      for (const chunk of chunks) {
        yield chunk;
      }
    },
    url: options.url ?? '/',
  } as unknown as IncomingMessage;
}

describe('node request adapter', () => {
  it('preserves multi-value header arrays without flattening them', async () => {
    const upstreamValues = ['v1', 'v2'];
    const request = createIncomingMessage({
      headers: {
        'x-multi': upstreamValues,
      },
      url: '/headers',
    });

    const frameworkRequest = await createFrameworkRequest(request, new AbortController().signal);

    upstreamValues.push('v3');

    expect(frameworkRequest.headers['x-multi']).toEqual(['v1', 'v2']);
  });

  it('parses cookie header arrays without losing cookie boundaries', async () => {
    const request = createIncomingMessage({
      headers: {
        cookie: ['session=abc', 'theme=dark'],
      },
      url: '/cookies',
    });

    const frameworkRequest = await createFrameworkRequest(request, new AbortController().signal);

    expect(frameworkRequest.cookies).toEqual({
      session: 'abc',
      theme: 'dark',
    });
  });

  it('uses the primary content-type value when duplicate content-type headers are present', async () => {
    const request = createIncomingMessage({
      body: '{"ok":true}',
      headers: {
        'content-type': ['application/json', 'text/plain'],
      },
      method: 'POST',
      url: '/body',
    });

    const frameworkRequest = await createFrameworkRequest(request, new AbortController().signal);

    expect(frameworkRequest.body).toEqual({ ok: true });
  });

  it('destroys the raw Node request stream when maxBodySize is exceeded', async () => {
    let destroyed = false;
    let paused = false;
    const request = createIncomingMessage({
      bodyChunks: ['12345', '67890'],
      destroy: () => {
        destroyed = true;
      },
      headers: {
        'content-type': 'text/plain',
      },
      method: 'POST',
      pause: () => {
        paused = true;
      },
      url: '/body',
    });

    const response = new EventEmitter() as EventEmitter & {
      headers: Record<string, string>;
      setHeader: (name: string, value: string) => void;
    };
    response.headers = {};
    response.setHeader = (name, value) => {
      response.headers[name] = value;
    };

    const thrown = await createFrameworkRequest(request, new AbortController().signal, undefined, 8).catch((error: unknown) => error);

    expect(thrown).toBeInstanceOf(NodeRequestPayloadTooLargeException);
    (thrown as NodeRequestPayloadTooLargeException).prepareResponse(response as never);

    expect(paused).toBe(true);
    expect(response.headers.Connection).toBe('close');
    response.emit('finish');
    expect(destroyed).toBe(true);
  });
});
