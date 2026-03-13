import type { ApplicationLogger } from './types.js';

const RESET = '\u001B[0m';
const BRIGHT_GREEN = '\u001B[32m';
const BRIGHT_RED = '\u001B[31m';
const BRIGHT_YELLOW = '\u001B[33m';
const DIM = '\u001B[2m';

function colorize(value: string, color: string, enabled: boolean): string {
  return enabled ? `${color}${value}${RESET}` : value;
}

function formatLog(level: 'ERROR' | 'LOG', context: string, message: string, color: boolean): string {
  const prefix = colorize('[Konekti]', BRIGHT_GREEN, color);
  const pid = colorize(String(process.pid), BRIGHT_YELLOW, color);
  const timestamp = colorize(new Date().toLocaleString('en-US'), DIM, color);
  const levelLabel = colorize(level, level === 'ERROR' ? BRIGHT_RED : BRIGHT_GREEN, color);
  const contextLabel = colorize(`[${context}]`, BRIGHT_YELLOW, color);

  return `${prefix} ${pid} - ${timestamp} ${levelLabel} ${contextLabel} ${message}`;
}

export function createConsoleApplicationLogger(): ApplicationLogger {
  return {
    error(message, error, context = 'Konekti') {
      console.error(formatLog('ERROR', context, message, Boolean(process.stderr.isTTY)));

      if (error) {
        console.error(error);
      }
    },
    log(message, context = 'Konekti') {
      console.log(formatLog('LOG', context, message, Boolean(process.stdout.isTTY)));
    },
  };
}
