import { register } from 'node:module';

register('./stripe-loader.mjs', import.meta.url);

process.env.STRIPE_SECRET_KEY = 'sk_test_fake';
process.env.STRIPE_WEBHOOK_SECRET = 'whsec_fake';
process.env.TOKEN_SECRET = 'x'.repeat(40);
process.env.RESEND_API_KEY = 're_fake';
process.env.EMAIL_FROM = 'Shop <shop@example.com>';
process.env.REPLY_TO = 'reply@example.com';
process.env.SITE_URL = 'https://shop.example.com';
process.env.REVIEW_URL = 'https://g.page/r/example';

// Minimal request/response doubles for Vercel-style handlers.
export function makeRes() {
  const out = { headers: {} };
  const res = {
    setHeader: (k, v) => { out.headers[k] = v; },
    status(c) { out.status = c; return this; },
    json(o) { out.body = o; return this; },
    send(o) { out.body = o; return this; },
    end() { return this; },
  };
  return { res, out };
}

export function stubResend({ fail = false } = {}) {
  const sent = [];
  globalThis.fetch = async (url, opts) => {
    sent.push({ url, headers: opts.headers, body: JSON.parse(opts.body) });
    return fail ? { ok: false, status: 422, text: async () => 'rejected' } : { ok: true, text: async () => '' };
  };
  return sent;
}
