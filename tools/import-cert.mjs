#!/usr/bin/env node
// Turn a Samsung certificate made on someone else's account into the tv-home
// signing profile. No Samsung account is needed on this Mac.
//
//   node tools/import-cert.mjs <folder>
//
// <folder> holds author.p12 and distributor.p12. Before running, put the
// certificate password in .local/certs/samsung/password (one line). If the
// distributor certificate has its own password, put that in
// .local/certs/samsung/distributor-password.
//
// It refuses to continue unless the distributor certificate lists this TV's
// device ID (duid in .local/tv.json), then copies the files into
// .local/certs/samsung and creates the profile.

import { readFileSync, existsSync, mkdirSync, copyFileSync, chmodSync, readdirSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { homedir } from 'node:os';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const LOCAL = join(ROOT, '.local');
const OUT = join(LOCAL, 'certs', 'samsung');
const TIZEN = join(homedir(), 'tizen-studio', 'tools', 'ide', 'bin', 'tizen');
const PLUGINS = join(homedir(), 'tizen-studio', 'tools', 'certificate-manager', 'Certificate-manager.app', 'Contents', 'Eclipse', 'plugins');
const PROFILE = 'tv-home';
// Samsung's TV ("VD") author CA and public distributor CA, from the
// Samsung Certificate Extension.
const CAS = { author: 'vd_tizen_dev_author_ca.cer', distributor: 'vd_tizen_dev_public2.crt' };

function die(msg) {
  console.error(msg);
  process.exit(1);
}

// The leaf certificate of a .p12 as text, or null if the password is wrong.
// Older Samsung files need OpenSSL's -legacy algorithms.
function certText(p12, password) {
  for (const legacy of [[], ['-legacy']]) {
    const r = spawnSync('openssl', ['pkcs12', '-in', p12, '-nokeys', '-clcerts', '-passin', 'env:P12PW', ...legacy],
      { env: { ...process.env, P12PW: password }, encoding: 'utf8' });
    if (r.status === 0 && r.stdout.includes('BEGIN CERTIFICATE')) {
      return spawnSync('openssl', ['x509', '-noout', '-text'], { input: r.stdout, encoding: 'utf8' }).stdout;
    }
  }
  return null;
}

const src = process.argv[2] && resolve(process.argv[2]);
if (!src) die('usage: node tools/import-cert.mjs <folder with author.p12 and distributor.p12>');
for (const f of ['author.p12', 'distributor.p12']) {
  if (!existsSync(join(src, f))) die(`${f} is missing from ${src}`);
}
const pwFile = join(OUT, 'password');
if (!existsSync(pwFile)) die(`Put the certificate password in ${pwFile} first (one line).`);
const password = readFileSync(pwFile, 'utf8').trim();
const distPwFile = join(OUT, 'distributor-password');
const distPassword = existsSync(distPwFile) ? readFileSync(distPwFile, 'utf8').trim() : password;
const { duid } = JSON.parse(readFileSync(join(LOCAL, 'tv.json'), 'utf8'));
if (!duid) die('No duid in .local/tv.json. Read it with: sdb shell 0 getduid');

// Check both files open, and that the distributor certificate names this TV.
if (!certText(join(src, 'author.p12'), password)) die('author.p12 does not open with that password.');
const dist = certText(join(src, 'distributor.p12'), distPassword);
if (!dist) die('distributor.p12 does not open with that password. If it has its own, put it in distributor-password.');
const devices = [...dist.matchAll(/deviceid=([A-Za-z0-9]+)/g)].map((m) => m[1]);
if (!devices.includes(duid)) {
  die(`distributor.p12 does not list this TV (${duid}). It lists: ${devices.join(', ') || 'no devices'}. Ask for it to be remade with ${duid}.`);
}
console.log(`checked  both certificates open; the distributor certificate lists ${duid}`);

// Copy into private storage, with Samsung's CA certificates beside them.
mkdirSync(OUT, { recursive: true });
chmodSync(OUT, 0o700);
chmodSync(pwFile, 0o600);
if (existsSync(distPwFile)) chmodSync(distPwFile, 0o600);
for (const f of ['author.p12', 'distributor.p12']) {
  if (resolve(src, f) !== resolve(OUT, f)) copyFileSync(join(src, f), join(OUT, f));
  chmodSync(join(OUT, f), 0o600);
}
const jar = readdirSync(PLUGINS).find((f) => f.startsWith('org.tizen.common.cert_') && f.endsWith('.jar'));
if (!jar) die('Samsung Certificate Extension not found. Install cert-add-on with the Tizen package manager.');
const unzip = spawnSync('unzip', ['-o', '-qq', '-j', join(PLUGINS, jar), `res/ca/${CAS.author}`, `res/ca/${CAS.distributor}`, '-d', OUT]);
if (unzip.status !== 0) die('Could not extract Samsung CA certificates from the extension.');

// Replace any earlier tv-home profile, then create it.
const list = spawnSync(TIZEN, ['security-profiles', 'list'], { encoding: 'utf8' }).stdout;
if (new RegExp(`^${PROFILE}\\s`, 'm').test(list)) spawnSync(TIZEN, ['security-profiles', 'remove', '-n', PROFILE]);
const add = spawnSync(TIZEN, ['security-profiles', 'add', '-n', PROFILE,
  '-a', join(OUT, 'author.p12'), '-p', password, '-c', join(OUT, CAS.author),
  '-d', join(OUT, 'distributor.p12'), '-dp', distPassword, '-dc', join(OUT, CAS.distributor)], { encoding: 'utf8' });
if (!/Succeed/i.test(add.stdout)) {
  die(`tizen security-profiles add failed:\n${(add.stdout + add.stderr).split('\n').filter((l) => !/password/i.test(l)).join('\n')}`);
}
console.log(`profile  ${PROFILE} created from ${OUT}`);
console.log('next     node tools/build.mjs --sign tv-home && node tools/install.mjs');
