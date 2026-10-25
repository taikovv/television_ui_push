/* Foreground-only CRT volume OSD. Native controls resume outside this app.
   Actual TV readings only; a browser preview is explicitly labelled. ES5. */
(function () {
  'use strict';
  var panel = document.getElementById('volume-osd');
  var label = document.getElementById('volume-label');
  var value = document.getElementById('volume-value');
  var meter = document.getElementById('volume-meter');
  var steps = [], keys = ['VolumeUp', 'VolumeDown', 'VolumeMute'];
  var registered = [], started = false, active = false, listener = false;
  var poll, dismiss, state = null, previewLevel = 45, previewMute = false;
  var preview = !Device.onTv();
  function audio() { return window.tizen && tizen.tvaudiocontrol; }
  for (var i = 0; i < 24; i++) {
    var step = document.createElement('span');
    step.className = 'volume-step';
    step.appendChild(document.createElement('i'));
    meter.appendChild(step); steps.push(step);
  }
  function read() {
    if (preview) return { level: previewLevel, muted: previewMute };
    var a = audio();
    if (!a) throw new Error('audio unavailable');
    var level = a.getVolume(), muted = a.isMute();
    if (typeof level !== 'number' || !isFinite(level) || level < 0 || level > 100 || typeof muted !== 'boolean') throw new Error('audio unavailable');
    return { level: Math.round(level), muted: muted };
  }
  function hide() { clearTimeout(dismiss); panel.hidden = true; }
  function show(next) {
    if (document.hidden) return;
    state = next;
    label.textContent = (next.muted ? 'muted' : 'volume') + (preview ? ' · preview' : '');
    value.textContent = String(next.level);
    var lit = next.muted ? 0 : Math.ceil(next.level * steps.length / 100);
    for (var i = 0; i < steps.length; i++) steps[i].className = 'volume-step' + (i < lit ? ' lit' : '');
    panel.setAttribute('aria-label', next.muted ? 'Muted' : 'TV volume ' + next.level + ' of 100');
    panel.hidden = false;
    clearTimeout(dismiss); dismiss = setTimeout(hide, 2200);
  }
  function releaseKeys() {
    for (var i = 0; i < registered.length; i++) {
      try { tizen.tvinputdevice.unregisterKey(registered[i]); } catch (e) {}
    }
    registered = []; active = false;
  }
  function sample() {
    try {
      var next = read();
      if (state && (state.level !== next.level || state.muted !== next.muted)) show(next);
      else state = next;
    } catch (e) { hide(); releaseKeys(); }
  }
  function resume() {
    if (document.hidden || !started) return;
    pause();
    try { state = read(); } catch (e) { return; }
    if (!preview) {
      // All keys must register before this app takes responsibility for volume.
      try {
        if (!tizen.tvinputdevice) throw new Error('keys unavailable');
        for (var i = 0; i < keys.length; i++) {
          tizen.tvinputdevice.registerKey(keys[i]); registered.push(keys[i]);
        }
        active = true;
      } catch (e) { releaseKeys(); }
      try { audio().setVolumeChangeListener(sample); listener = true; } catch (e) {}
      // Mute has no volume-change callback; only sample while foregrounded.
      poll = setInterval(sample, 750);
    }
  }
  function pause() {
    clearInterval(poll); hide(); releaseKeys();
    if (listener) { try { audio().unsetVolumeChangeListener(); } catch (e) {} }
    listener = false; state = null;
  }
  function handle(e) {
    if (!started || document.hidden) return false;
    var code = e.keyCode, action = code === 447 ? 1 : code === 448 ? -1 : code === 449 ? 0 : null;
    if (preview) {
      if (e.key === '+' || e.key === '=') action = 1;
      if (e.key === '-') action = -1;
      if (e.key === 'm' || e.key === 'M') action = 0;
      if (e.key === 'v' || e.key === 'V') { show(read()); return true; }
    }
    if (action === null || (!preview && !active)) return false;
    try {
      if (preview) {
        if (action === 0) previewMute = !previewMute;
        else { previewLevel = Math.max(0, Math.min(100, previewLevel + action)); previewMute = false; }
      } else {
        var a = audio();
        if (action === 0) a.setMute(!a.isMute());
        else if (action > 0) a.setVolumeUp();
        else a.setVolumeDown();
      }
      show(read());
    } catch (e) {
      // Restore native key handling on failure; never draw a fabricated level.
      pause();
      panel.dispatchEvent(new Event('volume-unavailable'));
    }
    return true;
  }
  document.addEventListener('visibilitychange', function () {
    if (document.hidden) pause(); else resume();
  });
  window.Volume = { start: function () { if (!started) { started = true; resume(); } }, handle: handle };
}());
