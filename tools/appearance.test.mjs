import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const source = readFileSync(new URL('../app/appearance.js', import.meta.url), 'utf8');
function load(mode = 'auto') {
  const stored = { 'home.appearance': mode };
  const context = { window: {}, localStorage: {
    getItem: key => stored[key], setItem: (key, value) => { stored[key] = value; }
  } };
  vm.runInNewContext(source, context);
  return context.window.Appearance;
}

test('SF daylight varies by season instead of using fixed 7am/8pm boundaries', () => {
  const appearance = load();
  assert.equal(appearance.dark(new Date('2026-01-21T07:00:00-08:00')), true);
  assert.equal(appearance.dark(new Date('2026-01-21T12:00:00-08:00')), false);
  assert.equal(appearance.dark(new Date('2026-06-21T06:00:00-07:00')), false);
  assert.equal(appearance.dark(new Date('2026-06-21T20:00:00-07:00')), false);
  assert.equal(appearance.dark(new Date('2026-10-24T19:00:00-07:00')), true);
});

test('night, DST changes and leap-day dates use real instants', () => {
  const appearance = load();
  for (const time of ['2026-03-08T01:55:00-08:00', '2026-03-08T03:05:00-07:00',
    '2026-11-01T01:55:00-07:00', '2026-11-01T01:05:00-08:00', '2028-02-29T00:00:00-08:00']) {
    assert.equal(appearance.dark(new Date(time)), true, time);
  }
  assert.equal(appearance.dark(new Date('2028-02-29T12:00:00-08:00')), false);
  assert.equal(appearance.dark(new Date('2026-10-24T12:00:00-07:00')),
    appearance.dark(new Date('2026-10-24T19:00:00Z')));
});

test('manual light/dark choices override the sun and remain persisted', () => {
  assert.equal(load('light').dark(new Date('2026-10-24T00:00:00-07:00')), false);
  assert.equal(load('dark').dark(new Date('2026-10-24T12:00:00-07:00')), true);
  const appearance = load();
  appearance.cycle(1);
  assert.equal(appearance.get(), 'light');
  assert.equal(load('day').get(), 'light');
  assert.equal(load('night').get(), 'dark');
});
