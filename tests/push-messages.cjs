// lib/push-messages.ts: 알림 문구·중복 방지 키
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

function loadLib(file, deps = {}) {
  const exports = {};
  const source = ts.transpileModule(fs.readFileSync(path.join('lib', `${file}.ts`), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  vm.runInNewContext(source, { exports, require: (m) => deps[m] ?? {}, process: { env: {} }, URL });
  return exports;
}

const shareUtm = loadLib('share-utm');
const { responseEvent, decidedEvent, voteResponsePayload, voteDecidedPayload, RESPONSE_WINDOW_MS, kstTomorrow, reminderEvent, rehearsalReminderPayload, unpaidPayload, UNPAID_EVENT } = loadLib('push-messages', {
  '@/lib/share-utm': shareUtm,
});

test('응답 알림 키: 같은 10분 구간이면 같은 키, 넘어가면 새 키', () => {
  const t = Date.UTC(2026, 10, 8, 12, 0, 0);
  assert.equal(responseEvent(new Date(t)), responseEvent(new Date(t + RESPONSE_WINDOW_MS - 1)));
  assert.notEqual(responseEvent(new Date(t)), responseEvent(new Date(t + RESPONSE_WINDOW_MS)));
  assert.match(responseEvent(new Date(t)), /^response:\d+$/);
});

test('결정 알림 키: 연습실마다 다름', () => {
  assert.equal(decidedEvent('s1'), 'decided:s1');
  assert.notEqual(decidedEvent('s1'), decidedEvent('s2'));
});

test('문구: 같은 사이트 경로 + push UTM, 이름 없음', () => {
  const r = voteResponsePayload('v1', 3);
  assert.equal(r.url, '/vote/v1?utm_source=push&utm_medium=share&utm_campaign=vote&utm_content=response');
  assert.match(r.body, /3명/);
  assert.equal(r.tag, 'vote-v1');
  const d = voteDecidedPayload('v1', '드럼에비뉴');
  assert.equal(d.url.startsWith('/vote/v1?utm_source=push'), true);
  assert.match(d.body, /드럼에비뉴/);
  assert.match(voteDecidedPayload('v1', null).body, /^연습실/);
});

test('내일(KST): Cron 11:00 UTC = 20:00 KST, 자정 넘으면 하루 더', () => {
  assert.equal(kstTomorrow(new Date('2026-11-08T11:00:00Z')), '2026-11-09');
  assert.equal(kstTomorrow(new Date('2026-11-08T14:59:00Z')), '2026-11-09'); // KST 23:59
  assert.equal(kstTomorrow(new Date('2026-11-08T15:00:00Z')), '2026-11-10'); // KST 00:00
  assert.equal(kstTomorrow(new Date('2026-12-31T11:00:00Z')), '2027-01-01');
  assert.equal(reminderEvent('2026-11-09'), 'reminder:2026-11-09');
});

test('전날·미납 문구: 시간대·금액, 링크 UTM, 이름 없음', () => {
  const r = rehearsalReminderPayload('v1', '드럼에비뉴', 'evening');
  assert.equal(r.title, '🥁 내일 저녁 합주예요');
  assert.equal(r.url, '/vote/v1?utm_source=push&utm_medium=share&utm_campaign=vote&utm_content=reminder');
  assert.equal(rehearsalReminderPayload('v1', null, null).title, '🥁 내일 합주예요');
  const u = unpaidPayload('s1', 11000);
  assert.match(u.body, /11,000원/);
  assert.equal(u.url, '/split/s1?utm_source=push&utm_medium=share&utm_campaign=split&utm_content=unpaid');
  assert.equal(UNPAID_EVENT, 'unpaid');
});
