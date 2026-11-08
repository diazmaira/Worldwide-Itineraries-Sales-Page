// Stand-in for the "stripe" package, used only by the tests.
// Tests control it through globalThis.__stripe.
export default class Stripe {
  constructor() {
    this.webhooks = {
      constructEvent: (raw, signature, secret) => {
        // Real Stripe also fails when the endpoint secret is wrong or missing.
        if (signature !== 'valid-signature' || secret !== 'whsec_fake') throw new Error('No signatures found matching the expected signature');
        return JSON.parse(Buffer.from(raw).toString('utf8'));
      },
    };
    this.checkout = {
      sessions: {
        create: async (params) => globalThis.__stripe.create(params),
        retrieve: async (id) => globalThis.__stripe.retrieve(id),
      },
    };
  }
}
