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

async function post(body, { method = 'POST', headers = { host: 'fallback.example.com' } } = {}) {
  const { res, out } = makeRes();
  await handler({ method, body, headers }, res);
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
