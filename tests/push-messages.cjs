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
const { responseEvent, decidedEvent, voteResponsePayload, voteDecidedPayload, RESPONSE_WINDOW_MS } = loadLib('push-messages', {
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
