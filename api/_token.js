import { createHmac, timingSafeEqual } from 'node:crypto';

// How long a purchase link keeps working.
export const ACCESS_DAYS = 30;

const b64url = (data) => Buffer.from(data).toString('base64url');

function sign(payloadB64) {
  const secret = process.env.TOKEN_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error('TOKEN_SECRET is missing or shorter than 32 characters');
  }
  return createHmac('sha256', secret).update(payloadB64).digest();
}

// The token carries everything the server needs (what was bought, the Stripe
// session id and the expiry date). The signature proves nobody edited it, so
// no database is needed to check it.
export function createToken({ items, sessionId, days = ACCESS_DAYS }) {
  const payload = {
    i: items,
    s: sessionId,
    x: Math.floor(Date.now() / 1000) + Math.round(days * 86400),
  };
  const payloadB64 = b64url(JSON.stringify(payload));
  return `${payloadB64}.${b64url(sign(payloadB64))}`;
}

export function verifyToken(token) {
  const invalid = { ok: false, reason: 'invalid' };
  if (typeof token !== 'string') return invalid;

  const parts = token.split('.');
  if (parts.length !== 2) return invalid;
  const [payloadB64, sigB64] = parts;

  const expected = sign(payloadB64); // throws if the server is misconfigured
  const given = Buffer.from(sigB64, 'base64url');
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) {
    return invalid;
  }

  let payload;
  try {
    payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf8'));
  } catch {
    return invalid;
  }
  if (!Array.isArray(payload.i) || typeof payload.x !== 'number') return invalid;

  if (payload.x < Math.floor(Date.now() / 1000)) {
    return { ok: false, reason: 'expired' };
  }
  return { ok: true, items: payload.i, sessionId: payload.s, expires: payload.x };
}
