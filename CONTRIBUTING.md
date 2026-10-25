# Contributing to UTILITY

Thanks for helping make shared TVs quieter and more useful. The most valuable contributions are tested compatibility reports, reliable app/input discovery, accessibility improvements, and clear installation instructions.

## Test a change

Use Node.js 22 or newer. The app uses bundled assets and ES5-compatible browser JavaScript for the TV runtime. It has no npm runtime dependencies.

```sh
node --test tools/appearance.test.mjs tools/library.test.mjs
node tools/build.mjs
```

Open `app/index.html` to inspect the interface. Optional Playwright checks are documented in the [README](README.md#development); browser fixtures do not establish TV compatibility.

Preserve remote focus, predictable Back behavior, installed-app filtering, connected-input discovery, and offline operation. Avoid recommendation feeds, analytics, remote assets, and unnecessary menu rows. Respect reduced motion. Keep all third-party notices.

## Report compatibility

Use the compatibility issue template. Include model, region, Tizen version, firmware, and which operations you physically tested. Distinguish:

- Web app install and launch.
- Installed-app discovery and launch.
- Connected-input discovery and actual HDMI switching.
- Volume and mute while the launcher is visible.
- Standby/resume and a cold start, if tested.
- Native Home routing, only where already supported and reviewed.

A browser screenshot or a successful build alone does not confirm these behaviors. Do not bypass native helper guards to test another firmware; propose a reviewed port with recovery designed first.

## Keep device data private

Never commit certificates, signing passwords, `.local/`, device IDs, local network addresses, account data, recovery snapshots, packet captures, or raw TV probe output. Redact these from issues and screenshots too. Report security-sensitive findings through the channel in [SECURITY.md](SECURITY.md).

Changes to native settings, command-execution transport, or ABI-specific probes require particular care. Explain exact firmware support, evidence, failure behavior, and recovery. Prefer read-only investigation before settings writes. Keep native experiments separate from ordinary web-app installation.

By contributing, you agree to license your original contribution under this repository's MIT license. Existing third-party components retain their own licenses.
