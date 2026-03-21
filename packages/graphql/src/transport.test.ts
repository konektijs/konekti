import { describe, expect, it, vi } from 'vitest';

import type { FrameworkResponse } from '@konekti/http';

import { writeFetchResponse } from './transport.js';

function createFrameworkResponseMock(): FrameworkResponse {
  return {
    committed: false,
    headers: {},
    redirect() {},
    send: vi.fn(async () => {}),
    setHeader: vi.fn(),
    setStatus: vi.fn(),
    statusCode: 200,
  };
}

describe('writeFetchResponse', () => {
  it('forwards repeated set-cookie values through separate setHeader calls', async () => {
    const headers = {
      entries() {
        return [['content-type', 'application/json']][Symbol.iterator]();
      },
      getSetCookie() {
        return ['access=one; Path=/', 'refresh=two; Path=/'];
      },
    } as unknown as Headers;
    const fetchResponse = {
      arrayBuffer: async () => new Uint8Array([1, 2, 3]).buffer,
      body: null,
      headers,
      status: 200,
    } as unknown as Response;
    const frameworkResponse = createFrameworkResponseMock();

    await writeFetchResponse(fetchResponse, frameworkResponse);

    expect(frameworkResponse.setHeader).toHaveBeenCalledWith('set-cookie', 'access=one; Path=/');
    expect(frameworkResponse.setHeader).toHaveBeenCalledWith('set-cookie', 'refresh=two; Path=/');
    expect(frameworkResponse.setHeader).toHaveBeenCalledWith('content-type', 'application/json');
  });

  it('falls back to headers.entries for set-cookie when getSetCookie is unavailable', async () => {
    const headers = {
      entries() {
        return [
          ['set-cookie', 'a=1; Path=/'],
          ['set-cookie', 'b=2; Path=/'],
        ][Symbol.iterator]();
      },
    } as unknown as Headers;
    const fetchResponse = {
      arrayBuffer: async () => new Uint8Array([1]).buffer,
      body: null,
      headers,
      status: 200,
    } as unknown as Response;
    const frameworkResponse = createFrameworkResponseMock();

    await writeFetchResponse(fetchResponse, frameworkResponse);

    expect(frameworkResponse.setHeader).toHaveBeenCalledWith('set-cookie', 'a=1; Path=/');
    expect(frameworkResponse.setHeader).toHaveBeenCalledWith('set-cookie', 'b=2; Path=/');
  });
});
