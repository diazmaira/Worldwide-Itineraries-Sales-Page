import { sendMail, escapeHtml, makeLimiter, clientIp } from './_mail.js';

// Messages arrive at CONTACT_TO. To change the address, edit that variable in
// Vercel (Settings > Environment Variables) and redeploy. If CONTACT_TO is not
// set, REPLY_TO is used.

const allow = makeLimiter({ max: 5, windowMs: 10 * 60 * 1000 });
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const oneLine = (s, max) => String(s ?? '').replace(/[\r\n]+/g, ' ').trim().slice(0, max);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const b = req.body && typeof req.body === 'object' ? req.body : {};

  // Hidden trap field: people never fill it, bots often do. Pretend it worked.
  if (b.website) return res.status(200).json({ ok: true });

  if (!allow(clientIp(req))) {
    return res.status(429).json({ error: 'Too many messages. Please try again later.' });
  }

  const name = oneLine(b.name, 100);
  const email = oneLine(b.email, 200);
  const orderId = oneLine(b.orderId, 100);
  const topic = oneLine(b.topic, 120);
  const message = String(b.message ?? '').trim().slice(0, 3000);

  if (!name || !EMAIL_RE.test(email) || !topic || message.length < 5) {
    return res.status(400).json({ error: 'Please fill in all required fields.' });
  }

  const to = process.env.CONTACT_TO || process.env.REPLY_TO;
  if (!to) {
    console.error('contact: CONTACT_TO (or REPLY_TO) is not set');
    return res.status(500).json({ error: 'Contact is not configured' });
  }

  const text = [
    `Name: ${name}`,
    `Email: ${email}`,
    `Order ID: ${orderId || '(not given)'}`,
    `Topic: ${topic}`,
    '',
    message,
  ].join('\n');
  const html = `<p><strong>Name:</strong> ${escapeHtml(name)}<br>
<strong>Email:</strong> ${escapeHtml(email)}<br>
<strong>Order ID:</strong> ${escapeHtml(orderId || '(not given)')}<br>
<strong>Topic:</strong> ${escapeHtml(topic)}</p>
<p style="white-space:pre-wrap">${escapeHtml(message)}</p>`;

  try {
    // Replying to this email answers the customer directly.
    await sendMail({ to, subject: `[Contact] ${topic} - ${name}`, html, text, replyTo: email });
    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('contact failed:', err.message);
    return res.status(500).json({ error: 'Could not send the message' });
  }
}
