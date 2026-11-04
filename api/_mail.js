// Small shared helper to send one email through Resend.
// Used by the contact form and by "resend my access link".
// (The purchase emails keep using their own code in _email.js, unchanged.)

export function mailSettings() {
  const { RESEND_API_KEY, EMAIL_FROM, REPLY_TO } = process.env;
  const siteUrl = (process.env.SITE_URL || '').replace(/\/$/, '');
  if (!RESEND_API_KEY || !EMAIL_FROM) throw new Error('RESEND_API_KEY or EMAIL_FROM is missing');
  if (!siteUrl) throw new Error('SITE_URL is missing');
  return { apiKey: RESEND_API_KEY, from: EMAIL_FROM, replyTo: REPLY_TO, siteUrl };
}

export async function sendMail({ to, subject, html, text, replyTo, idempotencyKey }) {
  const { apiKey, from } = mailSettings();
  const body = { from, to: [to], subject, text };
  if (html) body.html = html;
  if (replyTo) body.reply_to = replyTo;

  const headers = { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' };
  if (idempotencyKey) headers['Idempotency-Key'] = idempotencyKey;

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`Resend error ${res.status}: ${detail}`);
  }
}

export const escapeHtml = (s) =>
  String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

// Best-effort limit per visitor. On serverless it only lives while the
// function instance is warm, so it slows spam down but is not a guarantee.
export function makeLimiter({ max, windowMs }) {
  const hits = new Map();
  return function allow(key, now = Date.now()) {
    const recent = (hits.get(key) || []).filter((t) => now - t < windowMs);
    if (recent.length >= max) {
      hits.set(key, recent);
      return false;
    }
    recent.push(now);
    hits.set(key, recent);
    if (hits.size > 5000) hits.clear();
    return true;
  };
}

export function clientIp(req) {
  const fwd = String(req.headers?.['x-forwarded-for'] || '').split(',')[0].trim();
  return fwd || req.socket?.remoteAddress || 'unknown';
}
