# CRT volume — scope and investigation

2026-10-25. User now explicitly accepts a launcher-only version; the earlier global-only constraint is superseded.

## What is implemented

Version 0.4.1 uses bundled Heros, orange #ff7700, static glow/scanlines, 24 bars which become dots as the level decreases, a numeric TV reading, mute state, and a 2.2-second dismissal. No new selectable menu or duplicate settings page.

On foreground entry, actual volume/mute readings must be valid before volume keys are registered. All three keys must register; partial registration is rolled back. Keys request one actual step or mute toggle, then read back the result. If control/readback fails, the OSD hides and key registrations are released. Backgrounding releases keys/listener/timer and clears the popup. Returning samples the current state without replaying an old popup. Volume events cover external level changes; a foreground-only 750ms poll covers mute changes, which have no audio-volume callback.

Only public `tv.inputdevice` privilege was added. The old `tv.audio` privilege is documented as deprecated since Tizen 5; this Tizen 8 build does not request it. No platform/system privileges, root, service replacement or persistent native helper were added.

A browser preview is explicitly labelled and uses simulated values: V shows the bar, +/- steps and M toggles mute. A TV with missing/unavailable audio API never substitutes simulated levels. TV readback may not represent an external receiver's independent volume; external output and native-panel behavior need physical validation.

## What deeper inspection established

The installed native `org.tizen.volume-app` manifest marks it `readonly=true`, `removable=false`, internal-only and preloaded. Its UI application is hidden from the app list and uses platform key-grab/window-priority privileges. App-context rules force-launch it for native volume up/down/mute keys. The SDK user cannot write its component directory.

This explains why styling the launcher is different from replacing the global OSD. Public web input-key registration is the route used here; it does not establish the ability to replace Samsung's privileged system overlay. Whether registering foreground volume keys prevents the native panel from appearing on this exact firmware is a physical test, not something claimed from a simulated browser.

Private probe output remains under ignored `.local/native-home/`. No native component was edited, stopped, removed or remapped. The only TV change is the signed launcher update.

## Validation

Eight existing logic tests pass. Existing browser navigation/input and loading recovery tests pass. New simulated-TV browser checks cover one step per key, real API readback, mute, 0/100 boundaries, foreground/background cleanup, no stale popup, read failure, partial registration rollback, native fallback and dismissal. Preview was visually inspected.

The signed 0.4.1 package installed and opened successfully. User confirmed the custom bar says “muted,” while Samsung’s native mute popup also appears. This verifies custom key response/display, not native-panel suppression or every audio/output configuration. The bar was moved from the left to horizontal center near the bottom, with an exact geometry assertion in the browser check.

A further read-only symbol/path inspection found mute-specific native banner handlers, a master-mute callback, and internal display-state keys. No semantics or independent suppression control was established, and no internal settings were written. One broad symbol read timed out; a bounded targeted path scan completed. SDB refused a direct binary pull; no binary was exported or published. Global volume styling and suppressing Samsung’s mute indicator remain unresolved, with no verified non-root implementation.

## Sources

- [Samsung TVAudioControl API](https://developer.samsung.com/smarttv/develop/api-references/tizen-web-device-api-references/tvaudiocontrol-api.html)
- [Samsung remote-control key registration](https://developer.samsung.com/smarttv/develop/guides/user-interaction/remote-control.html)

## Audio-output detection follow-up

A later read-only investigation successfully read the selected native speaker route as SDK UID 901. Samsung reads receiver names separately, and a receiver name was present while TV speakers were selected. See [audio-output investigation](AUDIO_OUTPUT.md) for the exact mechanism, live result, probe and remaining native-to-web bridge work. No dynamic source label is deployed.
