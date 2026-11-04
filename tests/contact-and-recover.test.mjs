// Run with: node --test tests/
import test from 'node:test';
import assert from 'node:assert/strict';

process.env.RESEND_API_KEY = 're_test';
process.env.EMAIL_FROM = 'Shop <shop@example.com>';
process.env.REPLY_TO = 'reply@example.com';
process.env.SITE_URL = 'https://shop.example.com';
process.env.TOKEN_SECRET = 'x'.repeat(40);

const { default: contact } = await import('../api/contact.js');
const { findActivePurchases } = await import('../api/_recover.js');
const { verifyToken, createToken } = await import('../api/_token.js');

function call(handler, { method = 'POST', body = {}, ip = '1.1.1.1' } = {}) {
  const out = { headers: {} };
  const res = {
    setHeader: (k, v) => (out.headers[k] = v),
    status(c) { out.status = c; return this; },
    json(o) { out.body = o; return this; },
  };
  return handler({ method, body, headers: { 'x-forwarded-for': ip }, socket: {} }, res).then(() => out);
}
function stubFetch() {
  const sent = [];
  globalThis.fetch = async (url, opts) => { sent.push({ url, opts, body: JSON.parse(opts.body) }); return { ok: true, text: async () => '' }; };
  return sent;
}
const good = { name: 'Ana', email: 'ana@example.com', orderId: '', topic: "I didn't receive my email", message: 'Please help me' };

test('contact: GET is rejected', async () => {
  assert.equal((await call(contact, { method: 'GET' })).status, 405);
});
test('contact: sends to CONTACT_TO, reply goes to the visitor', async () => {
  process.env.CONTACT_TO = 'owner@example.com';
  const sent = stubFetch();
  const r = await call(contact, { body: good, ip: '2.2.2.2' });
  assert.equal(r.status, 200);
  assert.deepEqual(sent[0].body.to, ['owner@example.com']);
  assert.equal(sent[0].body.reply_to, 'ana@example.com');
  assert.match(sent[0].body.subject, /^\[Contact\]/);
});
test('contact: CONTACT_TO can be changed, falls back to REPLY_TO', async () => {
  delete process.env.CONTACT_TO;
  const sent = stubFetch();
  await call(contact, { body: good, ip: '3.3.3.3' });
  assert.deepEqual(sent[0].body.to, ['reply@example.com']);
});
test('contact: missing fields and bad email are rejected without sending', async () => {
  const sent = stubFetch();
  assert.equal((await call(contact, { body: { ...good, email: 'nope' }, ip: '4.4.4.4' })).status, 400);
  assert.equal((await call(contact, { body: { ...good, message: '' }, ip: '4.4.4.4' })).status, 400);
  assert.equal(sent.length, 0);
});
test('contact: trap field is answered OK but nothing is sent', async () => {
  const sent = stubFetch();
  assert.equal((await call(contact, { body: { ...good, website: 'spam.com' }, ip: '5.5.5.5' })).status, 200);
  assert.equal(sent.length, 0);
});
test('contact: HTML is escaped and newlines cannot break the subject', async () => {
  const sent = stubFetch();
  await call(contact, { body: { ...good, name: 'A\r\nBcc: x@y.z', message: '<script>alert(1)</script>' }, ip: '6.6.6.6' });
  assert.ok(!/[\r\n]/.test(sent[0].body.subject));
  assert.ok(!sent[0].body.html.includes('<script>'));
});
test('contact: rate limit after 5 messages from one visitor', async () => {
  stubFetch();
  let last;
  for (let i = 0; i < 6; i++) last = await call(contact, { body: good, ip: '7.7.7.7' });
  assert.equal(last.status, 429);
});
test('contact: Resend failure gives 500', async () => {
  globalThis.fetch = async () => ({ ok: false, status: 422, text: async () => 'bad' });
  assert.equal((await call(contact, { body: good, ip: '8.8.8.8' })).status, 500);
});

const now = 1_800_000_000;
const sess = (o) => ({ id: 'cs_1', payment_status: 'paid', created: now - 86400, metadata: { items: 'north' },
  customer_details: { email: 'Ana@Example.com', name: 'Ana' }, ...o });

test('recover: finds a paid, recent purchase (email case-insensitive)', () => {
  const r = findActivePurchases([sess()], 'ana@example.com', now);
  assert.equal(r.length, 1);
  assert.deepEqual(r[0].items, ['north']);
  assert.ok(Math.abs(r[0].remainingDays - 29) < 0.01);
});
test('recover: other emails, unpaid and expired sessions are ignored', () => {
  assert.equal(findActivePurchases([sess({ customer_details: { email: 'x@y.com' } })], 'ana@example.com', now).length, 0);
  assert.equal(findActivePurchases([sess({ payment_status: 'unpaid' })], 'ana@example.com', now).length, 0);
  assert.equal(findActivePurchases([sess({ created: now - 31 * 86400 })], 'ana@example.com', now).length, 0);
});
test('recover: unknown product ids are dropped', () => {
  assert.equal(findActivePurchases([sess({ metadata: { items: '../etc,foo' } })], 'ana@example.com', now).length, 0);
});
test('recover: keeps the newest 3', () => {
  const many = [1, 2, 3, 4, 5].map((n) => sess({ id: 'cs_' + n, created: now - n * 3600 }));
  const r = findActivePurchases(many, 'ana@example.com', now);
  assert.deepEqual(r.map((p) => p.sessionId), ['cs_1', 'cs_2', 'cs_3']);
});
test('recover: new link expires with the original 30 days, never later', () => {
  const [p] = findActivePurchases([sess({ created: Math.floor(Date.now() / 1000) - 10 * 86400 })], 'ana@example.com');
  const t = verifyToken(createToken({ items: p.items, sessionId: p.sessionId, days: p.remainingDays }));
  assert.equal(t.ok, true);
  const daysLeft = (t.expires - Date.now() / 1000) / 86400;
  assert.ok(daysLeft > 19.9 && daysLeft < 20.1, `daysLeft=${daysLeft}`);
});
