#!/usr/bin/env node
// Check the launcher and package it.
//
//   node tools/build.mjs                  check app/, then write dist/home-<version>-unsigned.wgt
//   node tools/build.mjs --sign <profile> also sign it: dist/home-<version>-<profile>.wgt
//   node tools/build.mjs --icon           re-render app/icon.png from tools/icon.html first
//
// The check fails if the app could reach the network: an <access> origin in
// config.xml, a URL in app code, or any fetch/XHR/WebSocket/beacon call.
// Signing uses a profile from Tizen's Certificate Manager or
// `tizen security-profiles add` (tv-home-tizen is the no-account one).

import { readFileSync, readdirSync, existsSync, mkdirSync, rmSync, statSync, cpSync, renameSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { homedir } from 'node:os';
import { join, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const APP = join(ROOT, 'app');
const DIST = join(ROOT, 'dist');
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const TIZEN = join(homedir(), 'tizen-studio', 'tools', 'ide', 'bin', 'tizen');
const PRIVILEGES = ['application.launch', 'application.info', 'tv.window', 'tv.inputdevice'];
const NETWORK = /https?:\/\/|\bfetch\s*\(|XMLHttpRequest|WebSocket|sendBeacon|EventSource|importScripts/;

const problems = [];
const fail = (msg) => problems.push(msg);

function files(dir) {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? files(path) : [path];
  });
}

if (process.argv.includes('--icon')) {
  const r = spawnSync(CHROME, ['--headless=new', '--disable-gpu', '--hide-scrollbars', '--allow-file-access-from-files',
    '--window-size=512,512', `--screenshot=${join(APP, 'icon.png')}`, `file://${join(ROOT, 'tools', 'icon.html')}`]);
  if (r.status !== 0) fail('icon: Chrome could not render tools/icon.html');
}

// Manifest: identity, privileges, and no network origins.
const config = readFileSync(join(APP, 'config.xml'), 'utf8').replace(/<!--[\s\S]*?-->/g, '');
const [, appId, pkg] = config.match(/<tizen:application id="([^"]+)" package="([^"]+)"/) || [];
const version = (config.match(/<widget[^>]* version="([^"]+)"/) || [])[1];
if (!/^[A-Za-z0-9]{10}$/.test(pkg || '')) fail(`config: package "${pkg}" must be 10 letters or digits`);
if (!appId || !appId.startsWith(pkg + '.')) fail(`config: app id "${appId}" must start with "${pkg}."`);
if (!version) fail('config: missing version');
if (/<access\b/.test(config)) fail('config: <access> grants network origins; the launcher must stay offline');
const privileges = [...config.matchAll(/privilege\/([\w.]+)"/g)].map((m) => m[1]);
for (const p of privileges) if (!PRIVILEGES.includes(p)) fail(`config: unexpected privilege ${p}`);
for (const [, src] of config.matchAll(/<(?:content|icon) src="([^"]+)"/g)) {
  if (!existsSync(join(APP, src))) fail(`config: ${src} is missing`);
}

// App code: no way out to the network, and every referenced file exists.
const code = files(APP).filter((f) => /\.(html|css|js)$/.test(f));
for (const file of code) {
  const text = readFileSync(file, 'utf8');
  text.split('\n').forEach((line, i) => {
    if (NETWORK.test(line)) fail(`network: ${relative(ROOT, file)}:${i + 1}: ${line.trim()}`);
  });
  for (const [, ref] of text.matchAll(/(?:src|href)="([^"#]+)"/g)) {
    if (!existsSync(join(dirname(file), ref))) fail(`files: ${relative(ROOT, file)} points at missing ${ref}`);
  }
  for (const [, , ref] of text.matchAll(/url\(("?)([^")]+)\1\)/g)) {
    if (!existsSync(join(dirname(file), ref))) fail(`files: ${relative(ROOT, file)} points at missing ${ref}`);
  }
}

// Catalog: what each line will open.
const sandbox = { window: {} };
vm.runInNewContext(readFileSync(join(APP, 'catalog.js'), 'utf8'), sandbox);
const items = sandbox.window.CATALOG.flatMap((g) => g.items);
const count = (test) => items.filter(test).length;
const pinned = count((it) => it.appId);
const byName = count((it) => it.kind === 'app' && !it.appId);
const info = count((it) => it.kind === 'info');
const unlinked = count((it) => it.kind === 'system' && !it.appId);
for (const it of items) {
  if (it.kind === 'app' && !it.appId && !it.match) fail(`catalog: ${it.name} has neither appId nor match`);
}

if (problems.length) {
  for (const p of problems) console.error(p);
  process.exit(1);
}

console.log(`config   ${appId} ${version}; privileges: ${privileges.join(', ')}`);
console.log('network  none: no <access> origins, no URLs or network calls in app code');
console.log(`catalog  ${pinned} pinned, ${byName} found by name on the TV, ${info} info, ${unlinked} system lines not linked yet`);

// Package: a .wgt is a zip of app/. Unsigned until phase 2.
mkdirSync(DIST, { recursive: true });
const out = join(DIST, `home-${version}-unsigned.wgt`);
rmSync(out, { force: true });
const zip = spawnSync('zip', ['-q', '-r', '-X', out, '.', '-x', '.DS_Store', '*/.DS_Store'], { cwd: APP });
if (zip.status !== 0) {
  console.error('package: zip failed');
  process.exit(1);
}
console.log(`package  ${relative(ROOT, out)} (${Math.round(statSync(out).size / 1024)} KB), unsigned`);

// Signed package: Samsung's packager on a clean copy of app/. It names the
// file after <name> in config.xml, so rename it to carry version and profile.
const signAt = process.argv.indexOf('--sign');
if (signAt > -1) {
  const profile = process.argv[signAt + 1];
  if (!profile || profile.startsWith('--')) {
    console.error('sign: name a security profile, e.g. --sign tv-home-tizen');
    process.exit(1);
  }
  const stage = join(DIST, 'build');
  const outDir = join(DIST, 'signed');
  const clean = () => {
    rmSync(stage, { recursive: true, force: true });
    rmSync(outDir, { recursive: true, force: true });
  };
  const stop = (msg) => {
    clean();
    console.error(msg);
    process.exit(1);
  };
  clean();
  mkdirSync(outDir, { recursive: true });
  cpSync(APP, stage, { recursive: true, filter: (src) => !src.endsWith('.DS_Store') });
  const r = spawnSync(TIZEN, ['package', '-t', 'wgt', '-s', profile, '-o', outDir, '--', stage], { encoding: 'utf8' });
  const made = readdirSync(outDir).find((f) => f.endsWith('.wgt'));
  if (r.status !== 0 || !made) {
    stop(`sign: tizen package failed\n${(r.stdout + r.stderr).split('\n').filter((l) => !/password/i.test(l)).join('\n')}`);
  }
  // An unknown profile still "succeeds" with an unsigned package, so look.
  const entries = spawnSync('unzip', ['-Z1', join(outDir, made)], { encoding: 'utf8' }).stdout.split('\n');
  if (!entries.includes('author-signature.xml') || !entries.includes('signature1.xml')) {
    stop(`sign: the package has no signatures. Is "${profile}" in \`tizen security-profiles list\`?`);
  }
  const signed = join(DIST, `home-${version}-${profile}.wgt`);
  renameSync(join(outDir, made), signed);
  clean();
  console.log(`signed   ${relative(ROOT, signed)} (${Math.round(statSync(signed).size / 1024)} KB), profile ${profile}`);
}
