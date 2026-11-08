/* Itinerary catalogue shown in the browser (names, photos, DISPLAY prices).
   The server never trusts these prices: api/_products.js decides what is charged.
   To add a product or another destination: add an entry here and in api/_products.js.
   audience: labels shown on the itinerary page (who it suits). Leave [] until confirmed for that itinerary.
   place / headline / tagline / facts: the header of the itinerary page. headline (short title) falls back to name; tagline and
   facts are only shown when filled in. facts items: { icon: 'clock' | 'pin' | 'car', text: '...' }.
   video: paste a YouTube, Vimeo or .mp4 link to show the promo video; '' shows the placeholder. */
(function (w) {
  w.WWI_ITEMS = [
    { id: 'north', destination: 'Fuerteventura', name: 'Explore the north of Fuerteventura', price: 8,
      cover: 'images/cover-north.jpg', video: 'https://youtube.com/shorts/iV2MGGzLsSI', audience: ['Families', 'Couples', 'Solo travellers'],
      place: 'Fuerteventura · Canary Islands', headline: 'Explore the North',
      tagline: 'A day of dunes, volcanoes, fishing villages and ocean views.',
      facts: [{ icon: 'clock', text: '1 full day' }, { icon: 'pin', text: '5 stops' }, { icon: 'car', text: 'Self-guided' }],
      desc: 'A full day through the north of the island, from golden dunes and volcanic landscapes to coastal viewpoints and a local lunch stop. Every stop comes with timing, parking and a Google Maps link.' },
    { id: 'rural', destination: 'Fuerteventura', name: 'The rural heart of Fuerteventura', price: 8,
      cover: 'images/cover-rural.jpg', video: '',
      place: 'Fuerteventura · Canary Islands', facts: [{ icon: 'car', text: 'Self-guided' }],
      desc: "Leave the coast behind and drive through the villages, valleys and hills of the island's interior. Expect quiet viewpoints, traditional food and the slower side of Fuerteventura, away from the crowds." },
    { id: 'windmills', destination: 'Fuerteventura', name: 'Fuerteventura windmills', price: 8,
      cover: 'images/cover-windmills.jpg', video: '',
      place: 'Fuerteventura · Canary Islands', facts: [{ icon: 'car', text: 'Self-guided' }],
      desc: "Follow the traditional windmills that mark the island's landscape and learn the story behind them. A relaxed driving day that mixes photo stops, small villages and local flavours." }
  ];
})(typeof window !== 'undefined' ? window : globalThis);
