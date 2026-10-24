/* Launcher appearance only. Auto follows daylight in San Francisco, offline.
   Solar position adapted from SunCalc 1.9.0, (c) 2011-2015 Vladimir Agafonkin.
   See licenses/SunCalc-LICENSE.txt. Sunrise threshold includes disk/refraction.
   City-center location, supplied by the user; no device location is collected. */
(function () {
  'use strict';
  var modes = ['auto', 'light', 'dark'], mode = 'auto';
  try {
    var stored = localStorage.getItem('home.appearance');
    if (stored === 'day') stored = 'light';
    if (stored === 'night') stored = 'dark';
    if (modes.indexOf(stored) >= 0) mode = stored;
  } catch (e) {}
  function cycle(step) {
    mode = modes[(modes.indexOf(mode) + step + modes.length) % modes.length];
    try { localStorage.setItem('home.appearance', mode); return true; }
    catch (e) { return false; }
  }
  function daylight(date) {
    var rad = Math.PI / 180;
    var latitude = 37.7749 * rad, longitude = -122.4194 * rad;
    var days = date.valueOf() / 86400000 + 2440587.5 - 2451545;
    var anomaly = rad * (357.5291 + 0.98560028 * days);
    var center = rad * (1.9148 * Math.sin(anomaly) + 0.02 * Math.sin(2 * anomaly) + 0.0003 * Math.sin(3 * anomaly));
    var ecliptic = anomaly + center + rad * 102.9372 + Math.PI;
    var obliquity = rad * 23.4397;
    var declination = Math.asin(Math.sin(ecliptic) * Math.sin(obliquity));
    var ascension = Math.atan2(Math.sin(ecliptic) * Math.cos(obliquity), Math.cos(ecliptic));
    var hourAngle = rad * (280.16 + 360.9856235 * days) + longitude - ascension;
    var altitude = Math.asin(Math.sin(latitude) * Math.sin(declination) +
      Math.cos(latitude) * Math.cos(declination) * Math.cos(hourAngle));
    return altitude >= -0.833 * rad;
  }
  function dark(date) {
    return mode === 'dark' || (mode === 'auto' && !daylight(date));
  }
  window.Appearance = { get: function () { return mode; }, cycle: cycle, dark: dark };
}());
