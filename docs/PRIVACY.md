# [office_equipment] — make the TV a tool

Written 2026-10-24. Implementation status: user enabled the sale/sharing opt-out and reports all reviewed optional privacy controls off. User also confirmed turning the TV off and on returns to the launcher. Exact consent states have not been independently read back; network measurement/filtering remains deferred.

Latest evidence: [read-only privacy audit, 2026-10-25](PRIVACY_AUDIT.md). Limit Ad Tracking and its underlying advertising opt-out were independently read successfully; zero tracking is not established.

## Intended result

Power on, choose music, films or a connected input, use it, leave. No recommendation feed in our home screen. Reduce Samsung's viewing recognition, advertising identifiers and optional data collection across the TV, including when using HDMI. Preserve native streaming, casting, audio, inputs, maintenance and a recoverable route to Samsung settings.

User-confirmed scope: **keep native online functionality** — our launcher, Samsung opt-outs, removable app cleanup, and measured filtering for this TV alone. On 2026-10-24 the user explicitly declined HDMI-only lockdown. Preserve native streaming and casting; do not deny the TV general internet access.

This plan does not promise that an online Samsung TV or third-party streaming app can be made entirely free of advertising, personalization and telemetry. Removing a visible feed and stopping background collection are separate jobs.

## What is established

| Item | Evidence / constraint |
| --- | --- |
| Hardware | UN55CU7000FXZA; firmware T-KSU2ECAKUC-0080-2024.2; Tizen 8, ARM32 |
| Build | Samsung-signed v0.3.8, app ID WGuqy2ffiw.Home, installed and launched |
| Home | User physically confirmed Home from Netflix returns to our launcher; turning the TV off and on also returns to the launcher (one observed cycle, not a confirmed mains-disconnected cold boot) |
| Launcher privacy | Bundled fonts and offline appearance calculation; build checks reject network origins and request APIs. This describes our bundle, not Samsung's OS or other apps |
| Promotional panel | User observed Spotlight and featured gaming videos in Samsung QuickPanel. Its shortcut was removed from our launcher |
| Discovery | Missing apps are hidden; external inputs appear when reported connected. Actual HDMI switching and casting sessions still need physical verification |
| Network | User says TV is on the office network Wi-Fi. Router vendor, administrator access, DNS controls and any client isolation remain unknown |
| Recovery | Exact native Home restore tested; original snapshot and independent recovery archive retained |

Samsung explicitly says disabling personalized recommendations can leave usage collection active, and disabling interactive marketing does not remove other advertising. Treat the opt-outs as distinct controls, rather than one master privacy switch. [Samsung SmartTV privacy supplement](https://www.samsung.com/us/info/privacy/smarttv/)

## 1. Record a baseline and preserve recovery

Before changing anything:

- Record firmware, installed apps, current privacy choices, network/DNS configuration, startup options and signed-in services. Photograph the actual menu names on this US firmware.
- Run the existing read-only native Home query and save the result with a timestamp. **Never overwrite `.local/native-home/original.json`.** That is the original Samsung Home recovery snapshot, not a scratch baseline.
- Keep the signed working package, author certificate and recovery ZIP. Do not put certificate passwords, streaming credentials or tokens in reports.
- Test the Samsung Home footer escape and the route back. Confirm standby/resume and a cold start when no update is in progress. We have verified the physical Home button from Netflix, not every startup path.

Evidence for the implementation should live under `.local/privacy/`: dated baseline, settings before/after, domain decisions, rule exports, validation and rollback instructions. Domain decisions should include the observed hostname, proposed purpose, supporting evidence, affected scenario, action and result. Installed package names alone do not establish active tracking.

**Deliverable:** a baseline with a working escape route and unchanged Home recovery files.

## 2. Turn off collection and promotional entry points in Samsung settings

Use the TV's actual General & Privacy / Terms & Privacy / Start Screen menus. Names and availability vary; the following are things to locate and verify, not claims that every switch exists on this firmware.

| Control to find | Intended change | Verification |
| --- | --- | --- |
| Viewing Information Services / automatic content recognition (ACR) | Withdraw optional viewing recognition consent | Read back choice after restart; include HDMI in traffic comparison |
| Interest-based advertising | Opt out; reset advertising identifier if exposed | Record both settings separately; identifier reset alone is not an opt-out |
| Personalized recommendations / customization / viewing-history sharing | Disable optional personalization and associated sharing | Check each available consent; don't infer collection stopped from a blank feed |
| Optional diagnostics and marketing consent | Disable optional reporting and marketing | Preserve required service terms if needed for native apps |
| Voice services / Bixby / wake-up | Disable unused optional voice collection and wake-up where supported | Check the actual remote and TV capabilities; retain physical controls |
| Samsung TV Plus autorun | Disable independent TV Plus launch | Test startup and leaving a streaming app |
| Promotional notifications / previews / recommendations | Disable exposed controls | Check for interruption during normal use |
| Samsung account | Inspect whether present and needed; use no account if unnecessary | Do not erase account data or revoke coworkers' app sessions blindly |

Samsung documents a TV Plus autorun control, while noting model differences. Use the exposed control before considering channel deletion; channel deletion can need repeating when Samsung adds channels. [Samsung TV Plus support](https://www.samsung.com/us/support/answer/ANS10000933/)

**Build-specific exception:** do not blindly turn off Smart Hub/Home autostart. Our applied native Home route currently uses `db/menu/smart_hub/ontvsetting/auto_start = 1` with launcher Home/startup IDs. A generic “disable everything smart” checklist could break the desired landing screen. Record and test any startup change individually, and retain the established routing. TV Plus autorun is a separate target.

The Samsung account used to issue our development certificate does not need to be signed into this TV. Third-party app sign-ins are separate; use office-owned profiles where available, rather than a coworker's personal history. Changing or deleting existing histories needs the relevant owner's involvement.

**Deliverable:** a dated list of enabled/disabled/unavailable controls, with startup and streaming still working.

## 3. Measure only this TV's network activity

First identify the router or network administrator for the TV’s network. Wi-Fi access alone does not establish router access. Prefer existing office gateway/resolver facilities; otherwise evaluate an always-on local Pi-hole or AdGuard Home host. A laptop that sleeps is unsuitable as the TV's permanent DNS dependency.

Reserve/identify the TV's IPv4 address and account for IPv6 identities. Capture DNS and, where supported, gateway connection metadata for this client only. Another laptop on the same Wi-Fi does not automatically see the TV's unicast traffic; use the resolver/gateway or an explicitly configured capture point.

Run repeatable baseline sessions:

1. Ten minutes idle in our launcher.
2. Ten minutes on HDMI showing normal office content.
3. Ten minutes of playback in each streaming service actually used, including Spotify.
4. A brief visit to Samsung Home and the unwanted promotional panel for comparison.
5. Standby/resume and a cold start; an overnight idle sample if practical.

Collect hostnames, destinations, timing, success/failure and scenario. No screen/audio capture or TLS interception is needed. Limit detailed logs to the test period (target 24–48 hours), keep them local where possible, then delete detailed history or switch to minimal retention. Configure both database and file logging as applicable; hiding fields in a dashboard is not a complete retention policy. [Pi-hole privacy controls](https://docs.pi-hole.net/ftldns/privacylevels/)

DNS observations are evidence of queries, not a complete inventory of successful uploads. Cached addresses, hard-coded IPs, encrypted DNS and shared service endpoints limit what DNS alone can show.

**Deliverable:** a TV-only traffic inventory with candidate advertising/ACR/analytics endpoints and essential streaming/authentication/update dependencies distinguished by evidence.

## 4. Add filtering for this TV, one change at a time

Use a dedicated TV client/group on the existing managed network or local resolver. Pi-hole supports per-client group policies, so this does not require imposing the TV's restrictions on coworkers. [Pi-hole group examples](https://docs.pi-hole.net/group_management/example/)

Implementation order:

1. Export current DNS/firewall settings and define the TV-only rollback.
2. Test one evidence-backed domain or small coherent category at a time: advertising, ACR, then optional analytics/recommendation services.
3. Repeat the affected baseline scenarios after each change. Record blocked queries, successful connection attempts and any breakage or retry storms.
4. Keep a minimal allowlist for demonstrated dependencies. Preserve authentication, DRM, media delivery, time synchronization, app installation and security maintenance.
5. Verify DNS enforcement over both IPv4 and IPv6 if the gateway supports it. Scope ordinary DNS redirection and encrypted-DNS restrictions to the TV. HTTPS traffic cannot simply be blocked to eliminate DoH without breaking online apps; disclose any remaining bypass rather than claiming complete enforcement.
6. Verify the resolver remains available when the development Mac sleeps. Do not configure an unfiltered public secondary resolver and then claim filtering is enforced.

Do not start with a blanket `*.samsung.com` block, an unreviewed internet blocklist, office-wide IPv6 changes, or guessed permanent IP blocks. Shared endpoints can carry both required functions and optional tracking. Revalidate observed hostnames before adding them; this plan intentionally does not ship a stale “magic” domain list.

Preserve local casting discovery and sessions. Any TV VLAN/client isolation needs the appropriate discovery and session paths; mDNS discovery by itself does not prove AirPlay playback works. Keep the known developer Mac's local recovery path accessible, without exposing it to the internet.

If router access is unavailable, manual TV DNS is a possible limited fallback once the menu and resolver are verified. It lacks the gateway's enforcement and traffic visibility. A public filtering resolver also shifts DNS trust outside the office; evaluate that explicitly rather than silently choosing one.

**Deliverable:** a small documented policy, scoped to the TV, with tested rollback and clear coverage gaps.

## 5. Remove unused apps; investigate protected services conservatively

Remove unused apps that the TV's supported UI actually allows us to remove. Keep required office streaming services, casting, input switching, audio/CEC, settings, certificates, updates and the recovery route.

Samsung's developer FAQ says preinstalled applications cannot be removed. Treat protected components as a platform limit, rather than assuming an uninstall command will work. [Samsung application installation FAQ](https://developer.samsung.com/smarttv/develop/faq/application-installation.html)

The existing inventory includes candidates with names such as `com.samsung.tv.acr`, `com.samsung.tv.iacr`, `com.samsung.tizen.samsung-analytics`, `com.samsung.tv.coba.adagent` and `com.samsung.tv.adagent-service`. These are **investigation leads**, not a deletion list or evidence that each is active. Inspect exact package ownership, running state, exposed controls and dependencies before proposing any service change.

The successful non-root Home helper does not imply permission to disable arbitrary services. Only consider an additional native change if its operation is understood, supported by evidence on this firmware, and has an exact independent restore path. Otherwise rely on consent controls and measured network filtering. No root, filesystem replacement, security-policy edits or firmware patching are part of this plan. Android `adb` / `pm disable-user` recipes do not apply to this Tizen build.

Preserve `com.samsung.tv.csfs` as our Samsung Home fallback. Continue avoiding QuickPanel as the launcher's settings destination. We have not established a clean, reliable direct settings target, and won't label a promotional panel “quick settings.”

**Deliverable:** an app/service decision ledger: removed through UI, disabled through verified control, network-filtered, retained dependency, or unresolved/protected.

## 6. Verify the experience and keep it maintainable

| Test | Acceptance condition |
| --- | --- |
| Home | Returns to our launcher from Netflix, Spotify and other used apps |
| Startup | Three standby/resume cycles and three cold starts land as intended; no promo takeover |
| Escape | Samsung Home/settings remain accessible and Home gets back |
| Streaming | Sign-in, playback, pause and seek work in each retained service; no new stalls or retry loops |
| HDMI | Connect/disconnect updates rows; switching, audio and CEC behave correctly |
| Casting | Real AirPlay and screen-sharing sessions connect and play; footer component detection is not used as proof |
| Appearance | Auto follows daylight with an accurate TV clock; manual overrides persist |
| Privacy settings | Opt-outs survive restart and are documented individually |
| Network | Selected endpoints are blocked; tested essential traffic succeeds; uncovered routes are listed |
| Rollback | Revert a trial filtering rule successfully; settings/network rollback is available independently of Home recovery |

Do not claim “zero tracking” from a quiet query log or a blocked-request count. The final report should say exactly what changed, what traffic was observed, which connections were prevented and what remains outside our control.

Keep a short maintenance checklist: inspect privacy/startup options and filtering after firmware/app updates, then rerun the relevant checks. Retain a security-update path. The Home workaround is firmware-specific; review its guards and preserve recovery before updating, rather than permanently blocking updates to freeze the TV.

## Where the build stops helping

Our launcher controls our home screen and app/input entry points. It does not rewrite Netflix, Spotify or YouTube interfaces, remove their recommendation algorithms, or change their subscription tiers. Inspect each service's own history and personalization controls where useful; don't erase shared history without checking ownership.

DNS filtering can block separate advertising/tracking hostnames, but cannot reliably distinguish ads from videos delivered through the same domains. Native YouTube video ads are a documented example. [AdGuard's explanation of DNS limitations](https://adguard.com/en/article/how-to-block-ads-on-youtube.html)

If Samsung surfaces still carry cached promotions or a service's own UI remains distracting, record that as a remaining limitation. Network blocking can stop delivery without removing a reserved banner space or a cached tile. Do not call an empty tile a fully redesigned system UI.

## First measurement session: observation before blocking

Two different measurements are useful: DNS logs show the names the TV asks to resolve; gateway flow counters show actual connections and byte totals. DNS alone cannot measure total bandwidth or expose encrypted payload contents.

Preferred route with network administrator access: find the TV in the router's client list (last known IPv4 the configured TV address; recheck), filter available flow/DNS logs to that device, and export a short session. Confirm the platform really provides those features before giving router-specific steps.

Alternative when router logging is unavailable:

1. Set up a reachable local Pi-hole resolver on an office host. For a short supervised test a Mac can be used if its runtime and network setup support DNS service; keep it awake. Permanent deployment needs an always-on host.
2. Configure a TV-only group with no blocking rules or inherited/default blocklists. Confirm ordinary resolution works and queries appear with the TV identified separately. If all clients appear as the router, fix attribution before collecting.
3. Photograph the TV's existing DNS settings. In its Network/IP settings, if manual DNS is exposed, enter the resolver's reachable LAN address. Leave the office's router/DHCP configuration and everyone else's DNS unchanged. Verify local firewall/client isolation permits the TV to reach the resolver over UDP and TCP port 53.
4. Watch the query log filtered to the TV. Record start/end times for idle launcher, Spotify, a streaming app and HDMI, around ten minutes each. Export the TV-only results. At this stage answer queries normally; don't add blocking yet.
5. Restore the TV's original DNS setting at the end of a temporary test, before the Mac sleeps or the resolver stops. Confirm streaming still works.
6. Repeat the same scenarios after the privacy settings pass. Compare new names, request rates and, if available, gateway bytes. Classify candidate endpoints with supporting evidence; frequency alone doesn't prove tracking.

Manual DNS changes direct ordinary lookups to the observer but do not guarantee all TV traffic is covered. Cached resolutions, IPv6 DNS and encrypted DNS may bypass the sample. If traffic volume is required and router counters are unavailable, plan an explicit gateway/capture setup later; installing Wireshark on an unrelated Wi-Fi laptop is not enough.

Short detailed logs should cover only the TV and the experiment, with deletion after review. No packet contents, credentials or coworkers' browsing history are required.

## Next execution order

1. Verify startup and the Samsung settings escape; save the baseline.
2. Walk the actual TV privacy menus and apply available opt-outs, preserving our Home route.
3. Identify the administrator/router behind the office network; choose a TV-only logging/filtering path.
4. Measure, filter incrementally, clean removable apps and run the acceptance checks.
5. Deliver the decision ledger, before/after evidence, remaining limits and rollback instructions.

No settings were changed while initially preparing this plan. Subsequently, the user enabled the sale/sharing opt-out and reported all reviewed optional privacy controls off. No app removal, account changes, DNS changes or router rules have been verified. Network work is deferred.
