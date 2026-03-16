import { getCurrentRequestContext } from '@konekti/http';

import type { ApplicationLogger } from './types.js';

type LogLevel = 'debug' | 'error' | 'log' | 'warn';

interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  requestId?: string;
  context?: string;
}

function buildEntry(level: LogLevel, message: string, context?: string): LogEntry {
  const entry: LogEntry = {
    level,
    message,
    timestamp: new Date().toISOString(),
  };

  const requestId = getCurrentRequestContext()?.requestId;

  if (requestId) {
    entry.requestId = requestId;
  }

  if (context) {
    entry.context = context;
  }

  return entry;
}

export function createJsonApplicationLogger(): ApplicationLogger {
  return {
    debug(message, context) {
      process.stdout.write(JSON.stringify(buildEntry('debug', message, context)) + '\n');
    },
    error(message, _error, context) {
      process.stderr.write(JSON.stringify(buildEntry('error', message, context)) + '\n');
    },
    log(message, context) {
      process.stdout.write(JSON.stringify(buildEntry('log', message, context)) + '\n');
    },
    warn(message, context) {
      process.stderr.write(JSON.stringify(buildEntry('warn', message, context)) + '\n');
    },
  };
}
