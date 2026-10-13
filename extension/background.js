// NETSPECTRE Browser Observability Background Worker
const NETSPECTRE_INGEST_URL = 'http://127.0.0.1:48123/api/browser-obs/ingest';
const inFlightRequests = new Map();

// Helper to redact sensitive credentials
function redactHeader(name, value) {
  const lower = name.toLowerCase();
  if (lower.includes('authorization') || lower.includes('cookie') || lower.includes('token') || lower.includes('secret') || lower.includes('api-key')) {
    return '[REDACTED]';
  }
  return value;
}

// 1. Request initiated
chrome.webRequest.onBeforeRequest.addListener(
  (details) => {
    // Ignore internal traffic to NETSPECTRE engine itself
    if (details.url.includes('127.0.0.1:48123')) return;

    inFlightRequests.set(details.requestId, {
      url: details.url,
      method: details.method,
      startTime: Date.now(),
      tabId: details.tabId,
      sourceApp: 'Chromium Browser'
    });
  },
  { urls: ['<all_urls>'] }
);

// 2. Headers received
chrome.webRequest.onHeadersReceived.addListener(
  (details) => {
    if (details.url.includes('127.0.0.1:48123')) return;

    const req = inFlightRequests.get(details.requestId);
    if (req) {
      req.statusCode = details.statusCode;
      const headersMap = {};
      let contentType = 'application/octet-stream';
      let contentLength = 0;

      if (details.responseHeaders) {
        for (const h of details.responseHeaders) {
          headersMap[h.name] = redactHeader(h.name, h.value || '');
          if (h.name.toLowerCase() === 'content-type') contentType = h.value || '';
          if (h.name.toLowerCase() === 'content-length') contentLength = parseInt(h.value || '0', 10);
        }
      }

      req.headers = JSON.stringify(headersMap);
      req.contentType = contentType;
      req.sizeBytes = contentLength;
    }
  },
  { urls: ['<all_urls>'] },
  ['responseHeaders']
);

// 3. Completed: Send to NETSPECTRE Engine
chrome.webRequest.onCompleted.addListener(
  async (details) => {
    if (details.url.includes('127.0.0.1:48123')) return;

    const req = inFlightRequests.get(details.requestId);
    if (!req) return;

    const durationMs = Date.now() - req.startTime;

    const payload = {
      url: req.url,
      method: req.method,
      statusCode: req.statusCode || details.statusCode || 200,
      durationMs: durationMs,
      contentType: req.contentType || 'application/octet-stream',
      transferSizeBytes: req.sizeBytes || 0,
      headers: req.headers || '{}',
      sourceApp: 'Chromium Browser',
      tabId: req.tabId || 0
    };

    inFlightRequests.delete(details.requestId);

    try {
      await fetch(NETSPECTRE_INGEST_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
    } catch (e) {
      // NETSPECTRE engine might be stopped or paused
    }
  },
  { urls: ['<all_urls>'] }
);

// 4. Error occurred
chrome.webRequest.onErrorOccurred.addListener(
  async (details) => {
    if (details.url.includes('127.0.0.1:48123')) return;

    const req = inFlightRequests.get(details.requestId);
    if (!req) return;

    const durationMs = Date.now() - req.startTime;

    const payload = {
      url: req.url,
      method: req.method,
      statusCode: 0,
      durationMs: durationMs,
      contentType: 'error/' + (details.error || 'NETWORK_FAILURE'),
      transferSizeBytes: 0,
      headers: JSON.stringify({ error: details.error || 'Failed to connect' }),
      sourceApp: 'Chromium Browser',
      tabId: req.tabId || 0
    };

    inFlightRequests.delete(details.requestId);

    try {
      await fetch(NETSPECTRE_INGEST_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
    } catch (e) {}
  },
  { urls: ['<all_urls>'] }
);
