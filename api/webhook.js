import Stripe from 'stripe';
import { PRODUCTS } from './_products.js';
import { sendAccessEmail, scheduleReviewEmail } from './_email.js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// Stripe signs the raw request body, so the body must not be parsed.
export const config = { api: { bodyParser: false } };

async function readRawBody(req) {
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
  }
  return Buffer.concat(chunks);
}

// Payment confirmed: create the private link and email it to the customer.
async function fulfill({ email, name, items, sessionId }) {
  if (!email) throw new Error(`No customer email on session ${sessionId}`);
  if (items.length === 0) throw new Error(`No valid items on session ${sessionId}`);

  // The customer gets the itinerary first. If this fails, Stripe retries the webhook.
  await sendAccessEmail({ to: email, name, items, sessionId });
  console.log('Access email sent', { sessionId, items });

  // The review email is a bonus. If it fails it must NOT fail the whole order,
  // otherwise Stripe would retry and the customer's purchase would look broken.
  try {
    await scheduleReviewEmail({ to: email, name, items, sessionId });
    console.log('Review email scheduled', { sessionId });
  } catch (err) {
    console.error('Review email NOT scheduled (order is fine):', err.message);
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).end();
  }

  let event;
  try {
    const rawBody = await readRawBody(req);
    event = stripe.webhooks.constructEvent(
      rawBody,
      req.headers['stripe-signature'],
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error('Webhook signature check failed:', err.message);
    return res.status(400).send('Invalid signature');
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;

    if (session.payment_status === 'paid') {
      const items = (session.metadata?.items || '')
        .split(',')
        .filter((id) => Object.hasOwn(PRODUCTS, id));

      try {
        await fulfill({
          email: session.customer_details?.email,
          name: session.customer_details?.name,
          items,
          sessionId: session.id,
        });
      } catch (err) {
        // A non-200 makes Stripe retry the webhook later.
        console.error('Fulfillment failed:', err.message);
        return res.status(500).send('Fulfillment failed');
      }
    }
  }

  return res.status(200).json({ received: true });
}
