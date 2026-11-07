// Promo video per itinerary. Each slot is <div class="video" data-video="URL">.
// Empty data-video  -> the slot is removed, nothing shows.
// YouTube / Vimeo   -> poster image + play button; the player (and any cookies from
//                      the video site) loads only after the visitor clicks play.
// .mp4 file         -> plain HTML5 video, loaded only when played.
(function () {
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]; }); }
  function embedUrl(u) {
    var m;
    if ((m = u.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{11})/))) return 'https://www.youtube-nocookie.com/embed/' + m[1] + '?autoplay=1&rel=0';
    if ((m = u.match(/vimeo\.com\/(?:video\/)?(\d+)/))) return 'https://player.vimeo.com/video/' + m[1] + '?autoplay=1&dnt=1';
    return null;
  }
  document.querySelectorAll('.video').forEach(function (el) {
    var url = (el.getAttribute('data-video') || '').trim();
    if (!url) { el.remove(); return; }
    var title = el.getAttribute('data-title') || 'Itinerary video';
    var poster = el.getAttribute('data-poster') || '';
    if (/\.mp4(\?|$)/i.test(url)) {
      el.innerHTML = '<video controls playsinline preload="none"' + (poster ? ' poster="' + esc(poster) + '"' : '') + ' src="' + esc(url) + '" aria-label="' + esc(title) + '"></video>';
      return;
    }
    var src = embedUrl(url);
    if (!src) { el.remove(); return; }
    el.innerHTML = '<button type="button" class="play" aria-label="Play video: ' + esc(title) + '">' +
      (poster ? '<img src="' + esc(poster) + '" alt="" loading="lazy" onerror="this.remove()">' : '') +
      '<span class="play-icon" aria-hidden="true"></span></button>';
    el.querySelector('.play').addEventListener('click', function () {
      el.innerHTML = '<iframe src="' + esc(src) + '" title="' + esc(title) + '" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen></iframe>';
    });
  });
})();
