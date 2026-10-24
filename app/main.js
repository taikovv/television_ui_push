/* The home screen: one list, driven by the remote's arrows, OK and Back.
   ES5 throughout, for the TV's web engine. */

(function () {
  'use strict';

  var stage = document.getElementById('stage');
  var page = document.getElementById('page');
  var said = document.getElementById('said');
  var castingStatus = document.getElementById('casting-status');
  var flat = [], rows = [], at = 0;
  var apps = null, sources = [], selected = null;

  function build() {
    var focus = flat[at] ? Library.key(flat[at]) : selected;
    var groups = Library.groups(CATALOG, apps, sources, !Device.onTv());
    flat = [];
    var html = '';
    for (var g = 0; g < groups.length; g++) {
      html += '<h2>' + groups[g].group + '</h2>';
      for (var i = 0; i < groups[g].items.length; i++) {
        flat.push(groups[g].items[i]);
        html += '<div class="item"><span class="arrow">→</span><span class="name"></span></div>';
      }
    }
    document.getElementById('list').innerHTML = html;
    rows = document.querySelectorAll('#list .item');
    at = Math.min(at, Math.max(0, flat.length - 1));
    for (var i = 0; i < flat.length; i++) {
      if (Library.key(flat[i]) === focus) { at = i; break; }
    }
    paint();
  }

  // Keep the focused line near the middle; never scroll above the headline.
  function paint() {
    for (var i = 0; i < rows.length; i++) {
      var it = flat[i];
      rows[i].className = 'item' + (i === at ? ' focus' : '');
      rows[i].children[1].textContent = it.kind === 'appearance' ? 'appearance: ' + Appearance.get() : it.name;
    }
    document.getElementById('key-hints').textContent = flat[at] && flat[at].kind === 'appearance'
      ? '← → choose   ok next   back top'
      : '↑ ↓ choose   ok open   back top';
    var row = rows[at];
    if (!row) return;
    var max = page.offsetHeight - 1080;
    var y = Math.max(0, Math.min(row.offsetTop + row.offsetHeight / 2 - 560, max));
    page.style.transform = 'translateY(' + -y + 'px)';
  }

  var sayTimer;
  function say(text) {
    said.textContent = text;
    clearTimeout(sayTimer);
    sayTimer = setTimeout(function () { said.textContent = ''; }, 2800);
  }

  function open() {
    var it = flat[at];
    if (!it) return;
    remember();
    if (it.kind === 'appearance') { changeAppearance(1); return; }
    if (!Device.onTv()) { say('preview. on the tv this opens ' + it.name + '.'); return; }
    if (it.kind === 'input') {
      say('opening ' + it.name + '.');
      Device.input(it.source, function (err) {
        if (err) { say('could not open ' + it.name + ': ' + err + '.'); refresh(); }
      });
      return;
    }
    if (!it.target) { say(it.name + ' is not linked yet.'); return; }
    say('opening ' + it.name + '.');
    Device.launch(it.target, function (err) {
      if (err) say('could not open ' + it.name + ': ' + err + '.');
    });
  }

  // Coming back from an app lands on the line that opened it.
  function remember() {
    selected = flat[at] ? Library.key(flat[at]) : null;
    try { if (selected) localStorage.setItem('home.focus', selected); } catch (e) {}
  }
  function recall() {
    try {
      selected = localStorage.getItem('home.focus');
    } catch (e) {}
  }

  function night() {
    stage.className = Appearance.dark(new Date()) ? 'night' : '';
  }

  function changeAppearance(step) {
    var saved = Appearance.cycle(step);
    night();
    paint();
    if (!saved) say('appearance changed for this session. could not save it.');
  }

  function refresh() {
    Device.installed(function (list) {
      var status = Library.castingStatus(list, !Device.onTv());
      if (castingStatus.textContent !== status) castingStatus.textContent = status;
      if (list !== null) { apps = list; build(); }
      else if (Device.onTv() && apps === null) say('could not read installed apps. reopen home to retry.');
    });
    Device.inputs(function (list) {
      if (list !== null) {
        sources = list;
        if (apps !== null || !Device.onTv()) build();
      }
    });
  }

  // Left/right and OK choose appearance. N cycles it in a keyboard preview.
  document.addEventListener('keydown', function (e) {
    var k = e.keyCode;
    if (k === 38) { if (at > 0) at--; }
    else if (k === 40) { if (at < flat.length - 1) at++; }
    else if (k === 10009 || k === 27 || k === 8) at = 0;
    else if (k === 37 || k === 39) {
      if (!flat[at] || flat[at].kind !== 'appearance') return;
      changeAppearance(k === 37 ? -1 : 1);
    }
    else if (k === 78) changeAppearance(1);
    else if (k !== 13) return;
    e.preventDefault();
    if (k === 13) open(); else paint();
    remember();
  });

  document.getElementById('list').addEventListener('click', function (e) {
    for (var i = 0; i < rows.length; i++) {
      if (rows[i].contains(e.target)) {
        if (i === at) open(); else { at = i; paint(); remember(); }
        return;
      }
    }
  });

  // Apps may have been installed or removed while we were in the background.
  document.addEventListener('visibilitychange', function () {
    if (document.hidden) return;
    night();
    refresh();
  });

  function fit() {
    var s = Math.min(window.innerWidth / 1920, window.innerHeight / 1080);
    var x = (window.innerWidth - 1920 * s) / 2, y = (window.innerHeight - 1080 * s) / 2;
    stage.style.transform = 'translate(' + x + 'px,' + y + 'px) scale(' + s + ')';
  }

  recall();
  night();
  // On the TV, wait for discovery before drawing apps; never flash placeholders.
  if (!Device.onTv()) build();
  refresh();
  Device.watchInputs(function () { if (!document.hidden) refresh(); });
  setInterval(function () { if (!document.hidden) refresh(); }, 15000);
  fit();
  setInterval(night, 60000);
  window.addEventListener('resize', fit);
}());
