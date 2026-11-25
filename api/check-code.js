import Stripe from 'stripe';
import { PRODUCTS } from './_products.js';
import { makeLimiter, clientIp } from './_mail.js';
import { findPromo, discountCents, labelOf, subtotalOf } from './_discount.js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// Tight limit so codes cannot be guessed by trying many of them.
const allow = makeLimiter({ max: 12, windowMs: 10 * 60 * 1000 });

// Checks a discount code for the checkout page. It returns only what the page needs to show;
// the real discount is applied by Stripe when the payment session is created.
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }
  res.setHeader('Cache-Control', 'no-store');
  if (!allow(clientIp(req))) return res.status(429).json({ error: 'Too many attempts' });

  try {
    const requested = Array.isArray(req.body?.items) ? req.body.items : [];
    const ids = [...new Set(requested)].filter((id) => Object.hasOwn(PRODUCTS, id));
    if (ids.length === 0) return res.status(400).json({ valid: false });

    const promo = await findPromo(stripe, req.body?.code);
    if (!promo) return res.status(200).json({ valid: false });

    const subtotal = subtotalOf(ids);
    const discount = discountCents(promo.coupon, subtotal);
    return res.status(200).json({ valid: true, label: labelOf(promo.coupon), discount, total: subtotal - discount });
  } catch (err) {
    console.error('check-code failed:', err.message);
    return res.status(500).json({ valid: false, error: 'Could not check the code' });
  }
}
