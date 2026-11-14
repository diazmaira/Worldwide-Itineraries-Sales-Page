import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { PRODUCTS } from './_products.js';
import { verifyToken, ACCESS_DAYS } from './_token.js';
import { withMediaPaths } from './_media.js';

// The token is in the address, so never let the browser pass it on to other
// sites (for example when someone taps a Google Maps link).
const HEADERS = {
  'Cache-Control': 'private, no-store',
  'X-Robots-Tag': 'noindex, nofollow',
  'Referrer-Policy': 'no-referrer',
  'X-Content-Type-Options': 'nosniff',
};

function send(res, status, html) {
  res.statusCode = status;
  for (const [key, value] of Object.entries(HEADERS)) res.setHeader(key, value);
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.end(html);
}

function shell(title, body) {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex">
<title>${title} | Fuerteventura Itineraries</title>
<style>
body{margin:0;font-family:system-ui,"Segoe UI",sans-serif;line-height:1.6;color:#1F2427;background:#fff}
main{max-width:560px;margin:0 auto;padding:64px 20px}
h1{font-size:2rem;line-height:1.15;margin:0 0 16px}
p{color:#4A5457;font-size:1.1rem;margin:0 0 12px}
a.btn{display:block;margin-top:14px;background:#0A5C66;color:#fff;text-decoration:none;font-weight:600;padding:16px 22px;border-radius:12px}
a.plain{color:#0A5C66}
</style></head><body><main><h1>${title}</h1>${body}</main></body></html>`;
}

const expiredPage = () =>
  shell(
    'This link has expired',
    `<p>Access lasts ${ACCESS_DAYS} days after purchase, and this link has passed that date.</p>
<p><a class="plain" href="/#contact">Contact us</a> with your order details and we will help you.</p>`
  );

const invalidPage = () =>
  shell(
    'This link is not valid',
    `<p>Please open the button in your purchase email again. If it still does not work, <a class="plain" href="/#contact">contact us</a>.</p>`
  );

function hubPage(token, ids) {
  const links = ids
    .map(
      (id) =>
        `<a class="btn" href="/api/view?token=${encodeURIComponent(token)}&i=${id}">${PRODUCTS[id].name}</a>`
    )
    .join('');
  return shell('Your itineraries', `<p>Choose the itinerary you want to open.</p>${links}`);
}

export default async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.setHeader('Allow', 'GET, HEAD');
    return send(res, 405, shell('Not allowed', '<p>This page can only be opened from your email.</p>'));
  }

  const url = new URL(req.url, 'http://localhost');
  const token = url.searchParams.get('token');
  const wanted = url.searchParams.get('i');

  let result;
  try {
    result = verifyToken(token);
  } catch (err) {
    console.error('Token check failed:', err.message);
    return send(res, 500, shell('Something went wrong', '<p>Please try again in a moment.</p>'));
  }

  if (!result.ok) {
    return result.reason === 'expired' ? send(res, 410, expiredPage()) : send(res, 403, invalidPage());
  }

  // Only ids that exist in the product list can ever reach the file system.
  const allowed = result.items.filter((id) => Object.hasOwn(PRODUCTS, id));
  if (allowed.length === 0) return send(res, 403, invalidPage());

  let id;
  if (wanted) {
    if (!allowed.includes(wanted)) {
      return send(res, 403, shell('Not part of your order', '<p>That itinerary is not included in this purchase.</p>'));
    }
    id = wanted;
  } else if (allowed.length === 1) {
    id = allowed[0];
  } else {
    return send(res, 200, hubPage(token, allowed));
  }

  try {
    const file = path.join(process.cwd(), 'content', `${id}.html`);
    const html = await readFile(file, 'utf8');
    return send(res, 200, withMediaPaths(html, id));
  } catch (err) {
    console.error('Could not read itinerary file:', id, err.message);
    return send(res, 500, shell('Something went wrong', '<p>We could not load this itinerary. Please contact us.</p>'));
  }
}
