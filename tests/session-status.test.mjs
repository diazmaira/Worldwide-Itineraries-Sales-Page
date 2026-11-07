import './helpers/setup.mjs';
import test, { beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { makeRes } from './helpers/setup.mjs';

const { default: handler } = await import('../api/session-status.js');

let asked;
beforeEach(() => { asked = []; globalThis.__stripe = { retrieve: async (id) => { asked.push(id); return { payment_status: 'paid' }; } }; });

let visitor = 0;
async function call(query, method = 'GET') {
  const { res, out } = makeRes();
  await handler({ method, query, headers: { 'x-forwarded-for': `10.1.0.${++visitor}` }, socket: {} }, res);
  return out;
}

test('paid session -> paid true', async () => {
  const out = await call({ session_id: 'cs_test_a1B2c3D4e5' });
  assert.equal(out.status, 200);
  assert.deepEqual(out.body, { paid: true });
  assert.equal(out.headers['Cache-Control'], 'no-store');
});

test('unpaid or pending session -> paid false', async () => {
  for (const status of ['unpaid', 'no_payment_required']) {
    globalThis.__stripe.retrieve = async () => ({ payment_status: status });
    assert.deepEqual((await call({ session_id: 'cs_test_a1B2c3D4e5' })).body, { paid: false });
  }
});

test('unknown session or Stripe error -> paid false, no details leaked', async () => {
  globalThis.__stripe.retrieve = async () => { throw new Error('No such checkout.session'); };
  const out = await call({ session_id: 'cs_test_doesnotexist1' });
  assert.equal(out.status, 200);
  assert.deepEqual(out.body, { paid: false });
});

test('malformed ids never reach Stripe', async () => {
  for (const id of ['', 'abc', 'cs_test_', '../../x', 'cs_test_a b c d e f', undefined]) {
    const out = await call({ session_id: id });
    assert.equal(out.status, 400);
    assert.deepEqual(out.body, { paid: false });
  }
  assert.equal(asked.length, 0);
});

test('only GET is accepted', async () => {
  const out = await call({ session_id: 'cs_test_a1B2c3D4e5' }, 'POST');
  assert.equal(out.status, 405);
  assert.equal(asked.length, 0);
});
