// Run with: npm test
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';

const pages = { terms: 'terms.html', privacy: 'privacy.html', 'legal-notice': 'legal-notice.html' };

for (const [doc, page] of Object.entries(pages)) {
  test(`${doc}: page and text file exist and match`, () => {
    assert.ok(existsSync(`public/${page}`), `${page} is missing`);
    assert.ok(existsSync(`public/legal/${doc}.md`), `legal/${doc}.md is missing`);
    assert.match(readFileSync(`public/${page}`, 'utf8'), new RegExp(`data-doc="${doc}"`));
    const text = readFileSync(`public/legal/${doc}.md`, 'utf8');
    assert.match(text, /^# .+/m, 'needs a "# Title" line');
    assert.ok(text.length > 500, 'text looks empty');
  });
}

test('legal text is never injected as HTML', () => {
  const js = readFileSync('public/legal-page.js', 'utf8');
  assert.ok(!/innerHTML|insertAdjacentHTML|document\.write/.test(js));
});

test('site links to the three legal pages', () => {
  const home = readFileSync('public/index.html', 'utf8');
  const checkout = readFileSync('public/checkout.html', 'utf8');
  for (const page of Object.values(pages)) assert.ok(home.includes(page), `index -> ${page}`);
  assert.ok(checkout.includes('terms.html') && checkout.includes('privacy.html'));
});

test('checkout: both consent boxes start unchecked, sit above Pay, and Pay starts disabled', () => {
  const html = readFileSync('public/checkout.html', 'utf8');
  assert.ok(!/<input[^>]*(consent-terms|consent-digital)[^>]*checked/.test(html));
  assert.ok(html.indexOf('consent-terms') < html.indexOf('id="pay"') && html.indexOf('consent-digital') < html.indexOf('id="pay"'));
  assert.match(html, /<button[^>]*id="pay"[^>]*disabled/);
  assert.match(html, /href="terms\.html" target="_blank" rel="noopener"/);
  assert.match(html, /href="privacy\.html" target="_blank" rel="noopener"/);
  assert.match(html, /consent: \{ terms: cTerms\.checked, digital: cDigital\.checked \}/);
});
