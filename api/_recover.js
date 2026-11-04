import { PRODUCTS } from './_products.js';
import { ACCESS_DAYS } from './_token.js';

// Pure logic for "resend my access link", kept apart from Stripe so it can be tested.
// Takes Stripe Checkout sessions and returns the purchases that still have access.
// The remaining time is counted from the original purchase, so asking again
// never extends the 30 days.
export function findActivePurchases(sessions, email, nowSec = Math.floor(Date.now() / 1000), max = 3) {
  const wanted = String(email || '').trim().toLowerCase();
  const found = [];

  for (const s of sessions) {
    if (s.payment_status !== 'paid') continue;
    if (String(s.customer_details?.email || '').toLowerCase() !== wanted) continue;

    const items = (s.metadata?.items || '').split(',').filter((id) => Object.hasOwn(PRODUCTS, id));
    if (items.length === 0) continue;

    const remainingSec = s.created + ACCESS_DAYS * 86400 - nowSec;
    if (remainingSec <= 0) continue;

    found.push({
      sessionId: s.id,
      name: s.customer_details?.name,
      items,
      created: s.created,
      remainingDays: remainingSec / 86400,
    });
  }

  return found.sort((a, b) => b.created - a.created).slice(0, max);
}
