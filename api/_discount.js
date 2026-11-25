// Discount codes live in Stripe (Dashboard > Product catalogue > Coupons > "Add promotion code"),
// so there is nothing to redeploy when you add, pause or limit a code. This file only
// looks a code up and works out the amount to SHOW on the checkout page. Stripe itself applies
// the discount and stays the authority on the final price.
import { PRODUCTS } from './_products.js';

export const subtotalOf = (ids) => ids.reduce((sum, id) => sum + PRODUCTS[id].amount, 0);

// Returns { id, coupon } for an active promotion code, or null.
export async function findPromo(stripe, rawCode) {
  const code = String(rawCode ?? '').trim();
  if (!/^[A-Za-z0-9_-]{2,40}$/.test(code)) return null;
  const { data } = await stripe.promotionCodes.list({ code, active: true, limit: 1 });
  const promo = data?.[0];
  if (!promo) return null;
  // Newer Stripe API versions nest the coupon under `promotion`.
  let coupon = promo.coupon ?? promo.promotion?.coupon;
  if (typeof coupon === 'string') coupon = await stripe.coupons.retrieve(coupon);
  if (!coupon || coupon.valid === false) return null;
  return { id: promo.id, coupon };
}

// Amount in cents taken off the subtotal (for display only).
export function discountCents(coupon, subtotal) {
  if (coupon.percent_off) return Math.min(subtotal, Math.round((subtotal * coupon.percent_off) / 100));
  if (coupon.amount_off && (!coupon.currency || coupon.currency === 'eur')) return Math.min(subtotal, coupon.amount_off);
  return 0;
}

export function labelOf(coupon) {
  if (coupon.percent_off) return `${coupon.percent_off}% off`;
  if (coupon.amount_off) return `€${(coupon.amount_off / 100).toFixed(2).replace(/\.00$/, '')} off`;
  return 'Discount';
}

// A 100%-off order has nothing to charge, so Stripe may report it as "no_payment_required"
// instead of "paid". Only a zero-total payment session counts; anything else must be "paid".
export const isPaid = (session) =>
  session.payment_status === 'paid' ||
  (session.payment_status === 'no_payment_required' && session.mode === 'payment' && session.amount_total === 0);
