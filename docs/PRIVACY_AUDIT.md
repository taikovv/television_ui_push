# TV privacy audit — 2026-10-25

Scope: read-only checks of this TV, its privacy-related native components, selected privacy preference and connection metadata. Native streaming, casting, HDMI and our Home routing remain requirements. No root, packet payload capture, service shutdown, app removal, account changes, DNS changes or router changes were performed.

## Result

**Limit Ad Tracking is independently confirmed on. The TV is not certified tracking-free.** Our launcher remains offline, but the OS and other apps retain network access. The current snapshot cannot establish the purpose or contents of most connections.

| Area | Evidence | Conclusion |
| --- | --- | --- |
| Launcher | v0.4.1 build checks passed: no network origins, remote assets or network request calls in app code | No analytics or outbound requests in our launcher bundle; this says nothing about OS/native apps |
| Advertising preference | Native `adinfo_is_lat_enabled()` returned true | The API reports Limit Ad Tracking enabled |
| Underlying advertising consent | Exact getter implementation was inspected; its consent lookup was independently repeated: status 0, agreement 0, item `syncplus`, category `TV` | Successful lookup with advertising consent off; the reported true result is not merely the getter's error fallback |
| ACR consent | User previously reported Viewing Information Services and other optional privacy controls off | Still user-reported; no independent current ACR-consent value was established by this audit |
| Resident components | Process-name snapshot showed `ACRService`, `adagent-service`, `bixby-prov`, `bixbycapsulevie` | Processes remain resident. Existence is not proof of active recognition, recording or data upload |
| Network | Multiple snapshots showed nonlocal established TCP sockets over IPv4 and IPv6, plus multiple DNS sockets | The device still communicates online; connection purpose/payload is not established |
| Attribution | `netstat` explicitly withheld process information for sockets belonging to other users | No reliable process-to-destination mapping for most sockets at SDK UID 901; no root escalation attempted |
| Home recovery | Native Home readback still points to our launcher with autostart 1 | Privacy probes did not change Home/startup configuration |

## How advertising consent was verified

Samsung documents a public `isLATEnabled()` query. It is distinct from `getTIFA()`, which retrieves an advertising identifier. This audit never called `getTIFA()` or read PSID/TIFA values.

The small native `libadinfo.so` was copied privately for local ABI analysis, not edited or redistributed. Its verified Thumb implementation:

1. Queries the Home Data Control consent API for `syncplus` / `TV`.
2. Returns false when the stored agreement is 1.
3. Returns true otherwise, **including when the consent lookup fails**.

Therefore a true flag alone would not independently establish a successful consent read. The guarded one-shot probe also called that exact underlying read interface and obtained:

```json
{"limitAdTrackingReported":true,"uid":901}
{"item":"syncplus","category":"TV","status":0,"agreement":0,"readSucceeded":true}
```

The binding and ARM32 small-string ABI were checked against this exact library. The diagnostic is guarded to the expected device, exact firmware, SDK UID 901, 32-bit process and the library's SHA-256. A changed library is rejected rather than assuming ABI compatibility. It contains no preference-setting or identifier-reading calls and removes its temporary staged files on exit.

This is an experimental, firmware-specific native diagnostic, not a portable supported privacy API or a general proof about Samsung's conduct. It verifies one advertising preference. It does not independently verify sale/sharing opt-out, every personalization option, ACR runtime capture, diagnostics, streaming-service tracking or whether all components honor the preference.

## What the component inspection established

Located the ACR service under `com.samsung.tv.acr-service-app` and inspected native key/interface names without reading content-recognition results, watching history, credentials or authentication tokens. It references a disclaimer-agreement query and content-recognition interfaces; their names alone do not establish active collection.

The analytics component also references agreement/disagreement handling. No current analytics-consent decision or effective upload behavior was established. Package-directory write checks confirm candidate components are not writable by the SDK user. No package was treated as safe to delete merely because its name mentions analytics or advertising.

## Network evidence and limits

Only the TV's socket metadata was sampled. No office-wide capture was performed. Local connections include the development connection and Samsung's internal services; they must not be counted as internet tracking.

External HTTPS connections cannot be classified as advertising, telemetry, updates, authentication or streaming from port/IP alone. CDN/cloud addresses can serve multiple purposes. CLOSE_WAIT and TIME_WAIT entries are retained connection state, not evidence of a currently transmitting upload. Connected UDP DNS sockets do not prove a query occurred at the instant of the snapshot.

Both address families matter. Future filtering cannot be considered enforced if IPv6 or alternate resolvers remain outside the policy. No hostname inventory, TLS payload inspection, destination blocklist or tracker attribution was produced from these snapshots.

Raw results include the TV's network and peer addresses and remain under ignored `.local/native-home/` / `.local/privacy/`. The repository contains this summary and probe source, not those raw addresses or the firmware library copy. Keep detailed local metadata only as long as needed for review.

## What would increase privacy next

1. **Verify remaining opt-outs individually.** Recheck Viewing Information Services, sale/sharing opt-out, optional voice collection/wake-up, diagnostics and customization after restart/update. User confirmation remains useful but should not be silently upgraded into native readback.
2. **Measure actual destinations for this TV.** A TV-only DNS/gateway observation session is the next substantial evidence improvement. Identify the office network's administrator/platform first; no router configuration is implied by Wi-Fi access.
3. **Filter measured, justified advertising/recognition/analytics endpoints.** Scope policy to the TV, test streaming/authentication/DRM, casting, HDMI and update access after each change, and retain rollback. Cover IPv4, IPv6 and alternate DNS paths. Avoid blanket Samsung/cloud-provider blocks.
4. **Check persistence.** Repeat the consent probe and relevant functionality/network tests after a power cycle and firmware/app updates. No cold reboot was performed during this audit.

No claim of zero tracking is justified while retaining unmeasured native online services. The practical target is explicit opt-outs, minimized optional features, measured restrictions and documented residual traffic.

## Reproduce

Review the code and guards before running:

```sh
dotnet build tools/native-home/PrivacyProbe.csproj -c Release -o .local/native-home/privacy-out
python3 tools/native-home/run.py inspect-privacy
python3 tools/native-home/run.py privacy-query
```

`inspect-privacy-lib` is an optional developer-only read of the small, static advertising library for private ABI verification. It does not retrieve device identifiers. Its base64 output should be retained privately, not pasted into reports. The probe does not depend on keeping that copied library on the TV.

Compilation, shell/Python syntax checks, live native preference reads and launcher offline build checks were completed. No changes to the launcher runtime or its permissions were needed.

## Primary sources

- [Samsung AdInfo API](https://developer.samsung.com/smarttv/develop/api-references/samsung-product-api-references/adinfo-api.html) — Limit Ad Tracking query and advertising identifier are separate operations.
- [Samsung ACR explanation](https://www.samsung.com/us/support/answer/ANS10010616/) — Viewing Information Services is optional and controlled through consent.
- [Samsung SmartTV privacy supplement](https://www.samsung.com/us/info/privacy/smarttv/) — disabling personalized recommendations does not guarantee usage collection stops.
