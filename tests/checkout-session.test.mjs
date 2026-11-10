// Run with: npm test
import './helpers/setup.mjs';
import test, { beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { makeRes } from './helpers/setup.mjs';

const { default: handler } = await import('../api/create-checkout-session.js');
const { PRODUCTS, CURRENCY } = await import('../api/_products.js');

let calls;
beforeEach(() => {
  calls = [];
  process.env.SITE_URL = 'https://shop.example.com';
  globalThis.__stripe = { create: async (p) => { calls.push(p); return { url: 'https://checkout.stripe.test/s1' }; } };
});

let visitor = 0;
const CONSENT = { terms: true, digital: true };
async function post(body, { method = 'POST', ip, headers = { host: 'fallback.example.com' } } = {}) {
  const { res, out } = makeRes();
  // A different visitor per call, so the rate limit does not affect other tests.
  const h = { ...headers, 'x-forwarded-for': ip || `10.0.0.${++visitor}` };
  // Every order needs both confirmations; tests for missing consent pass consent explicitly.
  if (body && typeof body === 'object' && !('consent' in body) && method === 'POST') body = { ...body, consent: CONSENT };
  await handler({ method, body, headers: h, socket: {} }, res);
  return out;
}

test('only POST is accepted', async () => {
  const out = await post({}, { method: 'GET' });
  assert.equal(out.status, 405);
  assert.equal(out.headers.Allow, 'POST');
  assert.equal(calls.length, 0);
});

test('every product has a positive whole-cent price and a name', () => {
  for (const [id, p] of Object.entries(PRODUCTS)) {
    assert.ok(Number.isInteger(p.amount) && p.amount > 0, `${id} amount`);
    assert.ok(p.name && p.name.length > 3, `${id} name`);
  }
  assert.deepEqual(Object.keys(PRODUCTS).sort(), ['north', 'rural', 'windmills']);
});

test('one itinerary: price and name come from the server', async () => {
  const out = await post({ items: ['north'] });
  assert.equal(out.status, 200);
  assert.equal(out.body.url, 'https://checkout.stripe.test/s1');
  const p = calls[0];
  assert.equal(p.mode, 'payment');
  assert.equal(p.line_items.length, 1);
  assert.equal(p.line_items[0].quantity, 1);
  assert.equal(p.line_items[0].price_data.currency, CURRENCY);
  assert.equal(p.line_items[0].price_data.unit_amount, PRODUCTS.north.amount);
  assert.equal(p.line_items[0].price_data.product_data.name, PRODUCTS.north.name);
  assert.equal(p.metadata.items, 'north');
});

test('a price sent by the browser is ignored', async () => {
  await post({ items: ['north'], price: 1, amount: 1, unit_amount: 1, line_items: [{ price_data: { unit_amount: 1 } }] });
  assert.equal(calls[0].line_items[0].price_data.unit_amount, PRODUCTS.north.amount);
});

test('three itineraries, in order, each once', async () => {
  await post({ items: ['windmills', 'north', 'rural', 'north', 'windmills'] });
  assert.deepEqual(calls[0].line_items.map((l) => l.price_data.product_data.name),
    [PRODUCTS.windmills.name, PRODUCTS.north.name, PRODUCTS.rural.name]);
  assert.equal(calls[0].metadata.items, 'windmills,north,rural');
});

test('unknown ids are dropped, known ones kept', async () => {
  await post({ items: ['north', 'free', '../x'] });
  assert.equal(calls[0].metadata.items, 'north');
});

test('inherited object keys are not products', async () => {
  for (const bad of ['__proto__', 'constructor', 'toString', 'hasOwnProperty']) {
    const out = await post({ items: [bad] });
    assert.equal(out.status, 400, bad);
  }
  assert.equal(calls.length, 0);
});

test('nothing valid selected gives 400 and never calls Stripe', async () => {
  for (const body of [{}, { items: [] }, { items: 'north' }, { items: [null, 5, {}] }, undefined]) {
    const out = await post(body);
    assert.equal(out.status, 400);
  }
  assert.equal(calls.length, 0);
});

test('return addresses use SITE_URL, without a trailing slash', async () => {
  process.env.SITE_URL = 'https://shop.example.com/';
  await post({ items: ['north'] });
  assert.equal(calls[0].success_url, 'https://shop.example.com/success.html?session_id={CHECKOUT_SESSION_ID}');
  assert.equal(calls[0].cancel_url, 'https://shop.example.com/checkout.html');
});

test('without SITE_URL the request host is used', async () => {
  delete process.env.SITE_URL;
  await post({ items: ['north'] });
  assert.ok(calls[0].success_url.startsWith('https://fallback.example.com/success.html'));
});

test('a Stripe error gives a generic 500 without internal details', async () => {
  globalThis.__stripe.create = async () => { throw new Error('secret internal detail sk_test_abc'); };
  const out = await post({ items: ['north'] });
  assert.equal(out.status, 500);
  assert.ok(!JSON.stringify(out.body).includes('secret'));
});

test('rate limit: the 16th request in an hour from one visitor gets 429', async () => {
  let last;
  for (let i = 0; i < 15; i++) {
    last = await post({ items: ['north'] }, { ip: '203.0.113.9' });
    assert.equal(last.status, 200);
  }
  last = await post({ items: ['north'] }, { ip: '203.0.113.9' });
  assert.equal(last.status, 429);
  assert.equal(calls.length, 15);
});

test('rate limit: another visitor is not affected', async () => {
  const out = await post({ items: ['north'] }, { ip: '198.51.100.7' });
  assert.equal(out.status, 200);
});

test('consent: missing, partial or non-boolean consent is rejected before Stripe is called', async () => {
  for (const consent of [undefined, null, {}, { terms: true }, { digital: true }, { terms: true, digital: false }, { terms: 'true', digital: 'true' }, { terms: 1, digital: 1 }]) {
    const out = await post({ items: ['north'], consent });
    assert.equal(out.status, 400, JSON.stringify(consent));
    assert.equal(out.body.code, 'consent_required');
  }
  assert.equal(calls.length, 0);
});

test('consent: the record (time, policy versions) is stored on the session and the payment', async () => {
  const before = Date.now();
  await post({ items: ['north', 'rural'], consent: CONSENT });
  const p = calls[0];
  const { TERMS_VERSION, PRIVACY_VERSION } = await import('../api/_consent.js');
  for (const m of [p.metadata, p.payment_intent_data.metadata]) {
    assert.equal(m.consent_terms, 'yes');
    assert.equal(m.consent_digital, 'yes');
    assert.equal(m.terms_version, TERMS_VERSION);
    assert.equal(m.privacy_version, PRIVACY_VERSION);
    const at = Date.parse(m.consent_at);
    assert.ok(at >= before - 1000 && at <= Date.now() + 1000);
  }
  assert.equal(p.metadata.items, 'north,rural');
});

test('consent: policy versions match the "Last updated" date of the legal texts', async () => {
  const { readFileSync } = await import('node:fs');
  const { TERMS_VERSION, PRIVACY_VERSION } = await import('../api/_consent.js');
  const iso = (file) => {
    const m = readFileSync(file, 'utf8').match(/Last updated: (\d{1,2}) (\w+) (\d{4})/);
    return new Date(`${m[1]} ${m[2]} ${m[3]} UTC`).toISOString().slice(0, 10);
  };
  assert.equal(TERMS_VERSION, iso('public/legal/terms.md'));
  assert.equal(PRIVACY_VERSION, iso('public/legal/privacy.md'));
});
