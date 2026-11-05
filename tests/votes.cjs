// lib/votes.ts: 합주 후보 투표 집계·날짜 표시 (RPC 래퍼는 브라우저 검증)
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

function loadLib(file) {
  const exports = {};
  const source = ts.transpileModule(fs.readFileSync(path.join('lib', `${file}.ts`), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  vm.runInNewContext(source, { exports, require: () => ({}), Date, URLSearchParams, encodeURIComponent });
  return exports;
}

const { tallyVote, formatVoteDate, upcomingDates, topKey, addMyVote, parseAdminHash, buildAdminLink } = loadLib('votes');

const vote = (responses) => ({ studio_ids: ['a', 'b', 'c'], date_options: ['2026-11-07', '2026-11-08'], responses });
const r = (studios, dates = [], slots = []) => ({ picked_studio_ids: studios, picked_dates: dates, picked_slots: slots });

test('후보·날짜·시간대별 표 수, 후보에 없는 값은 세지 않음', () => {
  const t = tallyVote(vote([r(['a', 'b'], ['2026-11-07'], ['evening']), r(['b', 'zzz'], ['2026-11-09'], ['evening', 'night'])]));
  assert.deepEqual({ ...t.studios }, { a: 1, b: 2, c: 0 });
  assert.deepEqual({ ...t.dates }, { '2026-11-07': 1, '2026-11-08': 0 });
  assert.equal(t.slots.evening, 2);
  assert.equal(t.slots.night, 1);
  assert.equal(t.slots.morning, 0);
  assert.deepEqual([...t.leaders], ['b']);
});

test('선두: 동점이면 후보 순서대로 여러 곳, 아무도 안 골랐으면 없음', () => {
  assert.deepEqual([...tallyVote(vote([r(['c']), r(['a'])])).leaders], ['a', 'c']);
  assert.deepEqual([...tallyVote(vote([r([])])).leaders], []);
  assert.deepEqual([...tallyVote(vote([])).leaders], []);
});

test('날짜 표시: 요일 포함, 시간대와 무관', () => {
  assert.equal(formatVoteDate('2026-11-07'), '11/7(토)');
  assert.equal(formatVoteDate('2026-12-31'), '12/31(목)');
});

test('다가오는 날짜: 한국 시간 기준 오늘부터', () => {
  // UTC 11-06 16:00 = KST 11-07 01:00 → 11-07부터
  assert.deepEqual([...upcomingDates(new Date('2026-11-06T16:00:00Z'), 3)], ['2026-11-07', '2026-11-08', '2026-11-09']);
  // UTC 11-06 14:00 = KST 11-06 23:00 → 11-06부터
  assert.equal(upcomingDates(new Date('2026-11-06T14:00:00Z'), 1)[0], '2026-11-06');
});

test('최다 항목: 동점이면 순서 앞쪽, 0표뿐이면 null', () => {
  assert.equal(topKey({ a: 1, b: 2, c: 2 }, ['a', 'b', 'c']), 'b');
  assert.equal(topKey({ a: 0, b: 0 }, ['a', 'b']), null);
  assert.equal(topKey({}, []), null);
});

test('내 투표 목록: 최근 것이 앞, 중복 제거, 최대 개수', () => {
  assert.deepEqual([...addMyVote(['x', 'y'], 'y')], ['y', 'x']);
  assert.deepEqual([...addMyVote(['1', '2', '3'], '4', 3)], ['4', '1', '2']);
});

test('관리 링크 해시: #k=토큰만 읽는다', () => {
  assert.equal(parseAdminHash('#k=abc'), 'abc');
  assert.equal(parseAdminHash('k=abc'), 'abc');
  assert.equal(parseAdminHash(''), null);
  assert.equal(parseAdminHash('#'), null);
  assert.equal(parseAdminHash('#k='), null);
  assert.equal(parseAdminHash('#x=abc'), null);
  assert.equal(parseAdminHash('#reviews'), null);
});

test('관리 링크: 해시에만 토큰, 특수문자는 인코딩 왕복', () => {
  const link = buildAdminLink('https://www.musicspotfest.com', 'v1', 'a+b/c=d&e f#g');
  assert.ok(link.startsWith('https://www.musicspotfest.com/vote/v1#k='));
  assert.ok(!link.includes('?'));
  assert.equal(parseAdminHash(new URL(link).hash), 'a+b/c=d&e f#g');
  assert.equal(parseAdminHash(new URL(buildAdminLink('https://x.test', 'v', 'deadbeef')).hash), 'deadbeef');
});
