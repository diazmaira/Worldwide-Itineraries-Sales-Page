/* DEMO / PLACEHOLDER DATA: NOT real customer reviews.
   It exists only to test the layout of the rating in the price box. It is switched off by default and never loads
   for normal visitors: it only turns on on localhost, or in a browser where someone opened
   itinerary.html?item=north&demo=reviews (open ?demo=off to turn it off again). When on, the page labels it "Demo data".
   Real reviews go in itineraries-data.js as reviews: { rating, count } and always win over this file.
   Delete this file (and its <script> tag) when real reviews exist. */
(function (w) {
  /* Owner asked (2026-11-13) for SAMPLE ratings to be visible to everyone until real reviews exist.
     To turn them off for visitors again, set SHOW_SAMPLE_FOR_ALL = false (or delete this file and its script tags). */
  var SHOW_SAMPLE_FOR_ALL = true;
  var on = SHOW_SAMPLE_FOR_ALL;
  try {
    var q = new URLSearchParams(w.location.search).get('demo');
    if (q === 'reviews') w.localStorage.setItem('wwi.demo.reviews', '1');
    if (q === 'off') w.localStorage.removeItem('wwi.demo.reviews');
    on = on || /^(localhost|127\.0\.0\.1)$/.test(w.location.hostname) || w.localStorage.getItem('wwi.demo.reviews') === '1';
    if (q === 'off') on = false;
  } catch (e) { /* storage blocked: stays off */ }
  if (!on) return;
  w.WWI_DEMO_REVIEWS = {
    north: { rating: 4.9, count: 24 },
    rural: { rating: 4.9, count: 24 },
    windmills: { rating: 4.9, count: 24 }
  };
})(window);
