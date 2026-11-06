// Shows the fixed "Discover Itineraries" bar only after the visitor scrolls past the
// element marked [data-cta-ref] (the hero), and hides it while any [data-hide-cta]
// element is on screen so the same call to action is never shown twice.
(function () {
  var bar = document.querySelector('.cta-bar');
  var ref = document.querySelector('[data-cta-ref]');
  if (!bar || !ref || !('IntersectionObserver' in window)) return;
  var past = false;
  var blockers = new Set();
  function update() { bar.classList.toggle('show', past && blockers.size === 0); }
  new IntersectionObserver(function (entries) {
    entries.forEach(function (e) { past = !e.isIntersecting && e.boundingClientRect.bottom <= 0; });
    update();
  }).observe(ref);
  var hide = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) { if (e.isIntersecting) blockers.add(e.target); else blockers.delete(e.target); });
    update();
  });
  document.querySelectorAll('[data-hide-cta]').forEach(function (el) { hide.observe(el); });
})();
