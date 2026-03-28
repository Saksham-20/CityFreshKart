const { logStructured } = require('./requestContext');

function jsonClientError(res, req, status, payload = {}) {
  return res.status(status).json({
    success: false,
    ref: req?.requestId,
    ...payload,
  });
}

function logApiError(req, event, error, extra = {}) {
  logStructured('error', {
    requestId: req?.requestId,
    event,
    message: error?.message,
    pgCode: error?.code,
    constraint: error?.constraint,
    detail: error?.detail,
    stack: process.env.NODE_ENV === 'development' ? error?.stack : undefined,
    ...extra,
  });
}

module.exports = { jsonClientError, logApiError };
