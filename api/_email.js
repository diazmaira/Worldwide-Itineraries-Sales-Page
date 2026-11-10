import { PRODUCTS } from './_products.js';
import { createToken, ACCESS_DAYS } from './_token.js';
import { CONSENT_TERMS_TEXT, CONSENT_DIGITAL_TEXT } from './_consent.js';

const escapeHtml = (s) =>
  String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

// "A", "A and B", "A, B and C"
export function joinNames(names) {
  if (names.length <= 1) return names.join('');
  return names.slice(0, -1).join(', ') + ' and ' + names[names.length - 1];
}

// Stripe gives the full name typed at checkout. We greet with the first word.
export function firstName(full) {
  const first = String(full || '').trim().split(/\s+/)[0];
  if (!first) return 'there';
  return first.charAt(0).toUpperCase() + first.slice(1);
}

const BODY = "font-family:Helvetica,Arial,sans-serif;font-size:16px;line-height:1.7;color:#3C5E61;";

// Shared frame: turquoise band, body, drawing, coral band.
// The drawing is a PNG hosted on your site (public/email/), because Gmail and
// Outlook do not show inline SVG.
function frame({ title, bodyHtml, artUrl, artAlt }) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(title)}</title>
</head>
<body style="margin:0; padding:0; background-color:#F6EBD9;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#F6EBD9" style="background-color:#F6EBD9;">
  <tr>
    <td align="center" style="padding:32px 12px;">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:100%; max-width:600px; background-color:#FFFBF4; border-radius:14px; overflow:hidden;">
        <tr>
          <td height="10" bgcolor="#2BB5B0" style="background-color:#2BB5B0; font-size:0; line-height:0;">&nbsp;</td>
        </tr>
        <tr>
          <td style="padding:40px 44px 12px 44px; font-family:Georgia,'Times New Roman',serif; color:#1F4E52;">
${bodyHtml}
          </td>
        </tr>
        <tr>
          <td align="center" bgcolor="#F7D3A6" style="padding:0; background-color:#F7D3A6; font-size:0; line-height:0;">
            <img src="${artUrl}" width="600" alt="${escapeHtml(artAlt)}" style="display:block; width:100%; max-width:600px; height:auto; border:0;">
          </td>
        </tr>
        <tr>
          <td height="10" bgcolor="#E8734A" style="background-color:#E8734A; font-size:0; line-height:0;">&nbsp;</td>
        </tr>
      </table>
    </td>
  </tr>
</table>
</body>
</html>`;
}

const tip = (strong, text, last = false) => `
              <tr>
                <td width="26" valign="top" style="padding:0 0 ${last ? 0 : 12}px 0; ${BODY} color:#E8734A;">&#9679;</td>
                <td valign="top" style="padding:0 0 ${last ? 0 : 12}px 0; ${BODY}">
                  <strong style="color:#1F4E52;">${strong}</strong> ${text}
                </td>
              </tr>`;

// ---------------------------------------------------------------- welcome email
export function buildWelcomeEmail({ name, itineraryNames, link, siteUrl, contactEmail, days = ACCESS_DAYS, consent = null, sessionId = '' }) {
  const subject = 'Your Fuerteventura itinerary is here';
  const who = escapeHtml(firstName(name));
  const list = escapeHtml(joinNames(itineraryNames));
  const plural = itineraryNames.length > 1;

  const contactLine = contactEmail
    ? `just reply directly to this email or message us at <a href="mailto:${escapeHtml(contactEmail)}" style="color:#E8734A; text-decoration:underline;">${escapeHtml(contactEmail)}</a>.`
    : `<a href="${siteUrl}/#contact" style="color:#E8734A; text-decoration:underline;">send us a message</a> from our website.`;

  // Confirmation of the consent given at checkout (durable medium, as the consumer rules require).
  const when = consent?.at ? new Date(consent.at).toUTCString().replace(' GMT', ' UTC') : '';
  const consentLines = consent ? [
    `${CONSENT_TERMS_TEXT} (Terms version ${consent.termsVersion}, Privacy Policy version ${consent.privacyVersion})`,
    CONSENT_DIGITAL_TEXT,
  ] : [];
  const consentRef = consent ? [when && `Recorded: ${when}`, sessionId && `Order reference: ${sessionId}`].filter(Boolean).join(' · ') : '';
  const consentHtml = consent ? `
            <p style="margin:0 0 8px 0; font-size:16px; line-height:1.3; color:#1F4E52;">
              Your confirmation at checkout
            </p>
            <ul style="margin:0 0 8px 0; padding-left:20px; font-family:Helvetica,Arial,sans-serif; font-size:14px; line-height:1.6; color:#3C5E61;">
              ${consentLines.map((l) => `<li>${escapeHtml(l)}</li>`).join('\n              ')}
            </ul>
            <p style="margin:0 0 22px 0; font-family:Helvetica,Arial,sans-serif; font-size:13px; line-height:1.5; color:#5C7A7D;">
              ${escapeHtml(consentRef)}<br>
              <a href="${siteUrl}/terms.html" style="color:#E8734A;">Terms &amp; Conditions</a> · <a href="${siteUrl}/privacy.html" style="color:#E8734A;">Privacy Policy</a>
            </p>` : '';

  const bodyHtml = `
            <p style="margin:0 0 22px 0; font-size:22px; line-height:1.3; color:#1F4E52;">
              Hi ${who},
            </p>

            <p style="margin:0 0 18px 0; ${BODY}">
              Thank you so much for your order!
            </p>

            <p style="margin:0 0 26px 0; ${BODY}">
              Your self-guided ${plural ? 'itineraries are' : 'itinerary is'} ready: <strong style="color:#1F4E52;">${list}</strong>. Tap the button to open ${plural ? 'them' : 'it'} on your phone.
            </p>

            <table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center" style="margin:0 auto 30px auto;">
              <tr>
                <td align="center" bgcolor="#E8734A" style="background-color:#E8734A; border-radius:30px;">
                  <a href="${link}" target="_blank" style="display:inline-block; padding:14px 34px; font-family:Helvetica,Arial,sans-serif; font-size:16px; font-weight:bold; color:#FFFFFF; text-decoration:none; letter-spacing:0.3px;">
                    Open your ${plural ? 'itineraries' : 'itinerary'}
                  </a>
                </td>
              </tr>
            </table>

            <p style="margin:0 0 12px 0; font-size:18px; line-height:1.3; color:#1F4E52;">
              A few quick tips before you set off
            </p>

            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 26px 0;">${tip(
              'Open it before you set off:',
              'Load your itinerary while you have a good connection. In Google Maps you can also save the area for offline use, so navigation keeps working if mobile signal drops in remote areas.'
            )}${tip(
              'Use the direct links:',
              'Tap the Google Maps buttons inside your itinerary to navigate straight to the exact parking spots and viewpoints.'
            )}${tip(
              'Go at your own pace:',
              'There is no fixed schedule—stop where you feel inspired, take in the views, and enjoy the local spots.',
              true
            )}
            </table>

            ${consentHtml}

            <p style="margin:0 0 18px 0; ${BODY}">
              Your link is personal and stays active for ${days} days, so please don&rsquo;t share it. Keep this email so you can come back to it on the day.
            </p>

            <p style="margin:0 0 18px 0; ${BODY}">
              If you run into any questions before or during your trip, ${contactLine}
            </p>

            <p style="margin:0 0 6px 0; ${BODY}">
              Have an incredible time exploring Fuerteventura!
            </p>

            <p style="margin:18px 0 28px 0; font-family:Helvetica,Arial,sans-serif; font-size:15px; line-height:1.6; color:#3C5E61;">
              Warm regards,<br>
              <strong style="color:#1F4E52;">The Worldwide Itineraries Team</strong>
            </p>`;

  const html = frame({
    title: subject,
    bodyHtml,
    artUrl: `${siteUrl}/email/welcome-art.png`,
    artAlt: 'Sand dunes and cactus with the ocean on one side',
  });

  const text = [
    `Hi ${firstName(name)},`,
    '',
    'Thank you so much for your order!',
    `Your self-guided ${plural ? 'itineraries are' : 'itinerary is'} ready: ${joinNames(itineraryNames)}.`,
    '',
    `Open your ${plural ? 'itineraries' : 'itinerary'}: ${link}`,
    '',
    'A few quick tips before you set off:',
    '- Open it before you set off. Load your itinerary while you have a good connection, and save the area for offline use in Google Maps.',
    '- Use the direct links. Tap the Google Maps buttons to navigate to the exact parking spots and viewpoints.',
    '- Go at your own pace. There is no fixed schedule.',
    '',
    ...(consent ? ['Your confirmation at checkout:', ...consentLines.map((l) => `- ${l}`), consentRef, `Terms: ${siteUrl}/terms.html  Privacy: ${siteUrl}/privacy.html`, ''] : []),
    `Your link is personal and stays active for ${days} days, so please don't share it.`,
    contactEmail ? `Questions? Reply to this email or write to ${contactEmail}.` : `Questions? ${siteUrl}/#contact`,
    '',
    'Warm regards,',
    'The Worldwide Itineraries Team',
  ].join('\n');

  return { subject, html, text };
}

// ----------------------------------------------------------------- review email
export function buildReviewEmail({ name, itineraryNames, reviewUrl, siteUrl }) {
  const subject = 'How was your Fuerteventura itinerary?';
  const who = escapeHtml(firstName(name));
  const list = escapeHtml(joinNames(itineraryNames));

  const bodyHtml = `
            <p style="margin:0 0 22px 0; font-size:22px; line-height:1.3; color:#1F4E52;">
              Hi ${who},
            </p>

            <p style="margin:0 0 18px 0; ${BODY}">
              We hope you had an amazing time exploring Fuerteventura with your <strong style="color:#1F4E52;">${list}</strong>!
            </p>

            <p style="margin:0 0 30px 0; ${BODY}">
              We&rsquo;d love to hear about your experience. Your feedback helps other travellers discover our itineraries and supports our small business.
            </p>

            <table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center" style="margin:0 auto 32px auto;">
              <tr>
                <td align="center" bgcolor="#E8734A" style="background-color:#E8734A; border-radius:30px;">
                  <a href="${reviewUrl}" target="_blank" style="display:inline-block; padding:14px 34px; font-family:Helvetica,Arial,sans-serif; font-size:16px; font-weight:bold; color:#FFFFFF; text-decoration:none; letter-spacing:0.3px;">
                    &#9733; Leave a Review
                  </a>
                </td>
              </tr>
            </table>

            <p style="margin:0 0 6px 0; ${BODY}">
              Thank you for being part of our journey!
            </p>

            <p style="margin:18px 0 28px 0; font-family:Helvetica,Arial,sans-serif; font-size:15px; line-height:1.6; color:#3C5E61;">
              Warm regards,<br>
              <strong style="color:#1F4E52;">The Worldwide Itineraries Team</strong>
            </p>`;

  const html = frame({
    title: subject,
    bodyHtml,
    artUrl: `${siteUrl}/email/review-art.png`,
    artAlt: 'Palm tree and cactus at sunset',
  });

  const text = [
    `Hi ${firstName(name)},`,
    '',
    `We hope you had an amazing time exploring Fuerteventura with your ${joinNames(itineraryNames)}!`,
    "We'd love to hear about your experience. Your feedback helps other travellers discover our itineraries and supports our small business.",
    '',
    `Leave a review: ${reviewUrl}`,
    '',
    'Thank you for being part of our journey!',
    '',
    'Warm regards,',
    'The Worldwide Itineraries Team',
  ].join('\n');

  return { subject, html, text };
}

// ------------------------------------------------------------------- sending
function settings() {
  const { RESEND_API_KEY, EMAIL_FROM, REPLY_TO } = process.env;
  const siteUrl = (process.env.SITE_URL || '').replace(/\/$/, '');
  if (!RESEND_API_KEY || !EMAIL_FROM) throw new Error('RESEND_API_KEY or EMAIL_FROM is missing');
  if (!siteUrl) throw new Error('SITE_URL is missing');
  return { RESEND_API_KEY, EMAIL_FROM, REPLY_TO, siteUrl };
}

async function postToResend({ apiKey, body, idempotencyKey }) {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      // If Stripe retries the webhook, the customer should not get a second email.
      'Idempotency-Key': idempotencyKey,
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`Resend error ${res.status}: ${detail}`);
  }
}

const namesOf = (items) => items.map((id) => PRODUCTS[id].name);

export async function sendAccessEmail({ to, name, items, sessionId, consent }) {
  const { RESEND_API_KEY, EMAIL_FROM, REPLY_TO, siteUrl } = settings();

  const token = createToken({ items, sessionId });
  const link = `${siteUrl}/api/view?token=${encodeURIComponent(token)}`;
  const { subject, html, text } = buildWelcomeEmail({
    name,
    itineraryNames: namesOf(items),
    link,
    siteUrl,
    contactEmail: REPLY_TO,
    consent,
    sessionId,
  });

  const body = { from: EMAIL_FROM, to: [to], subject, html, text };
  if (REPLY_TO) body.reply_to = REPLY_TO;
  await postToResend({ apiKey: RESEND_API_KEY, body, idempotencyKey: `access-${sessionId}` });
}

// Resend sends it later by itself: nothing needs to keep running on your side.
export async function scheduleReviewEmail({ to, name, items, sessionId }) {
  const { RESEND_API_KEY, EMAIL_FROM, REPLY_TO, siteUrl } = settings();

  const reviewUrl = process.env.REVIEW_URL;
  if (!reviewUrl) throw new Error('REVIEW_URL is missing');

  const days = Number(process.env.REVIEW_DELAY_DAYS || 7);
  const sendAt = new Date(Date.now() + days * 86400 * 1000).toISOString();

  const { subject, html, text } = buildReviewEmail({
    name,
    itineraryNames: namesOf(items),
    reviewUrl,
    siteUrl,
  });

  const body = { from: EMAIL_FROM, to: [to], subject, html, text, scheduled_at: sendAt };
  if (REPLY_TO) body.reply_to = REPLY_TO;
  await postToResend({ apiKey: RESEND_API_KEY, body, idempotencyKey: `review-${sessionId}` });
  return sendAt;
}
