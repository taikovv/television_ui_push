#!/usr/bin/env node
// Install the signed launcher on the TV over Developer Mode, then open it.
//
//   node tools/install.mjs [package.wgt]
//
// Uses the TV address in .local/tv.json and, unless a package is named, the
// newest Samsung tv-home package in dist/. The TV needs Developer Mode on with this
// Mac's IP as Host PC IP.

import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { homedir } from 'node:os';
import { join, dirname, basename, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DIST = join(ROOT, 'dist');
const SDB = join(homedir(), 'tizen-studio', 'tools', 'sdb');
const TIZEN = join(homedir(), 'tizen-studio', 'tools', 'ide', 'bin', 'tizen');
const APP_ID = readFileSync(join(ROOT, 'app', 'config.xml'), 'utf8').match(/<tizen:application id="([^"]+)"/)[1];

// What the TV's installer errors mean, in plain words.
const HINTS = {
  '118, -12': 'The TV does not accept this certificate. It needs a Samsung certificate that lists this TV\'s device ID.',
  '118, -11': 'A copy signed by a different author is already installed. Remove it first: tizen uninstall -p ' + APP_ID,
  '118, -13': 'The package uses a privilege the certificate does not allow.'
};

function die(msg) {
  console.error(msg);
  process.exit(1);
}

const run = (cmd, args) => spawnSync(cmd, args, { encoding: 'utf8' });

const { ip } = JSON.parse(readFileSync(join(ROOT, '.local', 'tv.json'), 'utf8'));
const serial = `${ip}:26101`;

let pkg = process.argv[2] && resolve(process.argv[2]);
if (!pkg) {
  const signed = readdirSync(DIST)
    .filter((f) => /^home-.+-tv-home\.wgt$/.test(f))
    .map((f) => join(DIST, f))
    .sort((a, b) => statSync(b).mtimeMs - statSync(a).mtimeMs);
  pkg = signed[0];
}
if (!pkg || !existsSync(pkg)) die('No Samsung-signed tv-home package. Import the Samsung certificate, then run: node tools/build.mjs --sign tv-home');
const entries = run('unzip', ['-Z1', pkg]);
const names = entries.stdout.split(/\r?\n/);
if (entries.status !== 0 || !names.includes('author-signature.xml') || !names.includes('signature1.xml')) {
  die('This package is unsigned or unreadable. Run: node tools/build.mjs --sign tv-home');
}

// sdb sometimes needs a fresh server before it will connect.
const connected = () => run(SDB, ['devices']).stdout.split(/\r?\n/)
  .some((line) => line.trim().split(/\s+/)[0] === serial && line.trim().split(/\s+/)[1] === 'device');
run(SDB, ['connect', serial]);
if (!connected()) {
  run(SDB, ['kill-server']);
  run(SDB, ['start-server']);
  run(SDB, ['connect', serial]);
}
if (!connected()) die(`Can't reach ${serial}. Is the TV on, with Developer Mode pointing at this Mac?`);
console.log(`install  ${basename(pkg)} → ${serial}`);

const res = run(TIZEN, ['install', '-n', basename(pkg), '-s', serial, '--', dirname(pkg)]);
const out = res.stdout + res.stderr;
const failed = out.match(/install failed\[([^\]]+)\][^\n]*/);
if (failed) die(`The TV refused it: ${failed[0].trim()}\n${HINTS[failed[1]] || ''}`);
if (!/install completed|successfully installed|Installed the package/i.test(out)) die(`Unclear result from the TV:\n${out}`);
console.log(`ok       installed ${APP_ID}`);

const launch = run(TIZEN, ['run', '-p', APP_ID, '-s', serial]);
if (launch.status !== 0 || /fail|error/i.test(launch.stdout)) die(`Installed, but it did not open:\n${launch.stdout}${launch.stderr}`);
console.log('ok       opened on the TV');
