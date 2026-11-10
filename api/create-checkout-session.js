import Stripe from 'stripe';
import { PRODUCTS, CURRENCY } from './_products.js';
import { hasConsent, consentMetadata } from './_consent.js';
import { makeLimiter, clientIp } from './_mail.js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// Stops scripts from creating thousands of Stripe sessions. A real customer never
// gets near this. It lives only while the function is warm, so it slows abuse down
// but is not a hard guarantee (Vercel Firewall is the stronger option).
const allow = makeLimiter({ max: 15, windowMs: 60 * 60 * 1000 });

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!allow(clientIp(req))) {
    return res.status(429).json({ error: 'Too many requests' });
  }

  try {
    // Keep only known product ids, once each.
    const requested = Array.isArray(req.body?.items) ? req.body.items : [];
    const ids = [...new Set(requested)].filter((id) => Object.hasOwn(PRODUCTS, id));

    if (ids.length === 0) {
      return res.status(400).json({ error: 'No valid items selected' });
    }

    // Both legal confirmations are required before any Stripe session exists.
    if (!hasConsent(req.body?.consent)) {
      return res.status(400).json({ error: 'Consent required', code: 'consent_required' });
    }
    const consent = consentMetadata();

    const siteUrl = (process.env.SITE_URL || `https://${req.headers.host}`).replace(/\/$/, '');

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: ids.map((id) => ({
        quantity: 1,
        price_data: {
          currency: CURRENCY,
          unit_amount: PRODUCTS[id].amount,
          product_data: { name: PRODUCTS[id].name },
        },
      })),
      // The webhook reads this to know which itineraries to deliver.
      // It also carries the consent record (timestamp and policy versions); the Session ID is the record's key.
      metadata: { items: ids.join(','), ...consent },
      payment_intent_data: { metadata: consent },
      success_url: `${siteUrl}/success.html?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${siteUrl}/checkout.html`,
    });

    return res.status(200).json({ url: session.url });
  } catch (err) {
    console.error('create-checkout-session failed:', err.message);
    return res.status(500).json({ error: 'Could not create checkout session' });
  }
}
