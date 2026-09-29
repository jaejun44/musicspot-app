// lib/booking-service.ts: 사이트가 실시간 예약 입구를 띄울지 정하는 곳.
// 실패해도 연습실 상세·파트너 화면을 막지 않아야 하고(입구만 숨긴다), 토큰을 제대로 실어야 한다.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

const API = 'https://api.example.com';
const SITE_ID = '6f1f3c1e-8a55-4d7a-9a55-0c7e2f1d9b10';

function load({ apiUrl = API, fetch }) {
  const exports = {};
  const warnings = [];
  vm.runInNewContext(
    ts.transpileModule(fs.readFileSync('lib/booking-service.ts', 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
    }).outputText,
    {
      exports,
      process: { env: { NEXT_PUBLIC_BOOKING_API_URL: apiUrl } },
      fetch,
      AbortSignal,
      console: { warn: (...args) => warnings.push(args) },
    },
  );
  return { ...exports, warnings };
}

// vm 안에서 만든 배열·객체는 다른 realm이라 deepEqual이 모양이 같아도 다르다고 본다. 평범한 값으로 바꿔 비교한다.
const plain = (value) => JSON.parse(JSON.stringify(value));

const json = (status, body) => ({ status, ok: status >= 200 && status < 300, json: async () => body });

test('예약 서비스 주소가 없으면 묻지 않고 입구를 숨긴다', async () => {
  let called = false;
  const { isRealtimeBookable, fetchManagedStudios } = load({ apiUrl: '', fetch: async () => { called = true; } });
  assert.equal(await isRealtimeBookable(SITE_ID), false);
  assert.deepEqual(plain(await fetchManagedStudios('token')), []);
  assert.equal(called, false);
});

test('이어진 연습실이고 예약받는 방이 있으면 입구를 띄운다', async () => {
  const urls = [];
  const { isRealtimeBookable } = load({
    fetch: async (url) => { urls.push(url); return json(200, { studio: { name: 'A' }, rooms: [{ id: 1 }] }); },
  });
  assert.equal(await isRealtimeBookable(SITE_ID), true);
  assert.equal(urls[0], `${API}/api/studios/by-site/${SITE_ID}`);
});

test('이어지지 않았거나(404) 방이 없으면 숨긴다. 404는 경고하지 않는다', async () => {
  const notLinked = load({ fetch: async () => json(404, {}) });
  const noRooms = load({ fetch: async () => json(200, { studio: { name: 'A' }, rooms: [] }) });
  assert.equal(await notLinked.isRealtimeBookable(SITE_ID), false);
  assert.equal(await noRooms.isRealtimeBookable(SITE_ID), false);
  assert.equal(notLinked.warnings.length, 0);
});

test('예약 서버가 죽어도 던지지 않고 숨기되, 조용히 삼키지 않는다', async () => {
  const down = load({ fetch: async () => { throw new Error('ECONNREFUSED'); } });
  const error = load({ fetch: async () => json(500, {}) });
  assert.equal(await down.isRealtimeBookable(SITE_ID), false);
  assert.equal(await error.isRealtimeBookable(SITE_ID), false);
  assert.equal(down.warnings.length, 1);
  assert.equal(error.warnings.length, 1);
});

test('관리 합주실은 사이트 로그인 토큰을 Bearer로 실어 묻는다', async () => {
  const calls = [];
  const { fetchManagedStudios } = load({
    fetch: async (url, init) => { calls.push({ url, init }); return json(200, { user: {}, studios: [{ studioId: 3, name: '합정점' }] }); },
  });
  assert.deepEqual(plain(await fetchManagedStudios('site-token')), [{ studioId: 3, name: '합정점' }]);
  assert.equal(calls[0].url, `${API}/api/auth/me`);
  assert.equal(calls[0].init.headers.Authorization, 'Bearer site-token');
});

test('관리 합주실 조회가 실패하면 빈 목록이다', async () => {
  const { fetchManagedStudios, warnings } = load({ fetch: async () => json(401, {}) });
  assert.deepEqual(plain(await fetchManagedStudios('expired')), []);
  assert.equal(warnings.length, 1);
});

test('예약 화면 경로는 사이트 연습실 id를 그대로 쓴다', () => {
  const { bookingPath } = load({ fetch: async () => json(200, {}) });
  assert.equal(bookingPath.studio(SITE_ID), `/booking/s/${SITE_ID}`);
  assert.equal(bookingPath.owner, '/booking/owner');
});
