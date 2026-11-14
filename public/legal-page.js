// Shows a text file from /legal/ as a page. To change the text, edit the .md file in GitHub.
// The file is read as plain text and built with safe DOM nodes (never as HTML).
(function () {
  var name = document.body.getAttribute('data-doc');
  var box = document.getElementById('doc');

  var LINK = /(https?:\/\/[^\s<>]*[^\s<>.,;:)])|([A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,})/g;

  function inline(parent, text) {
    var last = 0, m;
    LINK.lastIndex = 0;
    while ((m = LINK.exec(text))) {
      if (m.index > last) parent.appendChild(document.createTextNode(text.slice(last, m.index)));
      var a = document.createElement('a');
      a.textContent = m[0];
      if (m[1]) { a.href = m[0]; a.target = '_blank'; a.rel = 'noopener noreferrer'; }
      else { a.href = 'mailto:' + m[0]; }
      parent.appendChild(a);
      last = m.index + m[0].length;
    }
    if (last < text.length) parent.appendChild(document.createTextNode(text.slice(last)));
  }

  function render(src) {
    var lines = src.replace(/\r/g, '').split('\n');
    var para = [], list = null, listTag = '';
    box.textContent = '';

    function flushPara() {
      if (!para.length) return;
      var p = document.createElement('p');
      para.forEach(function (l, i) {
        if (i) p.appendChild(document.createElement('br'));
        inline(p, l);
      });
      box.appendChild(p);
      para = [];
    }
    function flushList() { list = null; listTag = ''; }

    lines.forEach(function (raw) {
      var line = raw.trim(), m;
      if (!line) { flushPara(); flushList(); return; }

      if ((m = line.match(/^(#{1,3})\s+(.*)$/))) {
        flushPara(); flushList();
        var h = document.createElement('h' + m[1].length);
        h.textContent = m[2];
        box.appendChild(h);
        if (m[1].length === 1) document.title = m[2] + ' | Fuerteventura Itineraries';
        return;
      }
      var bullet = line.match(/^-\s+(.*)$/), num = line.match(/^\d+\.\s+(.*)$/);
      if (bullet || num) {
        flushPara();
        var tag = bullet ? 'ul' : 'ol';
        if (listTag !== tag) {
          list = document.createElement(tag);
          listTag = tag;
          box.appendChild(list);
        }
        var li = document.createElement('li');
        inline(li, (bullet || num)[1]);
        list.appendChild(li);
        return;
      }
      flushList();
      para.push(line);
    });
    flushPara();
  }

  if (!name || !/^[a-z-]+$/.test(name)) return;
  fetch('/legal/' + name + '.md', { cache: 'no-cache' })
    .then(function (r) { if (!r.ok) throw new Error('missing'); return r.text(); })
    .then(render)
    .catch(function () {
      box.textContent = 'This page could not be loaded. Please try again in a moment or contact us.';
    });
})();
