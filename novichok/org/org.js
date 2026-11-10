/* Раздел «Структура компаний Группы «ВИС»»: выбор компании, дерево, поиск, утверждённая схема */
(function () {
  'use strict';
  var root = document.getElementById('orgx');
  var data = window.VIS_ORG;
  if (!root || !data || !data.length) return;

  var tabs = root.querySelector('.orgx-tabs');
  var select = root.querySelector('.orgx-select');
  var title = root.querySelector('.orgx-title');
  var count = root.querySelector('.orgx-count');
  var tree = root.querySelector('.orgx-tree');
  var input = root.querySelector('.orgx-search input');
  var results = root.querySelector('.orgx-results');
  var schemeBtn = root.querySelector('.orgx-scheme');
  var expandBtn = root.querySelector('.orgx-expand');
  var dialog = document.getElementById('orgxDialog');
  var current = 0;

  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }
  function size(n) {
    var s = 0;
    (n.c || []).forEach(function (c) { s += 1 + size(c); });
    return s;
  }

  // ---- компании
  data.forEach(function (co, i) {
    var b = el('button', 'orgx-tab', co.name);
    b.type = 'button';
    b.setAttribute('role', 'tab');
    b.addEventListener('click', function () { show(i); });
    tabs.appendChild(b);
    var o = el('option', null, co.name);
    o.value = i;
    select.appendChild(o);
  });
  select.addEventListener('change', function () { show(+select.value); });

  // ---- дерево
  function renderNode(n, lvl, path) {
    var li = el('li', 'orgx-item');
    li.dataset.path = path;
    var row = el('div', 'orgx-row');
    var kids = n.c || [];
    if (kids.length) {
      var t = el('button', 'orgx-toggle');
      t.type = 'button';
      t.setAttribute('aria-expanded', lvl < 1 ? 'true' : 'false');
      t.setAttribute('aria-label', 'Показать подчинённые подразделения: ' + n.t);
      t.addEventListener('click', function () {
        t.setAttribute('aria-expanded', t.getAttribute('aria-expanded') === 'true' ? 'false' : 'true');
      });
      row.appendChild(t);
    } else {
      row.appendChild(el('span', 'orgx-dot'));
    }
    row.appendChild(el('span', 'orgx-name' + (lvl === 0 ? ' is-head' : ''), n.t));
    if (kids.length) row.appendChild(el('span', 'orgx-badge', String(size(n))));
    li.appendChild(row);
    if (kids.length) {
      var ul = el('ul', 'orgx-list');
      kids.forEach(function (c, k) { ul.appendChild(renderNode(c, lvl + 1, path + '.' + k)); });
      li.appendChild(ul);
    }
    return li;
  }

  function show(i, focusPath) {
    current = i;
    var co = data[i];
    Array.prototype.forEach.call(tabs.children, function (b, k) {
      b.setAttribute('aria-selected', k === i ? 'true' : 'false');
    });
    select.value = i;
    title.textContent = co.full;
    count.textContent = 'Подразделений и должностей: ' + (size(co.tree) + 1);
    tree.innerHTML = '';
    var ul = el('ul', 'orgx-list orgx-top');
    ul.appendChild(renderNode(co.tree, 0, '0'));
    tree.appendChild(ul);
    expandBtn.textContent = 'Развернуть всё';
    if (focusPath) reveal(focusPath);
  }

  function reveal(path) {
    var parts = path.split('.');
    for (var k = 1; k <= parts.length; k++) {
      var li = tree.querySelector('[data-path="' + parts.slice(0, k).join('.') + '"]');
      if (!li) return;
      var t = li.querySelector(':scope > .orgx-row > .orgx-toggle');
      if (t && k < parts.length) t.setAttribute('aria-expanded', 'true');
      if (k === parts.length) {
        var row = li.querySelector('.orgx-row');
        row.classList.add('is-hit');
        row.scrollIntoView({ block: 'center', behavior: 'smooth' });
        setTimeout(function () { row.classList.remove('is-hit'); }, 2600);
      }
    }
  }

  expandBtn.addEventListener('click', function () {
    var open = expandBtn.textContent === 'Развернуть всё';
    tree.querySelectorAll('.orgx-toggle').forEach(function (t, k) {
      t.setAttribute('aria-expanded', open || k === 0 ? 'true' : 'false');
    });
    expandBtn.textContent = open ? 'Свернуть' : 'Развернуть всё';
  });

  // ---- поиск по всем компаниям
  var index = [];
  data.forEach(function (co, i) {
    (function walk(n, path, trail) {
      index.push({ co: i, path: path, t: n.t, low: n.t.toLowerCase().replace(/ё/g, 'е'), trail: trail });
      (n.c || []).forEach(function (c, k) { walk(c, path + '.' + k, trail.concat(n.t)); });
    })(co.tree, '0', []);
  });

  input.addEventListener('input', function () {
    var q = input.value.trim().toLowerCase().replace(/ё/g, 'е');
    results.innerHTML = '';
    results.hidden = q.length < 2;
    if (q.length < 2) return;
    var hits = index.filter(function (x) { return x.low.indexOf(q) !== -1; }).slice(0, 30);
    if (!hits.length) {
      results.appendChild(el('li', 'orgx-empty', 'Ничего не найдено'));
      return;
    }
    hits.forEach(function (h) {
      var li = el('li');
      var b = el('button', 'orgx-hit');
      b.type = 'button';
      b.appendChild(el('span', 'orgx-hit-name', h.t));
      b.appendChild(el('span', 'orgx-hit-path', data[h.co].name + (h.trail.length ? ' → ' + h.trail.slice(-2).join(' → ') : '')));
      b.addEventListener('click', function () {
        results.hidden = true;
        show(h.co, h.path);
      });
      li.appendChild(b);
      results.appendChild(li);
    });
  });

  // ---- утверждённая схема
  var img = dialog.querySelector('img');
  var zoom = 1;
  function setZoom(z) {
    zoom = Math.max(1, Math.min(4, z));
    img.style.width = (zoom * 100) + '%';
  }
  schemeBtn.addEventListener('click', function () {
    var co = data[current];
    img.src = co.img;
    img.alt = 'Организационная структура ' + co.full;
    dialog.querySelector('.orgx-dlg-title').textContent = co.full;
    dialog.querySelector('.orgx-dlg-open').href = co.img;
    setZoom(1);
    if (dialog.showModal) dialog.showModal(); else window.open(co.img, '_blank');
  });
  dialog.querySelector('.orgx-zin').addEventListener('click', function () { setZoom(zoom + 0.5); });
  dialog.querySelector('.orgx-zout').addEventListener('click', function () { setZoom(zoom - 0.5); });
  dialog.querySelector('.orgx-close').addEventListener('click', function () { dialog.close(); });
  dialog.addEventListener('click', function (e) { if (e.target === dialog) dialog.close(); });

  show(0);
})();
