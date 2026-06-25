const REDACTION_TAIL_LIMIT = 4000;

const ACCOUNT_HOST_PATTERNS = [
  /(^|\.)accounts\.google\.com$/iu,
  /(^|\.)login\.microsoftonline\.com$/iu,
  /(^|\.)login\.live\.com$/iu,
  /(^|\.)account\.mozilla\.com$/iu,
  /(^|\.)accounts\.firefox\.com$/iu,
];

const CREDENTIAL_KEY_PATTERN =
  /\b(access_token|refresh_token|id_token|auth(?:orization)?|bearer|cookie|set-cookie|session(?:id)?|csrf|xsrf|password|passwd|secret|api[_-]?key|client_secret|code|state|login_hint)\b\s*[:=]\s*[^\s&;,'")}\]]+/giu;
const HEADER_SECRET_PATTERN =
  /\b(cookie|set-cookie|authorization|proxy-authorization)\s*:\s*[^\r\n]+/giu;
const JWT_PATTERN = /\beyJ[A-Za-z0-9_-]{12,}\.[A-Za-z0-9_-]{12,}\.[A-Za-z0-9_-]{8,}\b/gu;
const EMAIL_PATTERN = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/giu;
const POSIX_USER_PATH_PATTERN = /(?:\/Users|\/home)\/[^\s/'"<>\\]+(?:\/[^\s'"<>\\]*)?/giu;
const WINDOWS_USER_PATH_PATTERN = /\b[A-Z]:\\Users\\[^\s'"<>\\]+(?:\\[^\s'"<>]*)?/giu;
const URL_PATTERN = /\b(?:https?|file|chrome-extension|moz-extension):\/\/[^\s'"<>\\)\]}]+/giu;
const GOOGLE_ACCOUNT_BARE_PATTERN = /\baccounts\.google\.com\b(?:\/[^\s'"<>\\)\]}]*)?/giu;

export function redactSensitiveString(input, options = {}) {
  let text = String(input);
  let redactionCount = 0;
  const replace = (pattern, replacement) => {
    text = text.replace(pattern, (...args) => {
      redactionCount += 1;
      return typeof replacement === 'function' ? replacement(...args) : replacement;
    });
  };

  replace(URL_PATTERN, (match) => redactUrl(match));
  replace(
    GOOGLE_ACCOUNT_BARE_PATTERN,
    '[REDACTED_ACCOUNT_ENDPOINT host_category=account_endpoint]'
  );
  replace(
    HEADER_SECRET_PATTERN,
    (_match, name) => `${String(name).toLowerCase()}: [REDACTED_SECRET]`
  );
  replace(CREDENTIAL_KEY_PATTERN, (_match, key) => `${key}=[REDACTED_SECRET]`);
  replace(JWT_PATTERN, '[REDACTED_JWT]');
  replace(EMAIL_PATTERN, '[REDACTED_EMAIL]');
  replace(WINDOWS_USER_PATH_PATTERN, '[REDACTED_LOCAL_PATH platform=windows]');
  replace(POSIX_USER_PATH_PATTERN, '[REDACTED_LOCAL_PATH platform=posix]');

  const maxLength = Number.isInteger(options.maxLength) ? options.maxLength : undefined;
  if (maxLength !== undefined && text.length > maxLength) text = text.slice(-maxLength);
  return Object.freeze({
    value: text,
    redactionCount,
    sensitiveMaterialRemoved: redactionCount > 0,
  });
}

export function sanitizeProcessOutput(input, options = {}) {
  const maxLength = Number.isInteger(options.maxLength) ? options.maxLength : REDACTION_TAIL_LIMIT;
  const redacted = redactSensitiveString(input ?? '', { maxLength });
  return Object.freeze({
    tail: redacted.value,
    redactionCount: redacted.redactionCount,
    sensitiveMaterialRemoved: redacted.sensitiveMaterialRemoved,
  });
}

export function redactEvidence(value) {
  const state = { redactionCount: 0, sensitiveMaterialRemoved: false };
  const redacted = redactEvidenceValue(value, state);
  if (isRecord(redacted)) {
    return Object.freeze({
      ...redacted,
      evidencePrivacy: Object.freeze({
        redactionVersion: '1.0.0',
        redactionCount: state.redactionCount,
        sensitiveMaterialRemoved: state.sensitiveMaterialRemoved,
      }),
    });
  }
  return redacted;
}

function redactEvidenceValue(value, state) {
  if (typeof value === 'string') {
    const redacted = redactSensitiveString(value);
    state.redactionCount += redacted.redactionCount;
    state.sensitiveMaterialRemoved ||= redacted.sensitiveMaterialRemoved;
    return redacted.value;
  }
  if (Array.isArray(value))
    return Object.freeze(value.map((item) => redactEvidenceValue(item, state)));
  if (isRecord(value)) {
    const out = {};
    for (const [key, item] of Object.entries(value)) {
      if (key === 'sensitiveMaterialRemoved' && item === true)
        state.sensitiveMaterialRemoved = true;
      if (key === 'redactionCount' && typeof item === 'number' && item > 0) {
        state.redactionCount += item;
        state.sensitiveMaterialRemoved = true;
      }
      out[key] = redactEvidenceValue(item, state);
    }
    return Object.freeze(out);
  }
  return value;
}

function redactUrl(match) {
  try {
    const url = new URL(match);
    if (url.protocol === 'file:') return '[REDACTED_FILE_URL path_private=true]';
    const hostname = url.hostname.toLowerCase();
    const pathDepth = url.pathname.split('/').filter(Boolean).length;
    const hostCategory = classifyHost(hostname, url.protocol);
    const query = url.search ? ' query=true' : ' query=false';
    const fragment = url.hash ? ' fragment=true' : ' fragment=false';
    return `[REDACTED_URL scheme=${url.protocol.replace(':', '')} host_category=${hostCategory} path_depth=${pathDepth}${query}${fragment}]`;
  } catch {
    return '[REDACTED_URL malformed=true]';
  }
}

function classifyHost(hostname, protocol) {
  if (protocol === 'chrome-extension:' || protocol === 'moz-extension:') return 'extension_origin';
  if (ACCOUNT_HOST_PATTERNS.some((pattern) => pattern.test(hostname))) return 'account_endpoint';
  if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1') return 'loopback';
  if (/^(10|172\.(1[6-9]|2\d|3[0-1])|192\.168)\./u.test(hostname)) return 'private_network';
  if (!hostname.includes('.')) return 'private_hostname';
  return 'public_web';
}

function isRecord(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
