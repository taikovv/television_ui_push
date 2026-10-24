import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const context = { window: {} };
for (const name of ['catalog', 'library']) {
  vm.runInNewContext(readFileSync(new URL(`../app/${name}.js`, import.meta.url), 'utf8'), context);
}
const { Library, CATALOG } = context.window;
const groups = (apps, sources = []) => JSON.parse(JSON.stringify(Library.groups(CATALOG, apps, sources, false)));
const names = (result) => result.flatMap((group) => group.items.map((item) => item.name));

test('missing apps and empty sections disappear, while system recovery stays', () => {
  const visible = groups([{ id: 'org.tizen.netflix-app', name: 'Netflix' }]);
  assert.ok(names(visible).includes('netflix'));
  assert.ok(!names(visible).includes('max'));
  assert.ok(!visible.some((group) => group.group === 'listen' || group.group === 'inputs'));
  assert.ok(names(visible).includes('samsung home'));
});

test('name discovery ignores dummy placeholders and pinned IDs never fall back', () => {
  assert.ok(!names(groups([{ id: 'max-dummy', name: 'Max' }, { id: 'other', name: 'Netflix' }])).includes('max'));
  assert.ok(!names(groups([{ id: 'other', name: 'Netflix' }])).includes('netflix'));
  assert.ok(names(groups([{ id: 'real-max', name: 'Max' }])).includes('max'));
});

test('only connected external sources appear, deduplicated and sorted', () => {
  const visible = groups([], [
    { type: 'HDMI', number: 2 }, { type: 'TV', number: 1 },
    { type: 'HDMI', number: 1 }, { type: 'HDMI', number: 2 }, { type: 'MEDIA', number: 1 }
  ]);
  assert.deepEqual(visible.find((g) => g.group === 'inputs').items.map((i) => i.name), ['hdmi 1', 'hdmi 2']);
  assert.ok(!groups([]).some((g) => g.group === 'inputs'));
});

test('stable focus keys survive app insertion and input reordering', () => {
  const source = { type: 'HDMI', number: 2 };
  const input = groups([], [source]).find((g) => g.group === 'inputs').items[0];
  assert.equal(Library.key(input), 'input:HDMI:2');
  assert.equal(Library.key({ kind: 'app', appId: 'netflix', name: 'renamed' }), 'app:netflix');
});

test('casting note distinguishes detected components from health and unknown inventory', () => {
  const detected = Library.castingStatus([
    { id: 'com.samsung.tv.airplay-service-2' }, { id: 'org.tizen.ScreenMirroring-app-tv' }
  ], false);
  assert.equal(detected, 'airplay: detected · screen mirroring: detected · live status unavailable');
  assert.ok(Library.castingStatus(null, false).includes('status unknown'));
  assert.ok(Library.castingStatus([{ id: 'com.samsung.tv.airplay-app-2-dummy' }], false).includes('airplay: not detected'));
  assert.ok(Library.castingStatus(null, true).includes('preview'));
  assert.ok(!names(groups([])).some((name) => /airplay|screen mirror/i.test(name)));
});
