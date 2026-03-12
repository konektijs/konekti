import type { ApplicationLogger } from './types';

function formatLog(level: 'ERROR' | 'LOG', context: string, message: string): string {
  return `[Konekti] ${process.pid} - ${new Date().toLocaleString('en-US')} ${level} [${context}] ${message}`;
}

export function createConsoleApplicationLogger(): ApplicationLogger {
  return {
    error(message, error, context = 'Konekti') {
      console.error(formatLog('ERROR', context, message));

      if (error) {
        console.error(error);
      }
    },
    log(message, context = 'Konekti') {
      console.log(formatLog('LOG', context, message));
    },
  };
}
