import Stripe from 'stripe';
import { PRODUCTS, CURRENCY } from './_products.js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Keep only known product ids, once each.
    const requested = Array.isArray(req.body?.items) ? req.body.items : [];
    const ids = [...new Set(requested)].filter((id) => Object.hasOwn(PRODUCTS, id));

    if (ids.length === 0) {
      return res.status(400).json({ error: 'No valid items selected' });
    }

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
      metadata: { items: ids.join(',') },
      success_url: `${siteUrl}/success.html?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${siteUrl}/checkout.html`,
    });

    return res.status(200).json({ url: session.url });
  } catch (err) {
    console.error('create-checkout-session failed:', err.message);
    return res.status(500).json({ error: 'Could not create checkout session' });
  }
}
