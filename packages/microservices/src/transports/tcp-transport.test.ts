import { Socket } from 'node:net';

import { describe, expect, it, vi } from 'vitest';

import { TcpMicroserviceTransport } from './tcp-transport.js';

describe('TcpMicroserviceTransport', () => {
  it('closes sockets that exceed the inbound frame buffer cap', async () => {
    const port = 0;
    const handler = vi.fn(async () => undefined);
    const transport = new TcpMicroserviceTransport({ port, requestTimeoutMs: 1_000 });

    await transport.listen(handler);

    await new Promise<void>((resolve, reject) => {
      const socket = new Socket();

      socket.once('close', () => resolve());
      socket.once('error', () => resolve());
      socket.connect((transport as unknown as { boundPort: number }).boundPort, '127.0.0.1', () => {
        socket.write('x'.repeat(1_048_577));
      });

      setTimeout(() => reject(new Error('Timed out waiting for oversized TCP frame to close.')), 1_000);
    });

    expect(handler).not.toHaveBeenCalled();

    await transport.close();
  });

  it('removes abort listener after a request completes normally', async () => {
    const port = 0;
    const transport = new TcpMicroserviceTransport({ port, requestTimeoutMs: 1_000 });

    await transport.listen(async () => 'ok');

    const controller = new AbortController();
    const removeEventListenerSpy = vi.spyOn(controller.signal, 'removeEventListener');

    await expect(transport.send('success.pattern', {}, controller.signal)).resolves.toBe('ok');

    expect(removeEventListenerSpy).toHaveBeenCalledWith('abort', expect.any(Function));

    await transport.close();
  });

  it('rejects send and emit after close() stops the listener', async () => {
    const transport = new TcpMicroserviceTransport({ port: 0, requestTimeoutMs: 1_000 });

    await transport.listen(async () => 'ok');
    await transport.close();

    await expect(transport.send('closed.pattern', {})).rejects.toThrow(
      'TcpMicroserviceTransport is closing. Wait for close() to complete before send().',
    );
    await expect(transport.emit('closed.event', {})).rejects.toThrow(
      'TcpMicroserviceTransport is closing. Wait for close() to complete before emit().',
    );
  });
});
