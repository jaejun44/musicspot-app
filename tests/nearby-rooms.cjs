// lib/nearby-rooms.ts: 비공개 연습실 주소로 들어오면 근처 공개 연습실을 대신 보여준다.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

function loadLib(file, cache = {}) {
  if (cache[file]) return cache[file];
  const exports = {};
  cache[file] = exports;
  const source = ts.transpileModule(fs.readFileSync(path.join('lib', `${file}.ts`), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  vm.runInNewContext(source, {
    exports,
    require: (name) => (name.startsWith('./') ? loadLib(name.slice(2), cache) : {}),
  });
  return exports;
}

const { pickNearbyRooms, nearestRegion } = loadLib('nearby-rooms');

const ORIGIN = { lat: 37.5, lng: 127.0 };
// 위도 0.001도 ≈ 111m
const room = (id, dLat, room_type = 'T', extra = {}) => ({ id, lat: ORIGIN.lat + dLat, lng: ORIGIN.lng, room_type, ...extra });

test('월 대여였으면 M·both를 가까운 순으로 먼저, 모자라면 나머지를 가까운 순으로', () => {
  const list = [room('t-near', 0.001), room('m-far', 0.02, 'M'), room('both-mid', 0.01, 'both'), room('t-mid', 0.005)];
  const ids = Array.from(pickNearbyRooms({ ...ORIGIN, room_type: 'M' }, list), (r) => r.studio.id);
  assert.deepEqual(ids, ['both-mid', 'm-far', 't-near', 't-mid']);
});

test('쓰임을 모르면 거리순만, 좌표 없는 곳은 빼고 최대 개수까지', () => {
  const list = [room('b', 0.002), room('nocoord', 0, 'T', { lat: null }), room('a', 0.001, 'M'), room('c', 0.003)];
  const picked = pickNearbyRooms({ ...ORIGIN, room_type: null }, list, 2);
  assert.deepEqual(Array.from(picked, (r) => r.studio.id), ['a', 'b']);
  assert.ok(Math.abs(picked[0].distanceM - 111) <= 1);
});

test('가장 가까운 지역: 기준점 없는 지역은 빼고, 3km 밖이면 없음', () => {
  const region = (slug, dLat) => ({ slug, area: { kind: 'station', name: slug, lat: ORIGIN.lat + dLat, lng: ORIGIN.lng } });
  const regions = [region('far', 0.02), region('near', 0.005), { slug: 'busan' }];
  assert.equal(nearestRegion(ORIGIN.lat, ORIGIN.lng, regions).slug, 'near');
  assert.equal(nearestRegion(ORIGIN.lat, ORIGIN.lng, [region('toofar', 0.05)]), null);
});
