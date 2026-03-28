const { Pool } = require('pg');
const { logger } = require('../utils/logger');
require('dotenv').config();

const ssl =
  process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false;

const parsedMax = parseInt(process.env.PG_POOL_MAX, 10);
const poolMax = Number.isFinite(parsedMax) && parsedMax > 0 ? parsedMax : 20;

const parsedIdle = parseInt(process.env.PG_IDLE_TIMEOUT_MS, 10);
const idleTimeoutMillis =
  Number.isFinite(parsedIdle) && parsedIdle >= 0 ? parsedIdle : 30000;

const parsedStmt = parseInt(process.env.PG_STATEMENT_TIMEOUT_MS, 10);
const statementTimeoutMs =
  Number.isFinite(parsedStmt) && parsedStmt > 0 ? parsedStmt : 0;

const sharedPoolOptions = {
  ssl,
  max: poolMax,
  idleTimeoutMillis,
  connectionTimeoutMillis: 10000,
  keepAlive: true,
  keepAliveInitialDelayMillis: 0,
};

if (statementTimeoutMs > 0) {
  sharedPoolOptions.options = `-c statement_timeout=${statementTimeoutMs}`;
}

// Check if we have DATABASE_URL (Render's preferred format)
let poolConfig;
if (process.env.DATABASE_URL) {
  poolConfig = {
    connectionString: process.env.DATABASE_URL,
    ...sharedPoolOptions,
  };
} else {
  poolConfig = {
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'frashcart_ecommerce',
    password: process.env.DB_PASSWORD || 'password',
    port: process.env.DB_PORT || 5432,
    ...sharedPoolOptions,
  };
}

const pool = new Pool(poolConfig);

// Log new pool connections only when debugging (avoids log noise under load)
if (process.env.DEBUG_PG === '1') {
  pool.on('connect', () => {
    console.log('Connected to PostgreSQL database (pool client)');
  });
}

pool.on('error', (err) => {
  logger.error('Unexpected error on idle PostgreSQL client (pool will replace bad clients)', {
    message: err.message,
    stack: err.stack,
  });
});

module.exports = {
  query: (text, params) => pool.query(text, params),
  pool,
};
