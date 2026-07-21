import * as winston from 'winston';
import * as path from 'path';
import * as fs from 'fs';
import { AsyncLocalStorage } from 'async_hooks';

// Distinguishes backend vs matchserver logs in Loki/Grafana. Set SERVICE_NAME
// per container. Also written into every JSON log line so Promtail can label
// by service when it ships the log files to Loki.
const serviceName = process.env.SERVICE_NAME || 'quiz-app-backend';

// Request-scoped log context (correlation IDs). A middleware runs each request
// inside logContext.run({ requestId, userId, ... }), and every log call below
// automatically merges the current store in - so one request's logs across
// controllers/services all carry the same requestId with no plumbing.
export const logContext = new AsyncLocalStorage<Record<string, any>>();
export const runWithLogContext = <T>(ctx: Record<string, any>, fn: () => T): T =>
  logContext.run({ ...(logContext.getStore() || {}), ...ctx }, fn);
const currentContext = (): Record<string, any> => logContext.getStore() || {};

// Ensure logs directory exists
const logsDir = path.join(process.cwd(), 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp({
      format: 'YYYY-MM-DD HH:mm:ss'
    }),
    winston.format.errors({ stack: true }),
    // NOTE: no metadata() nesting - keeps structured fields (event, userId,
    // matchId, timeSpent, requestId, traceId) at the TOP level of each JSON
    // line so Loki `| json | event="answer_submitted"` and Promtail's json
    // stage can read them directly instead of via a nested `metadata` object.
    winston.format.json()
  ),
  defaultMeta: {
    service: serviceName,
    version: '1.0.0'
  },
  transports: [
    // Error logs
    new winston.transports.File({ 
      filename: path.join(logsDir, 'error.log'), 
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
    // Combined logs
    new winston.transports.File({ 
      filename: path.join(logsDir, 'combined.log'),
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
    // Application logs
    new winston.transports.File({ 
      filename: path.join(logsDir, 'app.log'),
      level: 'info',
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
  ],
});

// Log shipping to Loki is handled out-of-process by Promtail tailing the JSON
// files above (see monitoring/promtail). That keeps the hot path free of any
// network push and sidesteps winston-loki's push-body escaping issues with
// nested metadata. The JSON `service` field lets Promtail label per service.

const shouldLogToConsole =
  process.env.NODE_ENV !== 'production'
  || process.env.LOG_TO_CONSOLE === 'true';

// Console transport for development (or explicitly enabled)
if (shouldLogToConsole) {
  if (process.env.NODE_ENV === 'production') {
    // winston's Console transport has no built-in non-blocking/async write
    // mode — it writes directly to process.stdout, so under sustained high
    // log throughput a slow/non-draining stdout can add I/O overhead. Keep
    // LOG_TO_CONSOLE off in production unless actively debugging.
    // eslint-disable-next-line no-console
    console.warn(
      '[logger] LOG_TO_CONSOLE=true in production — console transport is active and can add I/O overhead under load.'
    );
  }

  logger.add(new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple(),
      winston.format.printf(({ timestamp, level, message, ...meta }) => {
        return `${timestamp} [${level}]: ${message} ${Object.keys(meta).length ? JSON.stringify(meta, null, 2) : ''}`;
      })
    )
  }));
}

// Create structured logging methods. Each merges the request-scoped context
// (requestId/userId/etc) so correlation IDs appear on every line automatically.
export const logInfo = (message: string, meta?: any) => {
  logger.info(message, { ...currentContext(), ...meta });
};

export const logError = (message: string, error?: Error, meta?: any) => {
  logger.error(message, { ...currentContext(), error: error?.stack || error, ...meta });
};

export const logWarn = (message: string, meta?: any) => {
  logger.warn(message, { ...currentContext(), ...meta });
};

export const logDebug = (message: string, meta?: any) => {
  logger.debug(message, { ...currentContext(), ...meta });
};

export default logger;
