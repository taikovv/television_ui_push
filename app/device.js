/* The TV side: opening apps and listing what is installed, through Tizen's
   public application API. Nothing here touches the network. In a desktop
   preview there is no tizen object, and every call says so. */

(function () {
  'use strict';

  function api() { return window.tizen && window.tizen.application; }

  // done(null) on success, 'preview' outside the TV, or an error string.
  function launch(appId, done) {
    if (!api()) { done('preview'); return; }
    var finished = false;
    var timer = setTimeout(function () { finish('the tv did not answer'); }, 8000);
    function finish(err) {
      if (finished) return;
      finished = true;
      clearTimeout(timer);
      done(err);
    }
    try {
      api().launch(appId, function () { finish(null); }, function (e) { finish((e && (e.message || e.name)) || 'error'); });
    } catch (e) {
      finish(e.message || 'error');
    }
  }

  // done([{ id, name }]) on the TV, done(null) in a preview or on failure.
  function installed(done) {
    if (!api()) { done(null); return; }
    try {
      api().getAppsInfo(function (list) {
        var out = [];
        for (var i = 0; i < list.length; i++) out.push({ id: list[i].id, name: list[i].name || '' });
        done(out);
      }, function () { done(null); });
    } catch (e) {
      done(null);
    }
  }

  function inputs(done) {
    if (!window.tizen || !tizen.systeminfo) { done(null); return; }
    try {
      tizen.systeminfo.getPropertyValue('VIDEOSOURCE', function (value) {
        done(value.connected || []);
      }, function () { done(null); });
    } catch (e) { done(null); }
  }

  // Recheck at selection time: the cable may have been unplugged since paint.
  // Hand the selected source to Samsung's native viewer, so Home stays a
  // platform action rather than leaving a video overlay above our own page.
  function input(source, done) {
    if (!window.tizen || !tizen.tvwindow) { done('input switching is unavailable'); return; }
    inputs(function (list) {
      var current = null;
      for (var i = 0; list && i < list.length; i++) {
        if (list[i].type === source.type && list[i].number === source.number) current = list[i];
      }
      if (!current) { done('this input is no longer connected'); return; }
      try {
        tizen.tvwindow.setSource(current, function () {
          launch('org.tizen.tv-viewer', done);
        }, function (e) { done((e && (e.message || e.name)) || 'could not switch input'); });
      } catch (e) { done(e.message || 'could not switch input'); }
    });
  }

  function watchInputs(changed) {
    if (!window.tizen || !tizen.systeminfo) return;
    try { tizen.systeminfo.addPropertyValueChangeListener('VIDEOSOURCE', changed); } catch (e) {}
  }

  window.Device = { launch: launch, installed: installed, inputs: inputs, input: input,
    watchInputs: watchInputs, onTv: function () { return !!api(); } };
}());
