// Run with: npm test
import './helpers/setup.mjs';
import test, { beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { makeRes, stubResend } from './helpers/setup.mjs';

const { default: handler } = await import('../api/webhook.js');
const { verifyToken } = await import('../api/_token.js');
const { PRODUCTS } = await import('../api/_products.js');

let sent, logs;
beforeEach(() => {
  sent = stubResend();
  process.env.REVIEW_URL = 'https://g.page/r/example';
  logs = [];
  console.log = () => {};
  console.error = (...a) => logs.push(a.join(' '));
});

const session = (o = {}) => ({
  id: 'cs_test_1', payment_status: 'paid', metadata: { items: 'north' },
  customer_details: { email: 'ana@example.com', name: 'Ana Perez' }, ...o,
});
const event = (type, obj) => ({ id: 'evt_1', type, data: { object: obj } });

async function post(ev, { signature = 'valid-signature', method = 'POST' } = {}) {
  const raw = Buffer.from(JSON.stringify(ev));
  const req = {
    method,
    headers: signature ? { 'stripe-signature': signature } : {},
    async *[Symbol.asyncIterator]() { yield raw.subarray(0, 10); yield raw.subarray(10); },
  };
  const { res, out } = makeRes();
  await handler(req, res);
  return out;
}

test('only POST is accepted', async () => {
  assert.equal((await post({}, { method: 'GET' })).status, 405);
  assert.equal(sent.length, 0);
});

test('a bad or missing signature is rejected and nothing is sent', async () => {
  const ev = event('checkout.session.completed', session());
  assert.equal((await post(ev, { signature: 'forged' })).status, 400);
  assert.equal((await post(ev, { signature: null })).status, 400);
  assert.equal(sent.length, 0);
});

test('paid order: welcome email goes to the buyer with a working private link', async () => {
  const out = await post(event('checkout.session.completed', session()));
  assert.equal(out.status, 200);

  const welcome = sent[0].body;
  assert.deepEqual(welcome.to, ['ana@example.com']);
  assert.equal(welcome.from, 'Shop <shop@example.com>');
  assert.equal(welcome.reply_to, 'reply@example.com');
  assert.equal(sent[0].headers['Idempotency-Key'], 'access-cs_test_1');
  assert.ok(welcome.html.includes(PRODUCTS.north.name));

  const link = welcome.text.match(/https:\/\/shop\.example\.com\/api\/view\?token=[^\s]+/)[0];
  const token = decodeURIComponent(new URL(link).searchParams.get('token'));
  const v = verifyToken(token);
  assert.equal(v.ok, true);
  assert.deepEqual(v.items, ['north']);
  assert.equal(v.sessionId, 'cs_test_1');
});

test('paid order: the review email is scheduled about 7 days ahead', async () => {
  await post(event('checkout.session.completed', session()));
  const review = sent[1];
  assert.equal(sent.length, 2);
  assert.equal(review.headers['Idempotency-Key'], 'review-cs_test_1');
  const days = (Date.parse(review.body.scheduled_at) - Date.now()) / 86400000;
  assert.ok(days > 6.9 && days < 7.1, `days=${days}`);
});

test('several itineraries are all in the token', async () => {
  await post(event('checkout.session.completed', session({ metadata: { items: 'north,rural,windmills' } })));
  const link = sent[0].body.text.match(/token=([^\s]+)/)[1];
  assert.deepEqual(verifyToken(decodeURIComponent(link)).items, ['north', 'rural', 'windmills']);
});

test('unpaid sessions do not deliver anything', async () => {
  const out = await post(event('checkout.session.completed', session({ payment_status: 'unpaid' })));
  assert.equal(out.status, 200);
  assert.equal(sent.length, 0);
});

test('other event types are acknowledged and ignored', async () => {
  const out = await post(event('payment_intent.created', {}));
  assert.equal(out.status, 200);
  assert.equal(sent.length, 0);
});

test('unknown ids in metadata are never delivered', async () => {
  const out = await post(event('checkout.session.completed', session({ metadata: { items: 'north,../secret,free' } })));
  assert.equal(out.status, 200);
  const items = verifyToken(decodeURIComponent(sent[0].body.text.match(/token=([^\s]+)/)[1])).items;
  assert.deepEqual(items, ['north']);
});

test('no valid items: 500 so Stripe retries, nothing sent', async () => {
  const out = await post(event('checkout.session.completed', session({ metadata: { items: 'free' } })));
  assert.equal(out.status, 500);
  assert.equal(sent.length, 0);
});

test('no customer email: 500 so Stripe retries', async () => {
  const out = await post(event('checkout.session.completed', session({ customer_details: {} })));
  assert.equal(out.status, 500);
  assert.equal(sent.length, 0);
});

test('Resend failure on the welcome email: 500 so Stripe retries, no review scheduled', async () => {
  sent = stubResend({ fail: true });
  const out = await post(event('checkout.session.completed', session()));
  assert.equal(out.status, 500);
  assert.equal(sent.length, 1);
});

test('review scheduling failure does NOT fail the order', async () => {
  delete process.env.REVIEW_URL;
  const out = await post(event('checkout.session.completed', session()));
  assert.equal(out.status, 200);
  assert.equal(sent.length, 1);
  assert.ok(logs.some((l) => l.includes('Review email NOT scheduled')));
});

test('a hostile customer name cannot inject HTML into the email', async () => {
  await post(event('checkout.session.completed', session({ customer_details: { email: 'a@b.com', name: '<img src=x onerror=alert(1)>' } })));
  assert.ok(!sent[0].body.html.includes('<img src=x'));
});

test('delayed payment: unpaid at checkout delivers nothing, then paid later delivers once', async () => {
  const first = await post(event('checkout.session.completed', session({ payment_status: 'unpaid' })));
  assert.equal(first.status, 200);
  assert.equal(sent.length, 0);

  const later = await post(event('checkout.session.async_payment_succeeded', session()));
  assert.equal(later.status, 200);
  assert.deepEqual(sent[0].body.to, ['ana@example.com']);
  assert.equal(sent[0].headers['Idempotency-Key'], 'access-cs_test_1');
  assert.equal(sent.length, 2); // welcome + scheduled review
});

test('delayed payment succeeded but not actually paid: nothing is delivered', async () => {
  const out = await post(event('checkout.session.async_payment_succeeded', session({ payment_status: 'unpaid' })));
  assert.equal(out.status, 200);
  assert.equal(sent.length, 0);
});

test('delayed payment failed: acknowledged, logged, nothing delivered', async () => {
  const out = await post(event('checkout.session.async_payment_failed', session({ payment_status: 'unpaid' })));
  assert.equal(out.status, 200);
  assert.equal(sent.length, 0);
  assert.ok(logs.some((l) => l.includes('Delayed payment failed')));
});

test('delayed payment: a failed email still returns 500 so Stripe retries', async () => {
  sent = stubResend({ fail: true });
  const out = await post(event('checkout.session.async_payment_succeeded', session()));
  assert.equal(out.status, 500);
});
