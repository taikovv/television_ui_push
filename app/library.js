/* Visible rows are derived from installed apps and connected video inputs.
   Pure ES5 so discovery and focus can be tested without a TV or a DOM. */
(function () {
  'use strict';
  function key(item) {
    return item.kind === 'input' ? 'input:' + item.source.type + ':' + item.source.number
      : item.kind + ':' + (item.appId || item.name);
  }
  function groups(catalog, apps, sources, preview) {
    var result = [], i, j, k;
    for (i = 0; i < catalog.length; i++) {
      var group = { group: catalog[i].group, items: [] };
      if (group.group === 'inputs') {
        var seen = {};
        for (j = 0; j < sources.length; j++) {
          var source = sources[j];
          if (!/^(HDMI|AV|SVIDEO|COMP|PC|SCART|DVI)$/.test(source.type)) continue;
          var id = source.type + ':' + source.number;
          if (seen[id]) continue;
          seen[id] = true;
          group.items.push({ name: source.type.toLowerCase() + ' ' + source.number,
            what: 'input', kind: 'input', source: source });
        }
        group.items.sort(function (a, b) {
          return a.source.type.localeCompare(b.source.type) || a.source.number - b.source.number;
        });
      } else {
        for (j = 0; j < catalog[i].items.length; j++) {
          var item = catalog[i].items[j], target = item.appId || null;
          if (item.kind === 'app') {
            var hit = null;
            for (k = 0; apps && k < apps.length; k++) {
              var app = apps[k];
              if (/-dummy$/i.test(app.id)) continue;
              if (item.appId ? app.id === item.appId : item.match && item.match.test(app.name)) {
                hit = app;
                break;
              }
            }
            if (!hit && !(preview && item.appId)) continue;
            target = hit ? hit.id : item.appId;
          }
          if (item.kind === 'system' && !target) continue;
          var copy = {};
          for (var prop in item) if (Object.prototype.hasOwnProperty.call(item, prop)) copy[prop] = item[prop];
          copy.target = target;
          group.items.push(copy);
        }
      }
      if (group.items.length) result.push(group);
    }
    return result;
  }
  // Installed components are evidence of support, not a receiver health check.
  // Samsung does not expose live AirPlay/Miracast state through these APIs.
  function castingStatus(apps, preview) {
    if (preview) return 'airplay + screen mirroring: preview';
    if (apps === null) return 'airplay + screen mirroring: status unknown';
    var airplay = false, mirror = false;
    for (var i = 0; i < apps.length; i++) {
      var id = apps[i].id;
      if (/^com\.samsung\.tv\.airplay-(app|service)(-\d+)?$/.test(id)) airplay = true;
      if (id === 'org.tizen.ScreenMirroring-app-tv') mirror = true;
    }
    return 'airplay: ' + (airplay ? 'detected' : 'not detected') +
      ' · screen mirroring: ' + (mirror ? 'detected' : 'not detected') + ' · live status unavailable';
  }
  window.Library = { groups: groups, key: key, castingStatus: castingStatus };
}());
