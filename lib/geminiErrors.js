// Helpers for classifying errors thrown by @google/generative-ai.
//
// Classify by HTTP status, never by substring-matching error.message:
// every SDK error message embeds the request URL
// (".../models/<model>:generateContent"), and "generateContent" contains
// "rate", so a check like message.includes('rate') matches every failure.

function parseStatus(error) {
    if (typeof error?.status === 'number') return error.status;
    const match = /\[(\d{3})\b[^\]]*\]/.exec(error?.message || '');
    return match ? Number(match[1]) : null;
}

// google.protobuf.Duration in JSON form, e.g. "37s" or "12.5s".
function parseDurationMs(value) {
    const match = /^(\d+(?:\.\d+)?)s$/.exec(String(value ?? '').trim());
    return match ? Math.ceil(parseFloat(match[1]) * 1000) : null;
}

export function getGeminiErrorInfo(error) {
    const status = parseStatus(error);
    const details = Array.isArray(error?.errorDetails) ? error.errorDetails : [];

    let violation = null;
    let retryDelayMs = null;
    for (const detail of details) {
        const type = detail?.['@type'] || '';
        if (!violation && type.endsWith('google.rpc.QuotaFailure') && Array.isArray(detail.violations)) {
            violation = detail.violations[0] || null;
        } else if (type.endsWith('google.rpc.RetryInfo')) {
            retryDelayMs = parseDurationMs(detail.retryDelay);
        }
    }

    // quotaId looks like "GenerateRequestsPerDayPerProjectPerModel-FreeTier"
    // or "GenerateRequestsPerMinutePerProjectPerModel-FreeTier".
    const quotaId = violation?.quotaId || null;
    let quotaWindow = null;
    if (quotaId) {
        if (/PerDay/i.test(quotaId)) quotaWindow = 'per-day';
        else if (/PerMinute/i.test(quotaId)) quotaWindow = 'per-minute';
        else quotaWindow = 'other';
    }

    const message = error?.message || '';

    return {
        status,
        isRateLimit: status === 429,
        isAuth: status === 401 || status === 403 || message.includes('API_KEY'),
        isOverloaded: status === 500 || status === 503,
        quotaId,
        quotaMetric: violation?.quotaMetric || null,
        quotaLimit: violation?.quotaValue ?? null,
        quotaWindow,
        freeTier: quotaId ? /FreeTier/i.test(quotaId) : null,
        retryDelayMs,
    };
}

// One-line summary for logs, e.g.
// "429 quota=GenerateRequestsPerDayPerProjectPerModel-FreeTier (per-day, free tier, limit 20) retryDelay=37s"
export function describeGeminiError(info) {
    if (!info) return 'unknown error';
    const parts = [info.status ? String(info.status) : 'no-status'];
    if (info.quotaId) {
        const qualifiers = [info.quotaWindow];
        if (info.freeTier) qualifiers.push('free tier');
        if (info.quotaLimit != null) qualifiers.push(`limit ${info.quotaLimit}`);
        parts.push(`quota=${info.quotaId} (${qualifiers.join(', ')})`);
    }
    if (info.retryDelayMs != null) {
        parts.push(`retryDelay=${Math.ceil(info.retryDelayMs / 1000)}s`);
    }
    return parts.join(' ');
}
