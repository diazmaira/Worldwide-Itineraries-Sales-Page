/* Itinerary catalogue shown in the browser (names, photos, DISPLAY prices).
   The server never trusts these prices: api/_products.js decides what is charged.
   To add a product or another destination: add an entry here and in api/_products.js.
   Itinerary page (every field is optional: what is empty is simply not shown, nothing is invented):
   place / headline / tagline: the header. headline (short title) falls back to name.
   location, duration: the key attributes under the title. The tour type is always "Self-guided".
   distance, stops (number), transport, budget [lines], extra [{label, value}]: the Details section.
   overview: paragraphs for the Overview. route: stop names. includes: what the customer receives ("Your guide includes").
   audience: tags for "Recommended for". Different per itinerary; edit when you know better.
   reviews: { rating: 4.9, count: 24 } from REAL customer reviews only. Leave it out until there are reviews: the rating is then hidden.
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
      location: 'Northern Fuerteventura', duration: '1 full day (6–8 hours)', distance: '≈ 50 km by car', stops: 5, transport: 'Car required',
      budget: ['Car rental, 1 day: €40', 'Fuel for the day: ≈ €20', 'Food and drinks: ≈ €25 per person'],
      extra: [{ label: 'Offline', value: 'Downloadable PDF that works without signal' }],
      route: ['Sand Dunes', 'Corralejo Old Town', 'Calderón Hondo', 'El Cotillo Lagoons & Lighthouse', 'El Cotillo Old Town'],
      includes: ['Your digital itinerary, delivered by email with a private link (valid for 30 days)', 'A selected route with 5 stops and suggested timings', 'Stop locations with Google Maps links and a sketch map', 'What to do at each stop, with local tips', 'A read-aloud option for each stop', 'Practical tips and an estimated budget', 'A PDF you can save for offline use'],
      overview: ['A full day through the north of the island, from golden dunes and volcanic landscapes to coastal viewpoints and a local lunch stop. Every stop comes with timing, parking and a Google Maps link.'] },
    { id: 'rural', destination: 'Fuerteventura', name: 'The Rural Heart', price: 8,
      category: 'rural',
      blurb: "Leave the coast behind and drive through the villages, valleys and hills of the island's interior.",
      cover: 'images/cover-rural.jpg', video: '',
      place: 'Fuerteventura · Canary Islands', audience: ['Culture lovers', 'Couples', 'Slow travellers'],
      location: 'Interior of Fuerteventura', duration: '1 full day', distance: '≈ 60 km by car', stops: 5, transport: 'Car required',
      budget: ['Car rental, 1 day: €40', 'Fuel for the day: ≈ €20', 'Ecomuseo de La Alcogida tickets: €5 per person', 'Food and drinks are not included'],
      extra: [{ label: 'Best days', value: 'Tuesday to Saturday' }, { label: 'Offline', value: 'Downloadable PDF that works without signal' }],
      route: ['Villaverde', 'La Oliva', 'Tefía', 'Ecomuseo de La Alcogida', 'Puertito de los Molinos'],
      includes: ['Your digital itinerary, delivered by email with a private link (valid for 30 days)', 'A selected route with 5 stops and suggested timings', 'Stop locations with Google Maps links and a route map', 'What to see at each stop, with local tips', 'A read-aloud option for each stop', 'Practical tips and an estimated budget', 'A PDF you can save for offline use'],
      overview: ["Leave the coast behind and drive through the villages, valleys and hills of the island's interior. Expect quiet viewpoints, traditional food and the slower side of Fuerteventura, away from the crowds."] },
    { id: 'windmills', destination: 'Fuerteventura', name: 'Spot the Windmills', price: 8,
      category: 'scenic',
      blurb: "Follow the traditional windmills that mark the island's landscape and learn the story behind them.",
      cover: 'images/cover-windmills.jpg', video: '',
      place: 'Fuerteventura · Canary Islands', audience: ['Photography lovers', 'Couples', 'Independent travellers'],
      location: 'Fuerteventura', transport: 'Car required',
      includes: ['Your digital itinerary, delivered by email with a private link (valid for 30 days)'],
      overview: ["Follow the traditional windmills that mark the island's landscape and learn the story behind them. A relaxed driving day that mixes photo stops, small villages and local flavours."] }
  ];
})(typeof window !== 'undefined' ? window : globalThis);
