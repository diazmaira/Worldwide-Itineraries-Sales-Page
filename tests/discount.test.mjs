// Run with: npm test
import './helpers/setup.mjs';
import test, { beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { makeRes } from './helpers/setup.mjs';

const { default: check } = await import('../api/check-code.js');
const { default: create } = await import('../api/create-checkout-session.js');
const { isPaid } = await import('../api/_discount.js');

let asked, calls;
const PROMOS = {
  AMIGOS: { id: 'promo_1', coupon: { id: 'c1', valid: true, percent_off: 25 } },
  GRATIS: { id: 'promo_2', coupon: { id: 'c2', valid: true, percent_off: 100 } },
  CINCO: { id: 'promo_3', promotion: { coupon: { id: 'c3', valid: true, amount_off: 500, currency: 'eur' } } },
  OLD: { id: 'promo_4', coupon: { id: 'c4', valid: false, percent_off: 10 } },
};
beforeEach(() => {
  asked = []; calls = [];
  globalThis.__stripe = {
    promoList: async (p) => { asked.push(p); const hit = PROMOS[p.code]; return { data: hit ? [hit] : [] }; },
    create: async (p) => { calls.push(p); return { url: 'https://checkout.stripe.test/s1' }; },
  };
});

let visitor = 0;
async function post(handler, body) {
  const { res, out } = makeRes();
  await handler({ method: 'POST', body, headers: { 'x-forwarded-for': `10.1.0.${++visitor}` }, socket: {} }, res);
  return out;
}

test('percentage code: shows label, discount and new total (server prices)', async () => {
  const out = await post(check, { code: 'AMIGOS', items: ['north', 'rural'] });
  assert.deepEqual(out.body, { valid: true, label: '25% off', discount: 400, total: 1200 });
  assert.equal(asked[0].active, true);
});

test('fixed amount code (newer Stripe shape) works and never exceeds the subtotal', async () => {
  const out = await post(check, { code: 'CINCO', items: ['north'] });
  assert.deepEqual(out.body, { valid: true, label: '€5 off', discount: 500, total: 300 });
});

test('100% code gives a zero total', async () => {
  const out = await post(check, { code: 'GRATIS', items: ['north'] });
  assert.equal(out.body.total, 0);
});

test('unknown, expired or malformed codes are simply invalid', async () => {
  for (const code of ['NOPE', 'OLD', '', 'a b', '<script>', 'x'.repeat(60)]) {
    const out = await post(check, { code, items: ['north'] });
    assert.equal(out.body.valid, false, code);
  }
});

test('the check needs at least one valid itinerary', async () => {
  const out = await post(check, { code: 'AMIGOS', items: ['bogus'] });
  assert.equal(out.status, 400);
});

test('checkout session carries the promotion code to Stripe', async () => {
  const out = await post(create, { items: ['north'], code: 'amigos'.toUpperCase() , consent: { terms: true, digital: true } });
  assert.equal(out.status, 200);
  assert.deepEqual(calls[0].discounts, [{ promotion_code: 'promo_1' }]);
  assert.equal(calls[0].metadata.promo_code, 'AMIGOS');
});

test('an invalid code stops the payment session from being created', async () => {
  const out = await post(create, { items: ['north'], code: 'NOPE' , consent: { terms: true, digital: true } });
  assert.equal(out.status, 400);
  assert.equal(out.body.code, 'invalid_code');
  assert.equal(calls.length, 0);
});

test('no code: no discounts field, nothing else changes', async () => {
  await post(create, { items: ['north'] , consent: { terms: true, digital: true } });
  assert.equal('discounts' in calls[0], false);
});

test('a free (100% off) order counts as paid only when the total is zero', () => {
  assert.equal(isPaid({ payment_status: 'paid' }), true);
  assert.equal(isPaid({ payment_status: 'no_payment_required', mode: 'payment', amount_total: 0 }), true);
  assert.equal(isPaid({ payment_status: 'no_payment_required', mode: 'payment', amount_total: 800 }), false);
  assert.equal(isPaid({ payment_status: 'no_payment_required', mode: 'setup', amount_total: 0 }), false);
  assert.equal(isPaid({ payment_status: 'unpaid' }), false);
});
