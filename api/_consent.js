// Legal consent collected on checkout.html before payment.
//
// Two separate confirmations are required (EU Directive 2011/83, art. 16(m); Spanish TRLGDCU art. 103.m):
//   terms   - the customer accepts the Terms & Conditions and acknowledges the Privacy Policy.
//   digital - the customer expressly consents to immediate delivery of the digital itinerary and
//             acknowledges losing the 14-day withdrawal right once delivery begins.
// Ticking the boxes is only part of it: the confirmation email (durable medium) repeats the
// consent and the acknowledgement. The record is kept in Stripe on the Checkout Session
// (and its PaymentIntent) metadata, so it is tied to the Session ID.

// Keep in sync with "Last updated" in public/legal/terms.md and privacy.md (a test checks it).
export const TERMS_VERSION = '2026-11-05';
export const PRIVACY_VERSION = '2026-11-05';

export const CONSENT_TERMS_TEXT = 'I agree to the Terms & Conditions and acknowledge the Privacy Policy.';
export const CONSENT_DIGITAL_TEXT = 'I expressly consent to immediate delivery of my digital itinerary and acknowledge that I will lose my 14-day right of withdrawal once delivery begins.';

// Both flags must be literally true. Anything else is a missing consent.
export function hasConsent(consent) {
  return consent?.terms === true && consent?.digital === true;
}

export function consentMetadata(now = new Date()) {
  return {
    consent_terms: 'yes',
    consent_digital: 'yes',
    consent_at: now.toISOString(),
    terms_version: TERMS_VERSION,
    privacy_version: PRIVACY_VERSION,
  };
}

// Reads the record back from a Checkout Session's metadata. Returns null for sessions
// created before consent was collected.
export function readConsent(metadata) {
  if (metadata?.consent_terms !== 'yes' || metadata?.consent_digital !== 'yes') return null;
  return {
    at: metadata.consent_at || '',
    termsVersion: metadata.terms_version || '',
    privacyVersion: metadata.privacy_version || '',
  };
}
