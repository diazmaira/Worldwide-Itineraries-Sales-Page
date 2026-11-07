import Stripe from 'stripe';
import { makeLimiter, clientIp } from './_mail.js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const allow = makeLimiter({ max: 60, windowMs: 60 * 60 * 1000 });

// Read-only: tells the success page whether Stripe says this checkout session is paid,
// so the browser only clears the saved itinerary selection after confirmed payment.
// It returns nothing but { paid: true|false }.
export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }
  if (!allow(clientIp(req))) return res.status(429).json({ error: 'Too many requests' });

  res.setHeader('Cache-Control', 'no-store');
  const id = String(req.query?.session_id ?? '');
  if (!/^cs_(test|live)_[A-Za-z0-9]{8,250}$/.test(id)) {
    return res.status(400).json({ paid: false });
  }
  try {
    const session = await stripe.checkout.sessions.retrieve(id);
    return res.status(200).json({ paid: session.payment_status === 'paid' });
  } catch (err) {
    console.error('session-status failed:', err.message);
    return res.status(200).json({ paid: false });
  }
}
