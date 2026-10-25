# How Samsung detects the audio output

Read-only investigation, 2026-10-25. No audio route, volume, mute, account or firmware setting was changed. No launcher update was deployed for this investigation.

## Verified detection path

Targeted symbol inspection of Samsung's installed native volume application identified:

- `sound_manager_get_speaker_selection` — reads the selected speaker route.
- `sound_manager_set_speaker_changed_cb` / `sound_manager_unset_speaker_changed_cb` — route-change subscription interfaces used by the native panel.
- Native panel helpers `GetSpeakerMode`, `GetReceiverDeviceInfo`, `GetAudioOutSpeakerName` and `GetTVSpeakerName` — distinguish route selection from display names.
- `memory/volume-setting/receiver-device` — the receiver descriptor read by Samsung's components. It contains a device name and icon information; its presence alone does not prove that receiver is the selected output.

A guarded, one-shot SDK-user diagnostic successfully called the getter exported by `libcapi-media-sound-manager-tv.so.0`. The generic `libcapi-media-sound-manager.so.0` does not export this entry point on this firmware.

Observed native result:

```json
{"library":"tv","status":0,"route":0,"uid":901}
```

The user reported TV speakers selected. The receiver descriptor separately contained `A5 Series Soundbar(HDMI)` and a soundbar icon. This directly demonstrates why a stored/available device name must not be treated as the active output.

The native integer was initialized to a sentinel before the call and was actually replaced with 0; it is not a default value being mistaken for successful readback. The result is specific to this unit/firmware. Do not assume an undocumented enum mapping on other models.

## What remains unverified

- The HDMI ARC route value and its transition back to TV speakers. User cannot connect/select the soundbar now; comparative test is deferred.
- Whether the descriptor reflects a currently available device or a remembered device in every state.
- Exact ARC/eARC distinction and combined output modes. The descriptor says HDMI, not a proven ARC/eARC protocol state.
- A standalone way for our signed web launcher to read/subscribe to this native state. The current diagnostic runs through the development connection as SDK UID 901. Its success does **not** mean the web app can directly invoke the native library.

No automatic audio-output label has been added. `tizen.tvaudiocontrol.getOutputMode()` is an audio-format reading, not speaker-route detection. An HDMI video source being connected also does not establish the active audio output.

## Reproduce the read-only check

Review the native sources and runner guards first. Requires this exact firmware, expected DUID in private `.local/tv.json`, SDK connection, and a compatible .NET 6 SDK.

```sh
dotnet build tools/native-home/AudioProbe.csproj -c Release -o .local/native-home/audio-out
python3 tools/native-home/run.py inspect-audio
python3 tools/native-home/run.py audio-query
```

The runner verifies the intended device/platform. The C# probe independently verifies 32-bit SDK UID 901 and the exact firmware, and contains no audio-setting calls. It exits after reading. The shell trap removes the staged probe DLL/runtime metadata; evidence is saved under ignored `.local/native-home/`. It does not replace the existing Home recovery helper or overwrite the original recovery snapshot.

The probe's getter binding is experimentally verified on this firmware, not a documented portable web API. Route-change callback symbols were observed, but subscription behavior was not exercised.

## Next hardware comparison

1. Start with TV speakers selected; save a reading.
2. Connect the soundbar over ARC and select it in Samsung Sound Output. Physically confirm sound through the bar.
3. Query again; record the getter status, selected route and receiver descriptor.
4. Switch back/disconnect and confirm the selected route changes back. Test standby/resume and mute without assuming routing from audible playback alone.
5. Establish a minimal, reliable native-to-web read path before implementing the dynamic label. Keep it offline and avoid a dependency on the development Mac. Any persistent native bridge would be a separate implementation decision; none was installed here.

## Related public documentation

- [Samsung TVAudioControl API](https://developer.samsung.com/smarttv/develop/api-references/tizen-web-device-api-references/tvaudiocontrol-api.html) — public volume/mute/format surface, distinct from the native getter discovered here.
- [Samsung sound-output settings](https://www.samsung.com/sg/support/tv-audio-video/adjust-the-sound-output-on-your-samsung-smart-tv/) — user-selected output concept; model/region menus vary.
