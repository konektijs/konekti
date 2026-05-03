import { afterEach, describe, expect, it, vi } from 'vitest';

import { createConsoleApplicationLogger } from './logger.js';

describe('createConsoleApplicationLogger', () => {
  const originalForceColor = process.env.FORCE_COLOR;
  const originalCliColorForce = process.env.CLICOLOR_FORCE;
  const originalNoColor = process.env.NO_COLOR;

  afterEach(() => {
    vi.restoreAllMocks();
    if (originalForceColor === undefined) {
      delete process.env.FORCE_COLOR;
    } else {
      process.env.FORCE_COLOR = originalForceColor;
    }
    if (originalNoColor === undefined) {
      delete process.env.NO_COLOR;
    } else {
      process.env.NO_COLOR = originalNoColor;
    }
    if (originalCliColorForce === undefined) {
      delete process.env.CLICOLOR_FORCE;
    } else {
      process.env.CLICOLOR_FORCE = originalCliColorForce;
    }
  });

  it('keeps the default pretty console format compatible', () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => undefined);

    createConsoleApplicationLogger({ color: false }).log('Application started', 'Bootstrap');

    expect(log).toHaveBeenCalledTimes(1);
    expect(log.mock.calls[0]?.[0]).toMatch(/^\[fluo\] \d+ - .+ LOG \[Bootstrap\] Application started$/);
  });

  it('filters messages below the configured level', () => {
    const debug = vi.spyOn(console, 'debug').mockImplementation(() => undefined);
    const log = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    const logger = createConsoleApplicationLogger({ color: false, level: 'warn' });

    logger.debug('debug');
    logger.log('log');
    logger.warn('warn');
    logger.error('error');

    expect(debug).not.toHaveBeenCalled();
    expect(log).not.toHaveBeenCalled();
    expect(warn).toHaveBeenCalledTimes(1);
    expect(error).toHaveBeenCalledTimes(1);
  });

  it('supports minimal output without timestamp and process metadata', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);

    createConsoleApplicationLogger({ color: false, mode: 'minimal' }).warn('Retrying connection', 'Worker');

    expect(warn).toHaveBeenCalledWith('[fluo] WARN [Worker] Retrying connection');
  });

  it('honors FORCE_COLOR for pipe-backed console output unless NO_COLOR is set', () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => undefined);

    process.env.FORCE_COLOR = '1';
    delete process.env.NO_COLOR;

    createConsoleApplicationLogger({ mode: 'minimal' }).log('Application started', 'Bootstrap');

    expect(log.mock.calls[0]?.[0]).toBe('\u001B[32m[fluo]\u001B[0m \u001B[32mLOG\u001B[0m \u001B[33m[Bootstrap]\u001B[0m Application started');

    log.mockClear();
    process.env.NO_COLOR = '1';

    createConsoleApplicationLogger({ mode: 'minimal' }).log('Application started', 'Bootstrap');

    expect(log.mock.calls[0]?.[0]).toBe('[fluo] LOG [Bootstrap] Application started');
  });

  it('honors CLICOLOR_FORCE as a color enablement signal', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);

    delete process.env.FORCE_COLOR;
    delete process.env.NO_COLOR;
    process.env.CLICOLOR_FORCE = '1';

    createConsoleApplicationLogger({ mode: 'minimal' }).warn('Retrying connection', 'Worker');

    expect(warn.mock.calls[0]?.[0]).toBe('\u001B[32m[fluo]\u001B[0m \u001B[31mWARN\u001B[0m \u001B[33m[Worker]\u001B[0m Retrying connection');
  });

  it('suppresses every method in silent mode including error objects', () => {
    const debug = vi.spyOn(console, 'debug').mockImplementation(() => undefined);
    const log = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    const logger = createConsoleApplicationLogger({ mode: 'silent' });

    logger.debug('debug');
    logger.log('log');
    logger.warn('warn');
    logger.error('error', new Error('boom'));

    expect(debug).not.toHaveBeenCalled();
    expect(log).not.toHaveBeenCalled();
    expect(warn).not.toHaveBeenCalled();
    expect(error).not.toHaveBeenCalled();
  });
});
