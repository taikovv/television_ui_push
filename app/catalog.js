/* What the home screen lists, in order. Edit this file to add, remove or
   reorder lines.

   kind  'app'     opens appId. While appId is null, the app is found by name
                   among the TV's installed apps; no match hides the row.
         'system'  opens a Samsung component. Does nothing until appId is set.

   appIds were read from the TV itself (sdb applist, Tizen 8.0, 2026-10-24).
   Pin them: the TV also lists "-dummy" placeholders with the same names
   (Prime Video, Apple TV) that a name match could pick. */

window.CATALOG = [
  { group: 'listen', items: [
    { name: 'spotify', what: 'music, podcasts', kind: 'app', match: /^spotify/i, appId: 'rJeHak5zRg.Spotify' }
  ]},
  { group: 'watch', items: [
    { name: 'netflix', what: 'films, series', kind: 'app', match: /^netflix$/i, appId: 'org.tizen.netflix-app' },
    { name: 'hulu', what: 'series', kind: 'app', match: /^hulu$/i, appId: 'LBUAQX1exg.Hulu' },
    { name: 'paramount+', what: 'live sport, films', kind: 'app', match: /^paramount\s*\+?$/i, appId: 'rJyOSqC6Up.CBSAllAccess' },
    { name: 'youtube', what: 'everything else', kind: 'app', match: /^youtube$/i, appId: '9Ur5IzDKqV.TizenYouTube' },
    // Only appears when installed on the TV.
    { name: 'max', what: 'hbo', kind: 'app', match: /^(hbo )?max$/i, appId: null },
    { name: 'apple tv', what: 'apple originals', kind: 'app', match: /^apple tv\+?$/i, appId: 'com.samsung.tv.aria-video' },
    { name: 'prime video', what: 'films, series', kind: 'app', match: /prime video/i, appId: 'org.tizen.primevideo' },
    { name: 'disney+', what: 'disney, pixar, marvel', kind: 'app', match: /^disney\s*\+$/i, appId: 'MCmYXNxgcu.DisneyPlus' }
  ]},
  // Filled dynamically from the TV's connected video sources.
  { group: 'inputs', items: [] },
  { group: 'system', items: [
    { name: 'appearance', kind: 'appearance' },
    // Present on this TV, and CleanFrame's Smart Hub target. Check it opens Home on screen.
    { name: 'samsung home', what: 'the old screen', kind: 'system', appId: 'com.samsung.tv.csfs' }
  ]}
];
