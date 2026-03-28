const crypto = require('crypto');

const MAX_INCOMING_ID_LEN = 128;

/**
 * Express middleware: assign X-Request-Id (honor incoming header if present) for log correlation.
 */
function attachRequestId(req, res, next) {
  const incoming = req.get('x-request-id') || req.get('X-Request-Id');
  const trimmed = incoming && String(incoming).trim();
  req.requestId =
    trimmed && trimmed.length <= MAX_INCOMING_ID_LEN
      ? trimmed
      : crypto.randomUUID();
  res.setHeader('X-Request-Id', req.requestId);
  next();
}

function logStructured(level, payload) {
  const line = JSON.stringify({ ts: new Date().toISOString(), ...payload });
  if (level === 'error') console.error(line);
  else if (level === 'warn') console.warn(line);
  else console.log(line);
}

module.exports = {
  attachRequestId,
  logStructured,
};
