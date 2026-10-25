# Experimental Home routing and recovery

Ordinary installation gives you a Samsung Tizen TV app. This optional helper makes that app the physical Home-button destination on the specific TV below. It is an unsupported, non-root method using an SDK package-name command-execution workaround. It does not flash firmware, change security policy, or install a resident service.

## Supported configuration

- Samsung **UN55CU7000FXZA**.
- Tizen **8.0**, **ARMv7 / 32-bit**.
- Firmware **`T-KSU2ECAKUC-0080-2024.2`**.
- SDK user **901**.
- Installed, boot-eligible launcher **`WGuqy2ffiw.Home`**.
- Matching TV DUID in your private `.local/tv.json`.

The scripts and native code enforce platform, device, and firmware checks. Other models and firmware are unverified. Do not bypass a refusal. Native research on another firmware needs its own review and recovery design; changing the guard does not establish compatibility.

Read [`Control.cs`](../tools/native-home/Control.cs), [`run.py`](../tools/native-home/run.py), and [the recovery notes](../tools/native-home/RECOVERY.txt). The helper changes the native Home operation and a Home application setting; exact original settings are needed for restoration. It reads and verifies five configuration values as part of its snapshot and recovery checks.

## Before applying

Finish the standard [installation](../README.md#install-on-your-tv), confirm the launcher opens, and keep Developer Mode working. You need Python 3, the SDK at `~/tizen-studio`, and a compatible .NET SDK capable of building this helper's `net6.0` target. .NET is only for compiling the optional helper, not for the web app. The target is tied to the tested TV runtime; it is not a recommendation to install .NET 6 as a general-purpose system runtime.

Compile from the repository root:

```sh
dotnet build tools/native-home/Control.csproj -c Release -o .local/native-home/out
```

### Capture the original state once

**If this TV has already been modified, use its existing original snapshot. Do not create a new baseline from a modified TV. Never overwrite `.local/native-home/original.json`.**

On a supported TV that still uses Samsung's original Home, query without changing settings:

```sh
python3 tools/native-home/run.py query > .local/native-home/before.txt
```

Check the command succeeded. The output must contain one `TVHOME_JSON=` record from the native helper. The following extraction refuses an existing backup, a non-Samsung Home destination, unexpected keys, or an ineligible runtime/app:

```sh
python3 - <<'PY'
import json
import os
from pathlib import Path

folder = Path('.local/native-home')
records = [line.removeprefix('TVHOME_JSON=')
           for line in (folder / 'before.txt').read_text().splitlines()
           if line.startswith('TVHOME_JSON=')]
if len(records) != 1:
    raise SystemExit('Expected exactly one successful native query record')
state = json.loads(records[0])
keys = {'db/appfw/home_appid', 'db/appfw/startup_appid',
        'db/appfw/booting_appid_backup', 'db/first_screen/type'}
strings = state.get('Strings', {})
if (state.get('Home') != 'com.samsung.tv.csfs'
        or state.get('Uid') != 901 or state.get('BootSupported') != 1
        or state.get('Autostart') not in (0, 1)
        or not isinstance(strings, dict) or set(strings) != keys
        or not all(isinstance(v, str) and v.strip() for v in strings.values())):
    raise SystemExit('Unexpected baseline; stop and review instead of applying')
fd = os.open(folder / 'original.json', os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
with os.fdopen(fd, 'w') as backup:
    backup.write(json.dumps(state, indent=2) + '\n')
print('Saved original.json. Keep an independent private recovery copy.')
PY
```

This extraction needs Python 3.9 or newer. Review the snapshot and privately back it up along with `.local/tv.json`, the compiled `out/` directory, and `tools/native-home/`. Preserve your original author certificate separately for app updates. Do not publish the recovery copy or use another TV's snapshot.

### Apply and verify

Only with a valid original snapshot and the exact supported configuration:

```sh
python3 tools/native-home/run.py apply
python3 tools/native-home/run.py query
```

The native helper checks the baseline before writing and attempts to restore it if applying fails. Inspect the output for a successful `TVHOME_APPLIED=` record; do not infer success only from the runner's exit status. Keep all private evidence under `.local/`.

Physically test Home from another app, the Samsung Home entry in the launcher, and power-off/on behavior. On the original test TV, Home from Netflix and one power-off/on cycle returned to the launcher. That does not establish every cold-boot or firmware-update scenario.

Do not blindly turn off Smart Hub/Home autostart while removing promotional features. The working route depends on its startup configuration. TV Plus autorun is a separate control.

## Restore Samsung Home

**Restore before uninstalling the launcher, changing its app identity, or starting over with a different author certificate.**

```sh
python3 tools/native-home/run.py restore
python3 tools/native-home/run.py query
```

Inspect for `TVHOME_RESTORED=` and matching original values, then test the physical Home button. Restoration was tested on the supported firmware. It needs the original snapshot, compiled helper files, a working SDK connection, and the same firmware guards. It does not need certificate passwords or a .NET SDK on the Mac when compiled outputs are already backed up.

Review recovery before a TV firmware update: a changed firmware can cause the guard to reject restoration. If DHCP changes the TV's address, update only the private IP configuration. Preserve the original snapshot unchanged.

A fresh Git clone deliberately contains no device configuration, original snapshot, compiled helper, or recovery archive. It cannot replace your private recovery backup.

## Attribution

Native Home tooling is adapted from Nathan Clark's CleanFrame, revision `fa537d1892b71d2de2bf94c24cbff3812e9f70d5`. Its [MIT notice](../tools/native-home/CleanFrame-LICENSE.txt) is retained.
