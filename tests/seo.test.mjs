// Run with: npm test
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync, readdirSync } from 'node:fs';

const htmlFiles = readdirSync('public').filter((f) => f.endsWith('.html'));

test('every page has the favicon links, and the icon files exist', () => {
  for (const f of htmlFiles) {
    const s = readFileSync(`public/${f}`, 'utf8');
    assert.match(s, /rel="icon" href="favicon\.svg"/, f);
    assert.match(s, /rel="apple-touch-icon"/, f);
  }
  for (const f of ['favicon.svg', 'favicon.ico', 'apple-touch-icon.png']) assert.ok(existsSync(`public/${f}`), f);
});

test('sitemap lists only real pages that are allowed in search results', () => {
  const xml = readFileSync('public/sitemap.xml', 'utf8');
  const urls = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
  assert.ok(urls.length >= 4);
  for (const u of urls) {
    const path = new URL(u).pathname;
    const file = path === '/' ? 'index.html' : path.slice(1);
    assert.ok(existsSync(`public/${file}`), `${u} has no file`);
    assert.ok(!/noindex/.test(readFileSync(`public/${file}`, 'utf8')), `${u} is noindex`);
  }
});

test('robots.txt points to the sitemap and hides the api and media folders', () => {
  const r = readFileSync('public/robots.txt', 'utf8');
  assert.match(r, /^Sitemap: https:\/\/\S+\/sitemap\.xml$/m);
  assert.match(r, /^Disallow: \/api\/$/m);
  assert.match(r, /^Disallow: \/media\/$/m);
});

test('checkout, success and resend-access stay noindex', () => {
  for (const f of ['checkout.html', 'success.html', 'resend-access.html']) {
    assert.match(readFileSync(`public/${f}`, 'utf8'), /name="robots" content="noindex"/, f);
  }
});

test('home page has share tags and the share image file exists', () => {
  const s = readFileSync('public/index.html', 'utf8');
  assert.match(s, /property="og:image" content="https:\/\/[^"]+\/images\/share\.jpg"/);
  assert.match(s, /name="twitter:card"/);
  assert.ok(existsSync('public/images/share.jpg'));
});

test('the site address in sitemap, robots and share tags is the same everywhere', () => {
  const origin = (s) => [...new Set([...s.matchAll(/https:\/\/[a-z0-9.-]+\.[a-z]+(?=\/)/g)].map((m) => m[0]))];
  const sm = origin(readFileSync('public/sitemap.xml', 'utf8').replace(/http:\/\/www\.sitemaps\.org/g, ''));
  const rb = origin(readFileSync('public/robots.txt', 'utf8'));
  const og = origin(readFileSync('public/index.html', 'utf8').match(/<link rel="canonical"[^>]*>/)[0]);
  assert.deepEqual(sm, rb);
  assert.deepEqual(sm, og);
});
