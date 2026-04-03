/**
 * Human-readable copy when the API body is missing or not JSON (e.g. Nginx HTML on 413).
 */
function messageForHttpStatus(status, statusText) {
  const st = String(statusText || '').toLowerCase();
  if (status === 401) {
    return 'Your session expired or you are not signed in. Sign in again and retry.';
  }
  if (status === 403) {
    return 'You do not have permission for this action.';
  }
  if (status === 404) {
    return 'The requested resource was not found.';
  }
  if (status === 409) {
    return 'This conflicts with existing data (for example a duplicate name or slug).';
  }
  if (status === 413 || st.includes('payload') || st.includes('too large')) {
    return (
      'The request or image is too large for the server to accept (HTTP 413). ' +
      'Use an image within the 5MB admin limit or use an image URL. ' +
      'If a 2-3MB file still fails, set your reverse proxy/Nginx client_max_body_size to at least 8M.'
    );
  }
  if (status === 429) {
    return 'Too many requests. Wait a moment and try again.';
  }
  if (status === 502) {
    return 'Bad gateway — the app could not reach the API server. Try again shortly.';
  }
  if (status === 503) {
    return 'Service temporarily unavailable. Try again in a few minutes.';
  }
  if (status === 504) {
    return 'Gateway timeout — the server took too long to respond. Try again.';
  }
  if (status >= 500) {
    return 'Something went wrong on the server. Try again or contact support with the reference below.';
  }
  if (status >= 400) {
    return 'The request could not be completed. Check your input and try again.';
  }
  return 'Request failed.';
}

function isUsableMessage(text) {
  if (text == null) return false;
  const s = String(text).trim();
  if (!s) return false;
  if (/^request failed with status code \d+$/i.test(s)) return false;
  return true;
}

function extractDataMessage(d) {
  if (!d || typeof d !== 'object') return '';
  return (
    d.message ||
    (typeof d.error === 'string' ? d.error : d.error?.message) ||
    ''
  );
}

function messageForNetworkError(error) {
  const code = error?.code;
  if (code === 'ERR_NETWORK' || code === 'ENOTFOUND' || code === 'ECONNREFUSED') {
    return 'Network error — check your internet connection and that the API server is reachable.';
  }
  if (code === 'ECONNABORTED' || /timeout/i.test(String(error?.message || ''))) {
    return 'Request timed out. Try again with a smaller upload or when the connection is stable.';
  }
  return '';
}

/**
 * Build a single user-facing string from an axios error (aligns with API { message, ref, errorCode }).
 */
export function formatApiErrorMessage(error, fallback = 'Request failed') {
  if (!error?.response) {
    const net = messageForNetworkError(error);
    if (net) {
      return net;
    }
    if (isUsableMessage(error?.message)) {
      return String(error.message).trim();
    }
    return fallback;
  }

  const { status, statusText, data } = error.response;

  if (data?.errors && Array.isArray(data.errors) && data.errors.length > 0) {
    const first = data.errors[0];
    const msg =
      typeof first === 'string'
        ? first
        : first?.msg || first?.message || 'Validation failed';
    const ref = data.ref;
    const code = data?.errorCode;
    const parts = [msg, code && `[${code}]`, ref && `(ref: ${ref})`].filter(Boolean);
    return parts.join(' ');
  }

  const isPlainObject = data && typeof data === 'object' && !Array.isArray(data);
  let base = '';

  if (typeof data === 'string') {
    const trimmed = data.trim();
    if (trimmed.startsWith('<') || trimmed.length > 200) {
      base = '';
    } else {
      base = trimmed;
    }
  } else if (isPlainObject) {
    base = extractDataMessage(data);
  }

  if (!isUsableMessage(base)) {
    base = messageForHttpStatus(status, statusText);
    if (!isUsableMessage(base)) {
      base = fallback;
    }
  }

  const ref = isPlainObject ? data.ref : undefined;
  const errCode = isPlainObject ? data.errorCode : undefined;
  const parts = [base, errCode && `[${errCode}]`, ref && `(ref: ${ref})`].filter(Boolean);
  return parts.join(' ');
}
