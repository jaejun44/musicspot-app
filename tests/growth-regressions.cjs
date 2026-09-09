const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
function load(file, mocks = {}) {
  const exports = {};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText, { exports, require: name => mocks[name] ?? require(name), URL, URLSearchParams, console });
  return exports;
}
const { getAttribution } = load('lib/analytics/attribution.ts');
test('campaign survives navigation and a new campaign replaces all old fields', () => {
  const map = new Map();
  const storage = { getItem: k => map.get(k), setItem: (k,v) => map.set(k,v) };
  getAttribution('?utm_source=instagram&utm_content=reel1', storage);
  assert.equal(getAttribution('', storage).utm_content, 'reel1');
  getAttribution('?utm_source=kakao', storage);
  assert.equal(getAttribution('', storage).utm_source, 'kakao');
  assert.equal(getAttribution('', storage).utm_content, undefined);
});
test('blocked and malformed storage never breaks attribution', () => {
  const denied = { getItem() { throw Error(); }, setItem() { throw Error(); } };
  assert.equal(getAttribution('?utm_source=test', denied).utm_source, 'test');
  assert.equal(Object.keys(getAttribution('', denied)).length, 0);
  assert.equal(Object.keys(getAttribution('', { getItem: () => '{oops' })).length, 0);
});
function harness(respond) {
  const states = [], calls = [];
  const react = {
    useState(initial) { const i = states.length; states.push(initial); return [initial, v => states[i] = typeof v === 'function' ? v(states[i]) : v]; },
    useRef: current => ({ current }), useCallback: fn => fn,
  };
  const supabase = { from() {
    const call = []; calls.push(call);
    const builder = new Proxy({}, { get: (_, method) => method === 'then'
      ? (resolve, reject) => Promise.resolve(respond(call, calls.length)).then(resolve, reject)
      : (...args) => { call.push([method, ...args]); return builder; } });
    return builder;
  } };
  const { useStudios } = load('hooks/useStudios.ts', {
    react, '@/lib/supabase': { supabase }, '@/lib/region-alias': { expandRegion: v => [v], regionCity: v => v === '홍대' ? '서울' : undefined },
    '@/lib/sort': { sortByDistanceAndQuality: rows => rows.map(s => ({ ...s, distance: 1 })) },
  });
  return { hook: useStudios(), states, calls };
}
test('text search uses true count and commits pagination only after success', async () => {
  let failure = false;
  const h = harness(() => failure ? { error: Error() } : { data: [{ id: 'one' }], count: 42 });
  await h.hook.search({ region: '홍대' });
  assert.equal(h.states[4], 42);
  assert.equal(h.states[3], true);
  failure = true;
  h.hook.loadMore(); await new Promise(setImmediate);
  assert.ok(h.states[2]);
  failure = false;
  h.hook.loadMore(); await new Promise(setImmediate);
  assert.equal(h.calls.at(-1).find(c => c[0] === 'range')[1], 20);
});
test('older search cannot overwrite newer results', async () => {
  const pending = [];
  const h = harness(() => new Promise(resolve => pending.push(resolve)));
  const first = h.hook.search({ region: '홍대' }); await new Promise(setImmediate);
  const second = h.hook.search({ region: '강남' }); await new Promise(setImmediate);
  pending[1]({ data: [{ id: 'new' }], count: 1 }); await second;
  pending[0]({ data: [{ id: 'old' }], count: 1 }); await first;
  assert.equal(h.states[0][0].id, 'new');
});
test('GPS applies drum, price and region filters before distance pagination', async () => {
  const h = harness(() => ({ data: [{ id: 'gps', lat: 37, lng: 127 }], count: 1 }));
  await h.hook.search({ lat: 37, lng: 127, filters: { has_drum: true, max_price: 20000, region: '홍대' } });
  const operations = JSON.stringify(h.calls[0]);
  assert.match(operations, /has_drum/); assert.match(operations, /price_per_hour/); assert.match(operations, /홍대/); assert.match(operations, /서울/);
  assert.equal(h.states[0][0].id, 'gps');
});
test('failed initial search exposes retry instead of stale results', async () => {
  const h = harness(() => ({ error: Error('offline') }));
  await h.hook.search({});
  assert.equal(h.states[1], false); assert.ok(h.states[2]); assert.equal(h.states[0].length, 0);
});
const { externalUrl, kakaoChannelUrl, studioBookingLink } = load('lib/studio-contact.ts');
test('contact URLs accept both channel IDs and full URLs without duplicate domains', () => {
  assert.equal(kakaoChannelUrl('_Abc123'), 'https://pf.kakao.com/_Abc123');
  assert.equal(kakaoChannelUrl('https://pf.kakao.com/_Abc123/chat'), 'https://pf.kakao.com/_Abc123/chat');
  assert.equal(kakaoChannelUrl('https://pf.kakao.com.evil.example/_Abc123'), null);
  assert.equal(externalUrl('javascript:alert(1)'), null);
  assert.equal(studioBookingLink({ source_url: '', naver_place_url: 'https://naver.me/test' }).type, 'naver');
});
test('shared challenge outside latest list is loaded by its ID', async () => {
  let requested;
  const db = { from() { return { select() { return this; }, order() { return this; },
    range: async () => ({ data: [{ id: 'recent' }] }),
    eq(_key, id) { requested = id; return this; }, maybeSingle: async () => ({ data: { id: 'older-shared' } }),
  }; } };
  const { loadStemProjects } = load('lib/stem-project-loader.ts', { '@/lib/supabase': { supabase: db } });
  const result = await loadStemProjects('older-shared');
  assert.equal(requested, 'older-shared');
  assert.equal(result.rows[1].id, 'older-shared');
  assert.equal(result.missing, false);
});
test('challenge network failure is not presented as an empty community', async () => {
  const db = { from() { return { select() { return this; }, order() { return this; },
    range: async () => ({ error: new Error('offline') }),
  }; } };
  const { loadStemProjects } = load('lib/stem-project-loader.ts', { '@/lib/supabase': { supabase: db } });
  await assert.rejects(loadStemProjects(), /offline/);
});

const regions = load('lib/regions.ts');
const regionAlias = load('lib/region-alias.ts', { './regions': regions });
test('region aliases retain city name and disambiguate same-named neighborhoods', () => {
  assert.ok(regionAlias.expandRegion('부산').includes('부산'));
  assert.ok(regionAlias.expandRegion('홍대').includes('합정동'));
  assert.equal(regionAlias.regionCity('홍대'), '서울');
  assert.equal(regionAlias.regionCity('합정'), '서울');
  assert.equal(regionAlias.regionCity('수원'), '수원');
  assert.equal(regionAlias.regionCity('평택 합정동'), undefined);
});
