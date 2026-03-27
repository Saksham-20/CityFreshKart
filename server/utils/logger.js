const winston = require('winston');
const path = require('path');

// Only errors (no http/info/warn noise). Override with LOG_LEVEL=error|warn|info if needed.
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

const resolveLevel = () => {
  const fromEnv = (process.env.LOG_LEVEL || '').toLowerCase();
  if (['error', 'warn', 'info', 'http', 'debug'].includes(fromEnv)) return fromEnv;
  return 'error';
};

const fileFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
  winston.format.errors({ stack: true }),
  winston.format.json(),
);

const consoleFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
  winston.format.errors({ stack: true }),
  winston.format.json(),
);

const transports = [
  new winston.transports.Console({
    level: resolveLevel(),
    format: consoleFormat,
  }),
  new winston.transports.File({
    filename: path.join('logs', 'error.log'),
    level: 'error',
    format: fileFormat,
    maxsize: 5242880,
    maxFiles: 5,
  }),
];

const logger = winston.createLogger({
  level: resolveLevel(),
  levels,
  format: fileFormat,
  transports,
  exitOnError: false,
});

const fs = require('fs');
const logsDir = path.join(process.cwd(), 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

/** No-op: per-request logging disabled (errors only). */
const requestLogger = (req, res, next) => next();

const errorLogger = (err, req, res, next) => {
  logger.error('Application Error', {
    requestId: req.id,
    error: err.message,
    stack: err.stack,
    code: err.code,
    method: req.method,
    url: req.originalUrl,
    ip: req.ip || req.connection?.remoteAddress,
    userAgent: req.get('User-Agent'),
    timestamp: new Date().toISOString(),
  });
  next(err);
};

process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception', {
    error: error.message,
    stack: error.stack,
    timestamp: new Date().toISOString(),
  });
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection', {
    reason: reason?.message || String(reason),
    stack: reason?.stack,
    promise: String(promise),
    timestamp: new Date().toISOString(),
  });
});

module.exports = {
  logger,
  requestLogger,
  errorLogger,
};
