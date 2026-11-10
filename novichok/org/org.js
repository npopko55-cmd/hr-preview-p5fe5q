/* Раздел «Структура Группы «ВИС»»: оргсхема, выбор компании, поиск */
(function () {
  'use strict';
  var root = document.getElementById('orgx');
  var data = window.VIS_ORG;
  if (!root || !data || !data.length) return;

  function q(s) { return root.querySelector(s); }
  var tabs = q('.orgx-tabs');
  var select = q('.orgx-select');
  var title = q('.orgx-title');
  var count = q('.orgx-count');
  var canvas = q('.orgx-canvas');
  var view = q('.orgx-view');
  var stage = q('.orgx-stage');
  var input = q('.orgx-search input');
  var results = q('.orgx-results');
  var expandBtn = q('.orgx-expand');
  var btnL = q('.ox-left'), btnR = q('.ox-right');
  var moreL = q('.orgx-more-l'), moreR = q('.orgx-more-r');
  var btnIn = q('.ox-zin'), btnOut = q('.ox-zout'), btnFit = q('.ox-fit'), zval = q('.orgx-zval');

  var mqMobile = window.matchMedia('(max-width:720px)');
  var mqReduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  var GAP = 20, PAD = 28, COL_MIN = 216, COL_MAX = 320;
  var current = 0, zoom = 1, uid = 0;

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
  function plural(n, one, few, many) {
    var a = n % 10, b = n % 100;
    if (a === 1 && b !== 11) return one;
    if (a >= 2 && a <= 4 && (b < 12 || b > 14)) return few;
    return many;
  }
  function norm(s) { return s.toLowerCase().replace(/ё/g, 'е'); }
  function svg(html) {
    var w = document.createElement('span');
    w.innerHTML = html;
    return w.firstChild;
  }
  var CHEV = '<svg viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 4.5L6 7.5l3-3"/></svg>';
  var TRIS = '<svg class="tris" aria-hidden="true" focusable="false"><use href="#i-tris"/></svg>';

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
  tabs.addEventListener('keydown', function (e) {
    var k = e.key, n = data.length, i = current;
    if (k === 'ArrowRight') i = (current + 1) % n;
    else if (k === 'ArrowLeft') i = (current - 1 + n) % n;
    else if (k === 'Home') i = 0;
    else if (k === 'End') i = n - 1;
    else return;
    e.preventDefault();
    show(i);
    tabs.children[i].focus();
  });

  // ---- схема
  function renderNode(n, lvl, path, coName) {
    var kids = n.c || [];
    var li = el('li', 'oc-item oc-l' + Math.min(lvl, 3));
    li.setAttribute('role', 'treeitem');
    li.setAttribute('aria-level', lvl + 1);
    li.tabIndex = -1;
    li.dataset.path = path;
    var card = el('div', 'oc-card');
    var name = el('span', 'oc-name', n.t);
    name.id = 'oc-n' + (++uid);
    li.setAttribute('aria-labelledby', name.id);
    if (lvl === 0) {
      var co = el('span', 'oc-co');
      co.appendChild(svg(TRIS));
      co.appendChild(document.createTextNode(coName));
      co.setAttribute('aria-hidden', 'true');
      card.appendChild(co);
    }
    card.appendChild(name);
    if (kids.length && lvl > 0) {
      li.setAttribute('aria-expanded', 'false');
      var meta = el('span', 'oc-meta');
      var total = size(n);
      meta.appendChild(el('span', 'oc-num', total + ' в подчинении'));
      meta.appendChild(svg('<span class="oc-chev">' + CHEV + '</span>'));
      card.appendChild(meta);
    }
    if (lvl === 0) {
      var head = el('div', 'oc-head' + (kids.length ? ' has-kids' : ''));
      head.appendChild(card);
      li.appendChild(head);
      li.classList.add('is-open', 'is-done');
    } else {
      li.appendChild(card);
    }
    if (kids.length) {
      var wrap = el('div', 'oc-kids');
      var ul = el('ul', lvl === 0 ? 'oc-row' : 'oc-list');
      ul.setAttribute('role', 'group');
      kids.forEach(function (c, k) { ul.appendChild(renderNode(c, lvl + 1, path + '.' + k, coName)); });
      wrap.appendChild(ul);
      li.appendChild(wrap);
    }
    return li;
  }

  function isExpandable(li) { return li.hasAttribute('aria-expanded'); }
  function isOpen(li) { return li.classList.contains('is-open'); }
  function setOpen(li, open, instant) {
    if (!isExpandable(li)) return;
    li.setAttribute('aria-expanded', open ? 'true' : 'false');
    if (open) {
      li.classList.add('is-open');
      if (instant || mqReduce.matches || stage.classList.contains('no-anim')) li.classList.add('is-done');
      else setTimeout(function () { if (isOpen(li)) li.classList.add('is-done'); }, 450);
    } else {
      li.classList.remove('is-done', 'is-open');
    }
  }
  stage.addEventListener('transitionend', function (e) {
    if (e.propertyName !== 'grid-template-rows' || !e.target.classList.contains('oc-kids')) return;
    var li = e.target.parentNode;
    if (isOpen(li)) li.classList.add('is-done');
  });
  function allExpandable() { return stage.querySelectorAll('.oc-item[aria-expanded]'); }
  function syncExpandBtn() {
    var all = allExpandable(), open = 0;
    all.forEach(function (li) { if (isOpen(li)) open++; });
    expandBtn.textContent = all.length && open === all.length ? 'Свернуть всё' : 'Развернуть всё';
    expandBtn.disabled = !all.length;
  }

  function show(i, keepScroll) {
    current = i;
    var co = data[i];
    Array.prototype.forEach.call(tabs.children, function (b, k) {
      b.setAttribute('aria-selected', k === i ? 'true' : 'false');
      b.tabIndex = k === i ? 0 : -1;
    });
    select.value = i;
    title.textContent = co.full;
    var total = size(co.tree) + 1, direct = (co.tree.c || []).length;
    count.innerHTML = '';
    count.appendChild(el('b', null, String(total)));
    count.appendChild(document.createTextNode(' ' + plural(total, 'подразделение и должность', 'подразделения и должности', 'подразделений и должностей') + ' · '));
    count.appendChild(el('b', null, String(direct)));
    count.appendChild(document.createTextNode(' в прямом подчинении'));
    stage.classList.add('no-anim');
    stage.innerHTML = '';
    var ul = el('ul', 'oc-tree');
    ul.setAttribute('role', 'tree');
    ul.setAttribute('aria-label', 'Схема подчинения: ' + co.full);
    var top = renderNode(co.tree, 0, '0', co.name);
    top.tabIndex = 0;
    ul.appendChild(top);
    stage.appendChild(ul);
    if (total <= 12) allExpandable().forEach(function (li) { setOpen(li, true, true); });
    syncExpandBtn();
    zoom = 1;
    if (!keepScroll) view.scrollLeft = 0;
    layout();
    requestAnimationFrame(function () { requestAnimationFrame(function () { stage.classList.remove('no-anim'); }); });
  }

  // ---- раскладка: ширина колонок, ровная высота карточек ряда, руководитель по центру видимой области
  function rowCount() { return (data[current].tree.c || []).length; }
  function availWidth() { return view.clientWidth - PAD * 2; }
  function naturalWidth(colw) { var n = rowCount(); return Math.max(n * colw + (n - 1) * GAP, 300); }
  function layout() {
    var mobile = mqMobile.matches;
    var cards = stage.querySelectorAll('.oc-row > .oc-item > .oc-card');
    var head = stage.querySelector('.oc-head');
    cards.forEach(function (c) { c.style.minHeight = ''; });
    if (mobile) {
      stage.style.zoom = '';
      stage.style.removeProperty('--colw');
      if (head) head.style.width = '';
      edges();
      return;
    }
    var n = rowCount(), avail = availWidth(), colw = COL_MIN;
    if (n && n * COL_MIN + (n - 1) * GAP <= avail) colw = Math.min(COL_MAX, Math.floor((avail - (n - 1) * GAP) / n));
    stage.style.setProperty('--colw', colw + 'px');
    stage.style.zoom = zoom === 1 ? '' : zoom;
    if (head) head.style.width = Math.max(300, avail / zoom) + 'px';
    var max = 0;
    cards.forEach(function (c) { max = Math.max(max, c.offsetHeight); });
    cards.forEach(function (c) { c.style.minHeight = max + 'px'; });
    var fit = fitZoom();
    btnFit.disabled = fit >= 1 && zoom === 1;
    btnIn.disabled = zoom >= 1.2;
    btnOut.disabled = zoom <= Math.max(0.35, fit) - 0.001 && fit < 1 || zoom <= 0.35;
    zval.textContent = Math.round(zoom * 100) + '%';
    edges();
  }
  function fitZoom() {
    var colw = parseFloat(stage.style.getPropertyValue('--colw')) || COL_MIN;
    return Math.min(1, Math.floor(availWidth() / naturalWidth(colw) * 100) / 100);
  }
  function edges() {
    var max = view.scrollWidth - view.clientWidth;
    var l = view.scrollLeft > 6, r = view.scrollLeft < max - 6;
    canvas.classList.toggle('can-l', l);
    canvas.classList.toggle('can-r', r);
    btnL.disabled = !l;
    btnR.disabled = !r;
    var cols = stage.querySelectorAll('.oc-row > .oc-item > .oc-card');
    var vr = view.getBoundingClientRect(), cr = canvas.getBoundingClientRect();
    var left = 0, right = 0, top = 0;
    if (!mqMobile.matches) {
      cols.forEach(function (c) {
        var b = c.getBoundingClientRect();
        if (b.left + b.width / 2 < vr.left + 24) left++;
        else if (b.left + b.width / 2 > vr.right - 24) right++;
        top = b.top - 30 - cr.top;
      });
    }
    moreBadge(moreL, left, '← ещё ');
    moreBadge(moreR, right, 'ещё ', ' →');
    moreL.style.top = moreR.style.top = (top - 17) + 'px';
  }
  function moreBadge(b, n, pre, post) {
    b.hidden = !n;
    b.textContent = n ? pre + n + (post || '') : '';
  }
  function setZoom(z) {
    var center = (view.scrollLeft + view.clientWidth / 2) / (view.scrollWidth || 1);
    zoom = Math.floor(Math.max(0.35, Math.min(1.2, z)) * 100 + 0.001) / 100;
    layout();
    view.scrollLeft = center * view.scrollWidth - view.clientWidth / 2;
    edges();
  }
  btnIn.addEventListener('click', function () { setZoom(zoom + 0.1); });
  btnOut.addEventListener('click', function () { setZoom(zoom - 0.1); });
  btnFit.addEventListener('click', function () { var f = fitZoom(); setZoom(Math.abs(zoom - f) < 0.011 ? 1 : f); });
  function page(dir) { view.scrollBy({ left: dir * view.clientWidth * 0.75, behavior: mqReduce.matches ? 'auto' : 'smooth' }); }
  btnL.addEventListener('click', function () { page(-1); });
  btnR.addEventListener('click', function () { page(1); });
  moreL.addEventListener('click', function () { page(-1); });
  moreR.addEventListener('click', function () { page(1); });
  view.addEventListener('scroll', edges, { passive: true });
  if (window.ResizeObserver) {
    var lastW = 0;
    new ResizeObserver(function () {
      if (view.clientWidth === lastW) return;
      lastW = view.clientWidth;
      layout();
    }).observe(view);
  } else {
    window.addEventListener('resize', layout);
  }
  if (mqMobile.addEventListener) mqMobile.addEventListener('change', layout);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(layout);

  // ---- перетаскивание схемы мышью
  var drag = null, suppress = false;
  view.addEventListener('pointerdown', function (e) {
    if (e.pointerType !== 'mouse' || e.button !== 0 || mqMobile.matches) return;
    drag = { x: e.clientX, sl: view.scrollLeft, id: e.pointerId, moved: false };
  });
  view.addEventListener('pointermove', function (e) {
    if (!drag || e.pointerId !== drag.id) return;
    var dx = e.clientX - drag.x;
    if (!drag.moved && Math.abs(dx) > 5) {
      drag.moved = true;
      view.classList.add('is-grabbing');
      try { view.setPointerCapture(drag.id); } catch (err) { /* не критично */ }
    }
    if (drag.moved) view.scrollLeft = drag.sl - dx;
  });
  function endDrag() {
    if (!drag) return;
    if (drag.moved) {
      suppress = true;
      setTimeout(function () { suppress = false; }, 0);
    }
    view.classList.remove('is-grabbing');
    drag = null;
  }
  view.addEventListener('pointerup', endDrag);
  view.addEventListener('pointercancel', endDrag);
  view.addEventListener('click', function (e) {
    if (suppress) { e.stopPropagation(); e.preventDefault(); }
  }, true);

  // ---- нажатие на карточку
  stage.addEventListener('click', function (e) {
    var card = e.target.closest('.oc-card');
    if (!card) return;
    var li = card.closest('.oc-item');
    focusItem(li, true);
    if (isExpandable(li)) {
      setOpen(li, !isOpen(li));
      syncExpandBtn();
    }
  });

  // ---- клавиатура: стрелки по карточкам, Enter/пробел раскрывают
  function visibleItems() {
    return Array.prototype.filter.call(stage.querySelectorAll('.oc-item'), function (li) {
      var p = li.parentElement.closest('.oc-item');
      while (p) {
        if (!isOpen(p)) return false;
        p = p.parentElement.closest('.oc-item');
      }
      return true;
    });
  }
  function focusItem(li, noScroll) {
    stage.querySelectorAll('.oc-item[tabindex="0"]').forEach(function (x) { x.tabIndex = -1; });
    li.tabIndex = 0;
    li.focus({ preventScroll: true });
    if (!noScroll) {
      var card = li.querySelector('.oc-card');
      card.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    }
  }
  stage.addEventListener('keydown', function (e) {
    var li = e.target;
    if (!li.classList || !li.classList.contains('oc-item')) return;
    var items, i, k = e.key;
    if (k === 'Enter' || k === ' ') {
      e.preventDefault();
      if (isExpandable(li)) { setOpen(li, !isOpen(li)); syncExpandBtn(); }
      return;
    }
    if (k === 'ArrowDown' || k === 'ArrowUp' || k === 'Home' || k === 'End') {
      e.preventDefault();
      items = visibleItems();
      i = items.indexOf(li);
      if (k === 'ArrowDown') i = Math.min(items.length - 1, i + 1);
      else if (k === 'ArrowUp') i = Math.max(0, i - 1);
      else if (k === 'Home') i = 0;
      else i = items.length - 1;
      focusItem(items[i]);
      return;
    }
    if (k === 'ArrowRight') {
      e.preventDefault();
      if (isExpandable(li) && !isOpen(li)) { setOpen(li, true); syncExpandBtn(); return; }
      var first = li.querySelector('.oc-kids .oc-item');
      if (first && isOpen(li)) focusItem(first);
      return;
    }
    if (k === 'ArrowLeft') {
      e.preventDefault();
      if (isExpandable(li) && isOpen(li)) { setOpen(li, false); syncExpandBtn(); return; }
      var parent = li.parentElement.closest('.oc-item');
      if (parent) focusItem(parent);
    }
  });

  expandBtn.addEventListener('click', function () {
    var open = expandBtn.textContent === 'Развернуть всё';
    allExpandable().forEach(function (li) { setOpen(li, open); });
    syncExpandBtn();
  });

  // ---- найти и показать карточку
  function reveal(path) {
    var parts = path.split('.'), target = null;
    for (var k = 1; k <= parts.length; k++) {
      var li = stage.querySelector('[data-path="' + parts.slice(0, k).join('.') + '"]');
      if (!li) return;
      if (k < parts.length) setOpen(li, true);
      else target = li;
    }
    syncExpandBtn();
    stage.querySelectorAll('.oc-card.is-found').forEach(function (c) { c.classList.remove('is-found'); });
    var card = target.querySelector('.oc-card');
    card.classList.add('is-found');
    focusItem(target, true);
    setTimeout(function () {
      card.scrollIntoView({ block: 'center', inline: 'center', behavior: mqReduce.matches ? 'auto' : 'smooth' });
    }, 80);
  }

  // ---- поиск по всем компаниям
  var index = [];
  data.forEach(function (co, i) {
    (function walk(n, path, trail) {
      index.push({ co: i, path: path, t: n.t, low: norm(n.t), trail: trail });
      (n.c || []).forEach(function (c, k) { walk(c, path + '.' + k, trail.concat(n.t)); });
    })(co.tree, '0', []);
  });

  function markName(t, qn) {
    var span = el('span', 'orgx-hit-name');
    var at = norm(t).indexOf(qn);
    if (at < 0) { span.textContent = t; return span; }
    span.appendChild(document.createTextNode(t.slice(0, at)));
    span.appendChild(el('mark', null, t.slice(at, at + qn.length)));
    span.appendChild(document.createTextNode(t.slice(at + qn.length)));
    return span;
  }
  function hitButton(h, qn) {
    var b = el('button', 'orgx-hit');
    b.type = 'button';
    b.appendChild(markName(h.t, qn));
    b.appendChild(el('span', 'orgx-hit-path', !h.trail.length ? 'Руководитель компании' : h.trail.length === 1 ? 'Руководитель: ' + h.trail[0].toLowerCase() : h.trail.slice(1).join(' → ')));
    b.addEventListener('click', function () { pick(h); });
    return b;
  }
  var lastHits = [];
  function openResults(open) {
    results.hidden = !open;
    input.setAttribute('aria-expanded', open ? 'true' : 'false');
  }
  function runSearch() {
    var qn = norm(input.value.trim());
    results.innerHTML = '';
    lastHits = [];
    if (qn.length < 2) { openResults(false); return; }
    var hits = index.filter(function (x) { return x.low.indexOf(qn) !== -1; });
    hits.sort(function (a, b) {
      var ac = a.co === current ? -1 : a.co, bc = b.co === current ? -1 : b.co;
      return ac - bc;
    });
    lastHits = hits;
    openResults(true);
    if (!hits.length) {
      results.appendChild(el('p', 'orgx-empty', 'Ничего не нашлось. Введите часть слова, например «бухгалт».'));
      return;
    }
    var cos = {};
    hits.forEach(function (h) { cos[h.co] = 1; });
    var ncos = Object.keys(cos).length;
    results.appendChild(el('p', 'orgx-res-sum', 'Найдено: ' + hits.length + ' · ' + ncos + ' ' + plural(ncos, 'компания', 'компании', 'компаний')));
    var group = null, last = -1;
    hits.slice(0, 60).forEach(function (h) {
      if (h.co !== last) {
        last = h.co;
        var head = el('p', 'orgx-res-co', data[h.co].name);
        if (h.co === current) head.appendChild(el('span', 'orgx-res-here', 'открыта сейчас'));
        results.appendChild(head);
        group = el('ul', 'orgx-res-list');
        results.appendChild(group);
      }
      var li = el('li');
      li.appendChild(hitButton(h, qn));
      group.appendChild(li);
    });
  }
  function pick(h) {
    openResults(false);
    if (h.co !== current) show(h.co);
    reveal(h.path);
  }
  input.addEventListener('input', runSearch);
  input.addEventListener('focus', function () { if (input.value.trim().length >= 2) runSearch(); });
  input.addEventListener('keydown', function (e) {
    if (e.key === 'ArrowDown') {
      var first = results.querySelector('.orgx-hit');
      if (first && !results.hidden) { e.preventDefault(); first.focus(); }
    } else if (e.key === 'Enter') {
      if (lastHits.length) { e.preventDefault(); pick(lastHits[0]); }
    } else if (e.key === 'Escape') {
      openResults(false);
    }
  });
  results.addEventListener('keydown', function (e) {
    var all = Array.prototype.slice.call(results.querySelectorAll('.orgx-hit'));
    var i = all.indexOf(document.activeElement);
    if (e.key === 'ArrowDown') { e.preventDefault(); if (all[i + 1]) all[i + 1].focus(); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); if (i > 0) all[i - 1].focus(); else input.focus(); }
    else if (e.key === 'Escape') { openResults(false); input.focus(); }
  });
  document.addEventListener('click', function (e) {
    if (!results.hidden && !q('.orgx-search').contains(e.target)) openResults(false);
  });

  show(0);
})();
