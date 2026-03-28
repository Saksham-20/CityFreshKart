/**
 * Build a single user-facing string from an axios error (aligns with API { message, ref, errorCode }).
 */
export function formatApiErrorMessage(error, fallback = 'Request failed') {
  const d = error?.response?.data;
  if (d?.errors && Array.isArray(d.errors) && d.errors.length > 0) {
    const first = d.errors[0];
    const msg =
      typeof first === 'string'
        ? first
        : first?.msg || first?.message || 'Validation failed';
    const ref = d.ref;
    const code = d?.errorCode;
    const parts = [msg, code && `[${code}]`, ref && `(ref: ${ref})`].filter(Boolean);
    return parts.join(' ');
  }
  const base =
    d?.message ||
    (typeof d?.error === 'string' ? d.error : d?.error?.message) ||
    error?.message ||
    fallback;
  const ref = d?.ref;
  const code = d?.errorCode;
  const parts = [base, code && `[${code}]`, ref && `(ref: ${ref})`].filter(Boolean);
  return parts.join(' ');
}
