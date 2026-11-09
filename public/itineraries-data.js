/* Itinerary catalogue shown in the browser (names, photos, DISPLAY prices).
   The server never trusts these prices: api/_products.js decides what is charged.
   To add a product or another destination: add an entry here and in api/_products.js.
   audience: labels shown on the itinerary page (who it suits). Leave [] until confirmed for that itinerary.
   place / headline / tagline / facts: the header of the itinerary page. headline (short title) falls back to name; tagline and
   facts are only shown when filled in. facts items: { icon: 'clock' | 'pin' | 'car', text: '...' }.
   name: short display title (the destination is already shown on the page). The server keeps its own product names for Stripe.
   category: a key of WWI_CATEGORIES below (the single place where category labels and colours live), used by the cards and the order rows. blurb: one-line description for those cards.
   video: paste a YouTube, Vimeo or .mp4 link to show the promo video; '' shows the placeholder. */
(function (w) {
  /* Category colour system. Brand green is reserved for the Add / Added buttons; these colours only identify itineraries. */
  w.WWI_CATEGORIES = {
    ocean:  { label: 'Ocean & Coast',        color: '#1976D2' },
    rural:  { label: 'Rural & Heritage',     color: '#D65336' },
    nature: { label: 'Nature & Adventure',   color: '#388548' },
    scenic: { label: 'Scenic & Slow Travel', color: '#8954C8' }
  };
  w.WWI_ITEMS = [
    { id: 'north', destination: 'Fuerteventura', name: 'Explore the North', price: 8,
      category: 'ocean',
      blurb: 'A day of dunes, volcanoes, fishing villages and ocean views.',
      cover: 'images/cover-north.jpg', video: 'https://youtube.com/shorts/iV2MGGzLsSI', audience: ['Families', 'Couples', 'Solo travellers'],
      place: 'Fuerteventura · Canary Islands', headline: 'Explore the North',
      tagline: 'A day of dunes, volcanoes, fishing villages and ocean views.',
      facts: [{ icon: 'clock', text: '1 full day' }, { icon: 'pin', text: '5 stops' }, { icon: 'car', text: 'Self-guided' }],
      desc: 'A full day through the north of the island, from golden dunes and volcanic landscapes to coastal viewpoints and a local lunch stop. Every stop comes with timing, parking and a Google Maps link.' },
    { id: 'rural', destination: 'Fuerteventura', name: 'The Rural Heart', price: 8,
      category: 'rural',
      blurb: "Leave the coast behind and drive through the villages, valleys and hills of the island's interior.",
      cover: 'images/cover-rural.jpg', video: '',
      place: 'Fuerteventura · Canary Islands', facts: [{ icon: 'car', text: 'Self-guided' }],
      desc: "Leave the coast behind and drive through the villages, valleys and hills of the island's interior. Expect quiet viewpoints, traditional food and the slower side of Fuerteventura, away from the crowds." },
    { id: 'windmills', destination: 'Fuerteventura', name: 'Windmills', price: 8,
      category: 'scenic',
      blurb: "Follow the traditional windmills that mark the island's landscape and learn the story behind them.",
      cover: 'images/cover-windmills.jpg', video: '',
      place: 'Fuerteventura · Canary Islands', facts: [{ icon: 'car', text: 'Self-guided' }],
      desc: "Follow the traditional windmills that mark the island's landscape and learn the story behind them. A relaxed driving day that mixes photo stops, small villages and local flavours." }
  ];
})(typeof window !== 'undefined' ? window : globalThis);
