/* Itinerary catalogue shown in the browser (names, photos, DISPLAY prices).
   The server never trusts these prices: api/_products.js decides what is charged.
   To add a product or another destination: add an entry here and in api/_products.js.
   Itinerary page (every field is optional: what is empty is simply not shown, nothing is invented):
   place / headline / tagline: the header. headline (short title) falls back to name.
   location, duration: the key attributes under the title. The tour type is always "Self-guided".
   distance, stops (number), transport, budget { label, amount, unit, breakdown [lines], note, total }, extra [{label, value}]: the Details section.
   overview: paragraphs for the Overview. route: tags for "On the route" (strings or { label, icon: 'dunes' | 'volcano' | 'boat' | 'sun' | 'drop' }). includes: what the customer receives ("Your guide includes").
   theme: { label, color, sand }: the visual identity of the itinerary page (category label, accents, icons, route tags). Independent per itinerary.
   gallery: { folder, count }: photos shown under the title as img1.jpg ... imgN.jpg inside that folder (missing files are skipped; none = no gallery).
   beforeYouGo: [lines] shown in "Before you go" (taken from the guide's own packing/prep list).
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
      cover: 'images/cover-north.jpg', video: 'https://youtube.com/shorts/iV2MGGzLsSI', audience: ['Hiking lovers', 'Nature lovers', 'Families', 'Couples', 'Adventure seekers'],
      place: 'Fuerteventura · Canary Islands', headline: 'Explore the North',
      tagline: 'A day of dunes, volcanoes, fishing villages and ocean views.',
      theme: { label: 'Coast & Volcano', color: '#269F9D', sand: '#E7D9BF' },
      gallery: { folder: 'images/itineraries/fuerteventura/explore-the-north/', count: 10 },
      location: 'Fuerteventura North', duration: '6 hours', distance: '≈ 50 km by car', stops: 5, transport: 'Car required',
      budget: { label: 'Estimated transport budget', amount: '€60', unit: 'For 2 people · 1 day', breakdown: ['Car rental (1 day): approximately €40', 'Fuel for the day: approximately €20', 'Food and drinks: approximately €25 per person, optional, at one of our recommended places'], note: 'The estimated €60 transport budget covers car rental and fuel for two people. Food and drinks are not included.', total: 'Estimated total including food for two people: approximately €110.' },
      extra: [{ label: 'Offline', value: 'Downloadable PDF that works without signal' }],
      route: [{ label: 'Sand Dunes', icon: 'dunes' }, { label: 'Volcano', icon: 'volcano' }, { label: 'Fishing Village', icon: 'boat' }, { label: 'Sunset', icon: 'sun' }, { label: 'Natural Pools', icon: 'drop' }],
      includes: ['Your digital self-guided itinerary, delivered by email with a private link (valid for 30 days)', 'A selected route with 5 stops and suggested timings', 'Stop locations with Google Maps links and a sketch map', 'What to do at each stop, with local tips', 'A read-aloud option for each stop', 'Practical tips and an estimated budget', 'A PDF you can save for offline use'],
      beforeYouGo: ['Download Google Maps for offline use', 'Bring enough drinking water', 'Wear comfortable walking shoes', 'Bring swimwear and a towel', 'Bring a camera and spare batteries', 'Respect nature and stay on the marked paths'],
      overview: ['A full day through the north of the island, from golden dunes and volcanic landscapes to coastal viewpoints and a local lunch stop. Every stop comes with timing, parking and a Google Maps link.'] },
    { id: 'rural', destination: 'Fuerteventura', name: 'The Rural Heart', price: 8,
      category: 'rural',
      blurb: "Leave the coast behind and drive through the villages, valleys and hills of the island's interior.",
      cover: 'images/cover-rural.jpg', video: '',
      place: 'Fuerteventura · Canary Islands', theme: { label: 'Rural & Heritage', color: '#C2613F', sand: '#EAD7C0' }, audience: ['Culture lovers', 'Couples', 'Slow travellers'],
      location: 'Interior of Fuerteventura', duration: '1 full day', distance: '≈ 60 km by car', stops: 5, transport: 'Car required',
      budget: { label: 'Estimated budget', amount: '€70', unit: 'For 2 people · 1 day', breakdown: ['Car rental (1 day): approximately €40', 'Fuel for the day: approximately €20', 'Ecomuseo de La Alcogida tickets: €5 per person (€10)'], note: 'The estimated €70 covers car rental, fuel and tickets for two people. Food and drinks are not included.' },
      extra: [{ label: 'Best days', value: 'Tuesday to Saturday' }, { label: 'Offline', value: 'Downloadable PDF that works without signal' }],
      route: ['Villaverde', 'La Oliva', 'Tefía', 'Ecomuseo de La Alcogida', 'Puertito de los Molinos'],
      includes: ['Your digital itinerary, delivered by email with a private link (valid for 30 days)', 'A selected route with 5 stops and suggested timings', 'Stop locations with Google Maps links and a route map', 'What to see at each stop, with local tips', 'A read-aloud option for each stop', 'Practical tips and an estimated budget', 'A PDF you can save for offline use'],
      beforeYouGo: ['Water and snacks', 'Sun hat and sunscreen', 'A light jacket for the wind', 'Cash for small shops', 'Phone charger for the car', 'Walking shoes for the cliffs'],
      overview: ["Leave the coast behind and drive through the villages, valleys and hills of the island's interior. Expect quiet viewpoints, traditional food and the slower side of Fuerteventura, away from the crowds."] },
    { id: 'windmills', destination: 'Fuerteventura', name: 'Spot the Windmills', price: 8,
      category: 'scenic',
      blurb: "Follow the traditional windmills that mark the island's landscape and learn the story behind them.",
      cover: 'images/cover-windmills.jpg', video: '',
      place: 'Fuerteventura · Canary Islands', theme: { label: 'Scenic & Slow Travel', color: '#C9962B', sand: '#EBDDB8' }, audience: ['Photography lovers', 'Couples', 'Independent travellers'],
      location: 'Fuerteventura', transport: 'Car required',
      includes: ['Your digital itinerary, delivered by email with a private link (valid for 30 days)'],
      overview: ["Follow the traditional windmills that mark the island's landscape and learn the story behind them. A relaxed driving day that mixes photo stops, small villages and local flavours."] }
  ];
})(typeof window !== 'undefined' ? window : globalThis);
