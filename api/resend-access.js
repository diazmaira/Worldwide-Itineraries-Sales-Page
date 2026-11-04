import Stripe from 'stripe';
import { PRODUCTS } from './_products.js';
import { createToken, ACCESS_DAYS } from './_token.js';
import { buildWelcomeEmail } from './_email.js';
import { findActivePurchases } from './_recover.js';
import { sendMail, mailSettings, makeLimiter, clientIp } from './_mail.js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

const byIp = makeLimiter({ max: 5, windowMs: 60 * 60 * 1000 });
const byEmail = makeLimiter({ max: 2, windowMs: 60 * 60 * 1000 });
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

// The answer is always the same, whether or not a purchase exists, so nobody
// can use this form to find out who bought. The new link is only ever sent to
// the email address that paid.
const SAME_ANSWER = { ok: true };

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const email = String(req.body?.email ?? '').trim().toLowerCase().slice(0, 200);
  if (!EMAIL_RE.test(email)) {
    return res.status(400).json({ error: 'Please enter a valid email address.' });
  }
  if (!byIp(clientIp(req)) || !byEmail(email)) {
    return res.status(429).json({ error: 'Too many requests. Please try again later.' });
  }

  try {
    const { siteUrl, replyTo } = mailSettings();

    // Only purchases from the last ACCESS_DAYS days can still have access.
    const since = Math.floor(Date.now() / 1000) - ACCESS_DAYS * 86400;
    const sessions = [];
    for await (const s of stripe.checkout.sessions.list({ created: { gte: since }, limit: 100 })) {
      sessions.push(s);
      if (sessions.length >= 1000) break;
    }

    const purchases = findActivePurchases(sessions, email);
    const hour = Math.floor(Date.now() / 3600000);

    for (const p of purchases) {
      const token = createToken({ items: p.items, sessionId: p.sessionId, days: p.remainingDays });
      const link = `${siteUrl}/api/view?token=${encodeURIComponent(token)}`;
      const { subject, html, text } = buildWelcomeEmail({
        name: p.name,
        itineraryNames: p.items.map((id) => PRODUCTS[id].name),
        link,
        siteUrl,
        contactEmail: replyTo,
        days: Math.max(1, Math.ceil(p.remainingDays)),
      });
      await sendMail({
        to: email,
        subject,
        html,
        text,
        replyTo,
        idempotencyKey: `resend-${p.sessionId}-${hour}`,
      });
    }
    console.log('resend-access handled', { found: purchases.length });
    return res.status(200).json(SAME_ANSWER);
  } catch (err) {
    console.error('resend-access failed:', err.message);
    return res.status(500).json({ error: 'Something went wrong. Please try again later.' });
  }
}
