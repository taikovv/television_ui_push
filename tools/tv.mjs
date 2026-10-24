#!/usr/bin/env node
// Talk to the Samsung TV over the LAN, using the same API as the SmartThings
// app. No Developer Mode needed. The first app/key command makes the TV show
// an "Allow" prompt; the token it grants is kept in .local/tv.json.
//
//   node tools/tv.mjs find            scan this network for the TV
//   node tools/tv.mjs info            model, firmware, power state
//   node tools/tv.mjs apps            installed apps and their launch IDs
//   node tools/tv.mjs open <appId>    launch an app
//   node tools/tv.mjs key <KEY_…>     press a remote key (KEY_HOME, KEY_VOLUP…)
//
// Set TV_IP to skip the saved address.

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { networkInterfaces } from 'node:os';
import { connect } from 'node:net';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const STATE = join(dirname(fileURLToPath(import.meta.url)), '..', '.local', 'tv.json');
const NAME = Buffer.from('tv-home').toString('base64');

function load() {
  try { return JSON.parse(readFileSync(STATE, 'utf8')); } catch { return {}; }
}

function save(patch) {
  mkdirSync(dirname(STATE), { recursive: true });
  writeFileSync(STATE, JSON.stringify({ ...load(), ...patch }, null, 2) + '\n');
}

function portOpen(host, port) {
  return new Promise((resolve) => {
    const s = connect({ host, port, timeout: 800 });
    s.on('connect', () => { s.destroy(); resolve(true); });
    s.on('timeout', () => { s.destroy(); resolve(false); });
    s.on('error', () => resolve(false));
  });
}

async function info(ip) {
  const res = await fetch(`http://${ip}:8001/api/v2/`, { signal: AbortSignal.timeout(3000) });
  return (await res.json()).device;
}

async function find() {
  const nets = Object.values(networkInterfaces()).flat().filter((n) => n.family === 'IPv4' && !n.internal);
  for (const net of nets) {
    const base = net.address.split('.').slice(0, 3).join('.');
    const hosts = Array.from({ length: 254 }, (_, i) => `${base}.${i + 1}`);
    const open = (await Promise.all(hosts.map(async (h) => ((await portOpen(h, 8001)) ? h : null)))).filter(Boolean);
    for (const ip of open) {
      try {
        const d = await info(ip);
        console.log(`${ip}  ${d.name}  ${d.modelName}  ${d.OS}  ${d.PowerState || ''}`);
        if (/samsung|tizen/i.test(JSON.stringify(d))) {
          save({ ip });
          console.log('Saved to .local/tv.json');
          return;
        }
      } catch {}
    }
  }
  throw new Error('No TV answered on port 8001. Is it on, and on this Wi-Fi (not a guest or IoT network)? Or pass TV_IP=…');
}

// The remote-control channel. The TV's certificate is self-signed.
function session(ip) {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
  const { token } = load();
  const url = `wss://${ip}:8002/api/v2/channels/samsung.remote.control?name=${NAME}` + (token ? `&token=${token}` : '');
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(url);
    const timer = setTimeout(() => { ws.close(); reject(new Error('No answer. If the TV shows an Allow prompt, accept it and run this again.')); }, 30000);
    ws.onmessage = (m) => {
      const msg = JSON.parse(m.data);
      if (msg.event === 'ms.channel.connect') {
        if (msg.data && msg.data.token && msg.data.token !== token) save({ token: msg.data.token });
        clearTimeout(timer);
        resolve(ws);
      } else if (msg.event === 'ms.channel.unauthorized') {
        clearTimeout(timer);
        ws.close();
        reject(new Error('The TV refused. Allow "tv-home" under Settings → General → External Device Manager → Device Connection Manager.'));
      }
    };
    ws.onerror = () => { clearTimeout(timer); reject(new Error(`Could not reach wss://${ip}:8002`)); };
  });
}

function emit(ws, event, data) {
  ws.send(JSON.stringify({ method: 'ms.channel.emit', params: { event, to: 'host', ...(data && { data }) } }));
}

async function apps(ip) {
  const ws = await session(ip);
  const list = await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('The TV did not return its app list.')), 8000);
    ws.onmessage = (m) => {
      const msg = JSON.parse(m.data);
      if (msg.event === 'ed.installedApp.get') { clearTimeout(timer); resolve(msg.data.data); }
    };
    emit(ws, 'ed.installedApp.get');
  });
  ws.close();
  list.sort((a, b) => a.name.localeCompare(b.name));
  for (const a of list) console.log(`${a.appId.padEnd(28)} ${a.name}`);
  save({ apps: list.map(({ appId, name, app_type }) => ({ appId, name, app_type })) });
}

async function open(ip, appId) {
  const known = (load().apps || []).find((a) => a.appId === appId);
  const ws = await session(ip);
  emit(ws, 'ed.apps.launch', { appId, action_type: known && known.app_type === 4 ? 'NATIVE_LAUNCH' : 'DEEP_LINK' });
  setTimeout(() => ws.close(), 500);
}

async function key(ip, code) {
  const ws = await session(ip);
  ws.send(JSON.stringify({ method: 'ms.remote.control', params: { Cmd: 'Click', DataOfCmd: code, Option: 'false', TypeOfRemote: 'SendRemoteKey' } }));
  setTimeout(() => ws.close(), 300);
}

const [cmd, arg] = process.argv.slice(2);
const ip = process.env.TV_IP || load().ip;

try {
  if (cmd === 'find') await find();
  else if (!['info', 'apps', 'open', 'key'].includes(cmd)) console.log('usage: node tools/tv.mjs find | info | apps | open <appId> | key <KEY_…>');
  else if (!ip) throw new Error('No TV saved yet. Run: node tools/tv.mjs find');
  else if (cmd === 'info') console.log(JSON.stringify(await info(ip), null, 2));
  else if (cmd === 'apps') await apps(ip);
  else if (!arg) throw new Error(`${cmd} needs an argument.`);
  else if (cmd === 'open') await open(ip, arg);
  else await key(ip, arg);
} catch (e) {
  console.error(e.message);
  process.exitCode = 1;
}
