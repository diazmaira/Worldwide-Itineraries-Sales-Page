/* Shared "My itineraries" selection: one store (localStorage), a header counter and a drawer.
   Load after itineraries-data.js. Pages with a .site-header get the counter and drawer automatically. */
(function (w) {
  var KEY = 'wwi.selection.v1';
  var ITEMS = w.WWI_ITEMS || [];
  var byId = {};
  ITEMS.forEach(function (i) { byId[i.id] = i; });

  var memory = '[]';
  var storage = {
    get: function () { try { return w.localStorage.getItem(KEY); } catch (e) { return memory; } },
    set: function (v) { memory = v; try { w.localStorage.setItem(KEY, v); } catch (e) { /* private mode: memory only */ } }
  };

  function read() {
    var raw;
    try { raw = JSON.parse(storage.get() || '[]'); } catch (e) { raw = []; }
    if (!Array.isArray(raw)) raw = [];
    var ids = [], dropped = [];
    raw.forEach(function (id) {
      if (typeof id !== 'string') return;
      if (!byId[id]) { if (dropped.indexOf(id) < 0) dropped.push(id); return; }
      if (ids.indexOf(id) < 0) ids.push(id);   // no duplicates
    });
    return { ids: ids, dropped: dropped };
  }
  var listeners = [];
  function write(ids) {
    storage.set(JSON.stringify(ids));
    listeners.forEach(function (fn) { fn(ids.slice()); });
  }

  var store = {
    items: ITEMS,
    item: function (id) { return byId[id] || null; },
    get: function () { return read().ids; },
    has: function (id) { return read().ids.indexOf(id) >= 0; },
    add: function (id) {
      if (!byId[id]) return false;
      var ids = read().ids;
      if (ids.indexOf(id) >= 0) return false;
      ids.push(id); write(ids); return true;
    },
    remove: function (id) { write(read().ids.filter(function (x) { return x !== id; })); },
    clear: function () { write([]); },
    /* Rewrites storage without unknown/duplicate ids. Returns the unknown ids that were dropped. */
    sanitize: function () {
      var r = read();
      var changed = r.dropped.length > 0 || storage.get() !== JSON.stringify(r.ids);
      if (changed) write(r.ids);
      return r.dropped;
    },
    total: function (ids) { return (ids || read().ids).reduce(function (s, id) { return s + byId[id].price; }, 0); },
    subscribe: function (fn) { listeners.push(fn); },
    euro: function (n) { return '€' + n; },
    /* Test hook: use another storage object */
    _useStorage: function (s) { storage = s; }
  };
  w.WWI = store;

  if (typeof document === 'undefined') return;

  /* ---------- Subtle confirmation ---------- */
  var toastEl, toastTimer;
  store.toast = function (msg) {
    if (!toastEl) {
      toastEl = document.createElement('div');
      toastEl.className = 'wwi-toast';
      toastEl.setAttribute('role', 'status');
      toastEl.setAttribute('aria-live', 'polite');
      document.body.appendChild(toastEl);
    }
    toastEl.textContent = msg;
    toastEl.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toastEl.classList.remove('show'); }, 2400);
  };

  /* ---------- Header counter + drawer ---------- */
  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }

  function catColor(it) { var c = (w.WWI_CATEGORIES || {})[it && it.category]; return c ? c.color : ''; }

  function init() {
    document.querySelectorAll('[data-item]').forEach(function (n) { var it = byId[n.getAttribute('data-item')]; if (it) n.style.setProperty('--cat', catColor(it)); });
    var header = document.querySelector('.site-header');
    if (!header) return;

    var counter = el('button', 'wwi-count');
    counter.type = 'button';
    counter.setAttribute('aria-haspopup', 'dialog');
    counter.setAttribute('aria-controls', 'wwi-drawer');
    header.appendChild(counter);

    var overlay = el('div', 'wwi-overlay');
    overlay.hidden = true;
    var drawer = el('aside', 'wwi-drawer');
    drawer.id = 'wwi-drawer';
    drawer.setAttribute('role', 'dialog');
    drawer.setAttribute('aria-modal', 'true');
    drawer.setAttribute('aria-labelledby', 'wwi-title');
    drawer.hidden = true;

    var head = el('div', 'wwi-head');
    var title = el('h2', null, 'Your selected itineraries');
    title.id = 'wwi-title';
    var close = el('button', 'wwi-close', '×');
    close.type = 'button';
    close.setAttribute('aria-label', 'Close');
    head.append(title, close);

    var list = el('ul', 'wwi-list');
    var empty = el('div', 'wwi-empty');
    empty.append(el('p', null, 'No itineraries selected yet.'));
    var browse = el('a', 'wwi-link', 'Browse Fuerteventura itineraries');
    browse.href = 'fuerteventura.html';
    empty.append(browse);

    var foot = el('div', 'wwi-foot');
    var totalRow = el('p', 'wwi-total');
    var totalLabel = el('span', null, 'Total');
    var totalVal = el('strong');
    totalRow.append(totalLabel, totalVal);
    var go = el('a', 'btn wwi-go', 'Continue to checkout');
    go.href = 'checkout.html';
    var more = el('button', 'wwi-more', 'Continue exploring');
    more.type = 'button';
    foot.append(totalRow, go, more);

    drawer.append(head, list, empty, foot);
    document.body.append(overlay, drawer);

    var lastFocus = null;
    function render() {
      var ids = store.get();
      counter.textContent = 'My itineraries (' + ids.length + ')';
      counter.setAttribute('aria-label', 'My itineraries, ' + ids.length + ' selected');
      list.replaceChildren();
      ids.forEach(function (id) {
        var it = byId[id];
        var li = el('li');
        li.style.setProperty('--cat', catColor(it));
        var th = el('div', 'wwi-thumb');
        var img = document.createElement('img');
        img.alt = ''; img.loading = 'lazy';
        img.addEventListener('error', function () { img.remove(); });
        img.src = it.cover;
        th.append(img);
        var txt = el('div', 'wwi-txt');
        txt.append(el('strong', null, it.name), el('span', null, store.euro(it.price)));
        var rm = el('button', 'wwi-rm', '×');
        rm.type = 'button';
        rm.setAttribute('aria-label', 'Remove ' + it.name);
        rm.addEventListener('click', function () { store.remove(id); });
        li.append(th, txt, rm);
        list.append(li);
      });
      var has = ids.length > 0;
      list.hidden = !has; empty.hidden = has; totalRow.hidden = !has; go.hidden = !has;
      totalVal.textContent = store.euro(store.total(ids));
    }

    function open() {
      lastFocus = document.activeElement;
      overlay.hidden = false; drawer.hidden = false;
      document.body.classList.add('wwi-lock');
      requestAnimationFrame(function () { overlay.classList.add('open'); drawer.classList.add('open'); });
      counter.setAttribute('aria-expanded', 'true');
      close.focus();
    }
    function shut() {
      overlay.classList.remove('open'); drawer.classList.remove('open');
      document.body.classList.remove('wwi-lock');
      counter.setAttribute('aria-expanded', 'false');
      setTimeout(function () { overlay.hidden = true; drawer.hidden = true; }, 250);
      if (lastFocus && lastFocus.focus) lastFocus.focus();
    }
    store.openPanel = open;
    store.closePanel = shut;

    counter.addEventListener('click', open);
    close.addEventListener('click', shut);
    more.addEventListener('click', shut);
    overlay.addEventListener('click', shut);
    document.addEventListener('keydown', function (e) {
      if (drawer.hidden) return;
      if (e.key === 'Escape') { shut(); return; }
      if (e.key === 'Tab') {                       // keep focus inside the drawer
        var f = drawer.querySelectorAll('button:not([hidden]), a[href]:not([hidden])');
        f = Array.prototype.filter.call(f, function (n) { return !n.hidden && n.offsetParent !== null; });
        if (!f.length) return;
        var first = f[0], last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    });

    store.subscribe(render);
    w.addEventListener('storage', function (e) { if (e.key === KEY) render(); });   // other tabs
    w.addEventListener('pageshow', render);                                          // back/forward cache
    render();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})(typeof window !== 'undefined' ? window : globalThis);
