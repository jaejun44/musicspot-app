// lib/region-select.ts: 지역 페이지는 주소 글자가 아니라 역 반경·구로 연습실을 고른다.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

// lib/*.ts를 transpile해서 상대 import('./distance' 등)까지 같은 방식으로 읽는다
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

const { selectRegionRooms, nearbyRegions, regionStats, walkMinutes, nearestHourlyRoom } = loadLib('region-select');

const STATION = { kind: 'station', name: '테스트역', lat: 37.5, lng: 127.0 };
// 위도 0.001도 ≈ 111m
const studio = (id, dLat, extra = {}) => ({
  id,
  name: id,
  address: '서울 마포구 어딘가로 1',
  lat: STATION.lat + dLat,
  lng: STATION.lng,
  has_drum: false,
  price_per_hour: null,
  price_info: null,
  ...extra,
});

test('역 반경: 1km 안이 8곳 이상이면 1km 안만, 받은(품질) 순서 유지', () => {
  const near = Array.from({ length: 8 }, (_, i) => studio(`n${i}`, 0.008 - i * 0.001)); // 0.9km → 0.1km
  const far = studio('far', 0.012); // ≈1.33km
  const { rooms, radiusM } = selectRegionRooms(STATION, [far, ...near]);
  assert.equal(radiusM, 1000);
  assert.deepEqual(rooms.map((r) => r.studio.id), near.map((s) => s.id));
});

test('역 반경: 1km 안이 8곳 미만이면 1.5km로 넓힌다', () => {
  const list = [studio('a', 0.001), studio('b', 0.012), studio('c', 0.02)]; // 0.1 / 1.33 / 2.2km
  const { rooms, radiusM } = selectRegionRooms(STATION, list);
  assert.equal(radiusM, 1500);
  assert.deepEqual(rooms.map((r) => r.studio.id), ['a', 'b']);
});

test('역 반경: 좌표 없는 곳은 뺀다 (도로명 주소여도 좌표만 있으면 잡힌다)', () => {
  const list = [studio('nocoord', 0, { lat: null }), studio('road', 0.001, { address: '서울 서초구 방배로 1' })];
  const { rooms } = selectRegionRooms(STATION, list);
  assert.deepEqual(rooms.map((r) => r.studio.id), ['road']);
});

test('구 기준: 주소에 그 구가 있는 곳만, 받은 순서 유지', () => {
  const list = [
    studio('m1', 0, { address: '서울특별시 마포구 동교동 1' }),
    studio('g1', 0, { address: '서울 강남구 역삼동 1' }),
    studio('m2', 0, { address: '서울 마포구 월드컵로 1' }),
  ];
  const { rooms, radiusM } = selectRegionRooms({ kind: 'gu', gu: '마포구', lat: 0, lng: 0 }, list);
  assert.equal(radiusM, null);
  assert.deepEqual(rooms.map((r) => r.studio.id), ['m1', 'm2']);
});

test('요금 통계: price_per_hour가 없으면 원문의 시간당 N원을 읽는다', () => {
  const rooms = [
    { studio: studio('a', 0, { price_info: '시간당 3,000원~ / 패키지 10,000원~', has_drum: true }), distanceM: 1 },
    { studio: studio('b', 0, { price_info: '시간당 5,000원~' }), distanceM: 1 },
    { studio: studio('c', 0, { price_info: '월 30만원' }), distanceM: 1 },
    { studio: studio('d', 0, { price_per_hour: 9000 }), distanceM: 1 },
  ];
  const s = regionStats(rooms);
  assert.equal(s.total, 4);
  assert.equal(s.drum, 1);
  assert.equal(s.pricedCount, 3);
  assert.equal(s.minPrice, 3000);
  assert.equal(s.medianPrice, 5000);
});

test('도보 분: 최소 1분, 직선거리를 길 꺾임만큼 보정', () => {
  assert.equal(walkMinutes(0), 1);
  assert.equal(walkMinutes(700), 13); // 700 × 1.3 / 70
});

test('가까운 동네: 자기 자신·기준점 없는 지역은 빼고 가까운 순', () => {
  const r = (slug, lat) => ({ slug, label: slug, keyword: slug, city: '서울', area: { kind: 'station', name: slug, lat, lng: 127 } });
  const all = [r('self', 37.5), r('far', 37.6), r('near', 37.51), { slug: 'busan', label: '부산', keyword: '부산', city: '부산' }];
  assert.deepEqual(nearbyRegions(all[0], all).map((x) => x.slug), ['near', 'far']);
});

test('가장 가까운 시간제 합주실: 시간당 요금이 없는 곳(월세 작업실 등)은 건너뛴다', () => {
  const rooms = [
    { studio: studio('monthly', 0, { price_info: '월세 85 / 85만' }), distanceM: 50 },
    { studio: studio('hourly-far', 0, { price_info: '시간당 5,000원~' }), distanceM: 400 },
    { studio: studio('hourly-near', 0, { price_info: '시간당 4,000원~' }), distanceM: 200 },
  ];
  assert.equal(nearestHourlyRoom(rooms).studio.id, 'hourly-near');
  assert.equal(nearestHourlyRoom([rooms[0]]), null);
});
