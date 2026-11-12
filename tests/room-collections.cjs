// lib/studio-kinds.ts(배지·밴드 우선 정렬) · lib/room-collections.ts(종류 조합 페이지 고르기) · lib/nearby-rooms.ts 밴드 우선
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
const ids = (list, get = (x) => x) => list.map((x) => get(x).id).join(',');

const { studioBadges, sortByBandRank, danceOnlyLast, isDanceOnly } = loadLib('studio-kinds');
const { pickCollection, getCollection, guCounts, collectionForRegion } = loadLib('room-collections');
const { pickNearbyRooms } = loadLib('nearby-rooms');

test('배지: 최대 2개, 밴드 > 드럼 > 피아노 > 녹음, 보컬은 표시 안 함, 댄스 전용은 없음', () => {
  assert.equal(studioBadges({ kinds: ['band', 'drum', 'piano', 'vocal'], band_rank: 0 }).join('|'), '🎸 밴드 합주|🥁 드럼');
  assert.equal(studioBadges({ kinds: ['vocal', 'recording', 'piano'], band_rank: 1 }).join('|'), '🎹 피아노|🎙️ 녹음');
  assert.equal(studioBadges({ kinds: ['vocal'], band_rank: 1 }).length, 0);
  assert.equal(studioBadges({ kinds: ['vocal', 'dance'], band_rank: 2 }).length, 0);
  assert.equal(studioBadges({ kinds: [], band_rank: 1 }).length, 0);
  assert.ok(isDanceOnly({ band_rank: 2 }));
  assert.ok(!isDanceOnly({})); // 값이 없으면 중간(1)
});

test('밴드 우선 정렬은 안정 정렬, 댄스 전용 뒤로는 기존 순서 유지', () => {
  const list = [
    { id: 'd1', band_rank: 2 }, { id: 'o1', band_rank: 1 }, { id: 'b1', band_rank: 0 },
    { id: 'o2' }, { id: 'b2', band_rank: 0 }, { id: 'd2', band_rank: 2 },
  ];
  assert.equal(ids(sortByBandRank(list, (s) => s)), 'b1,b2,o1,o2,d1,d2');
  assert.equal(ids(danceOnlyLast(list, (s) => s)), 'o1,b1,o2,b2,d1,d2');
});

test('조합 페이지: 종류·구 조건으로 고르고 받은(품질) 순서 유지', () => {
  const studios = [
    { id: 'a', address: '서울 마포구 와우산로 1', kinds: ['band', 'drum'], band_rank: 0 },
    { id: 'b', address: '서울 강남구 테헤란로 1', kinds: ['piano', 'vocal'], band_rank: 1 },
    { id: 'c', address: '서울 마포구 양화로 2', kinds: ['band'], band_rank: 0 },
    { id: 'd', address: '서울 마포구 양화로 3', kinds: ['piano', 'dance'], band_rank: 1 },
    { id: 'e', address: '서울 강남구 논현로 1', kinds: ['dance'], band_rank: 2 },
  ];
  assert.equal(ids(pickCollection(getCollection('seoul-band'), studios)), 'a,c');
  assert.equal(ids(pickCollection(getCollection('seoul-drum'), studios)), 'a');
  assert.equal(getCollection('seoul-piano'), undefined); // 2026-11-13 제외
  assert.equal(ids(pickCollection(getCollection('mapo-band'), [...studios, { id: 'f', address: '서울 강남구 1', band_rank: 0 }])), 'a,c');
  assert.equal(JSON.stringify(guCounts(studios)), JSON.stringify([{ gu: '마포구', count: 3 }, { gu: '강남구', count: 2 }]));
  assert.equal(collectionForRegion('mapo').slug, 'mapo-band');
  assert.equal(collectionForRegion('hongdae'), undefined);
});

test('비공개 연습실 대안 목록도 밴드용 먼저, 같은 등급 안은 가까운 순', () => {
  const origin = { lat: 37.5, lng: 127.0, room_type: 'T' };
  const at = (id, dLat, band_rank) => ({ id, lat: 37.5 + dLat, lng: 127.0, room_type: 'T', band_rank });
  const rooms = pickNearbyRooms(origin, [at('near-dance', 0.001, 2), at('near-piano', 0.002, 1), at('far-band', 0.01, 0), at('mid-band', 0.005, 0)]);
  assert.equal(ids(rooms, (r) => r.studio), 'mid-band,far-band,near-piano,near-dance');
});
