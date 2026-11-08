// Tests the shared "My itineraries" store (public/selection.js) without a browser.
import test, { beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

function load() {
  const data = new Map();
  const localStorage = { getItem: (k) => (data.has(k) ? data.get(k) : null), setItem: (k, v) => data.set(k, String(v)) };
  const window = { localStorage };
  const ctx = vm.createContext({ window, JSON, Array, String });
  vm.runInContext(readFileSync('public/itineraries-data.js', 'utf8'), ctx);
  vm.runInContext(readFileSync('public/selection.js', 'utf8'), ctx);
  return { W: window.WWI, data };
}
const KEY = 'wwi.selection.v1';
let W, data;
beforeEach(() => { ({ W, data } = load()); });

// "Pay securely" = add the current itinerary (if missing) and open checkout.
const pay = (id) => { W.add(id); return Array.from(W.get()); };

test('A: first purchase opens checkout with just that itinerary', () => {
  assert.deepEqual(pay('north'), ['north']);
});
test('B: previous selection is preserved when paying from another page', () => {
  W.add('north');
  assert.deepEqual(pay('rural'), ['north', 'rural']);
});
test('C: paying on an already selected itinerary keeps it once', () => {
  W.add('north');
  assert.deepEqual(pay('north'), ['north']);
  assert.equal(W.add('north'), false);
});
test('D: several selected plus another gives all of them', () => {
  W.add('north'); W.add('rural');
  assert.deepEqual(pay('windmills'), ['north', 'rural', 'windmills']);
});
test('persists in localStorage and survives a reload', () => {
  W.add('rural');
  assert.equal(data.get(KEY), '["rural"]');
  const again = load();           // new page, new store, same storage content
  again.data.set(KEY, data.get(KEY));
  assert.deepEqual(Array.from(again.W.get()), ['rural']);
});
test('remove updates the total; clear empties', () => {
  W.add('north'); W.add('rural'); W.add('windmills');
  assert.equal(W.total(), 24);
  W.remove('rural');
  assert.deepEqual(Array.from(W.get()), ['north', 'windmills']);
  assert.equal(W.total(), 16);
  W.clear();
  assert.deepEqual(Array.from(W.get()), []);
});
test('subscribers hear about every change', () => {
  const seen = [];
  W.subscribe((ids) => seen.push(ids.join(',')));
  W.add('north'); W.add('north'); W.add('rural'); W.remove('north');
  assert.deepEqual(seen, ['north', 'north,rural', 'rural']);
});
test('invalid, duplicate or corrupt stored data is cleaned, never charged', () => {
  data.set(KEY, '["north","north","free","../x",5,null,"rural"]');
  assert.deepEqual(Array.from(W.get()), ['north', 'rural']);
  assert.deepEqual(Array.from(W.sanitize()).sort(), ['../x', 'free']);
  assert.equal(data.get(KEY), '["north","rural"]');
  data.set(KEY, 'not json');
  assert.deepEqual(Array.from(W.get()), []);
  data.set(KEY, '{"a":1}');
  assert.deepEqual(Array.from(W.get()), []);
});
test('unknown ids cannot be added', () => {
  assert.equal(W.add('free'), false);
  assert.deepEqual(Array.from(W.get()), []);
});
