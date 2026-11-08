// lib/push.ts: VAPID 키 변환·구독 대상 목록(localStorage ms_push_topics) 순수 함수
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
  vm.runInNewContext(source, { exports, require: () => ({}), process: { env: {} }, atob, Uint8Array });
  return exports;
}

const { base64UrlToBytes, nextTopics, topicKey, getPushSupport } = loadLib('push');

test('base64url → 바이트 (패딩 없는 VAPID 공개키 65바이트)', () => {
  const bytes = Buffer.alloc(65, 7);
  bytes[0] = 4;
  const b64url = bytes.toString('base64url');
  assert.equal(b64url.includes('='), false);
  assert.deepEqual(Array.from(base64UrlToBytes(b64url)), Array.from(bytes));
  assert.deepEqual(Array.from(base64UrlToBytes('-_8')), [0xfb, 0xff]); // - _ 문자 변환
});

test('구독 대상 목록: 추가·중복·해제', () => {
  const k = topicKey('vote', 'abc');
  assert.equal(k, 'vote:abc');
  assert.deepEqual(Array.from(nextTopics([], k, true)), [k]);
  assert.deepEqual(Array.from(nextTopics([k], k, true)), [k]);
  assert.deepEqual(Array.from(nextTopics([k, 'split:x'], k, false)), ['split:x']);
});

test('구독 대상 목록: 잘못된 저장값 복구 · 최대 50개(오래된 것부터 버림)', () => {
  assert.deepEqual(Array.from(nextTopics('oops', 'vote:a', true)), ['vote:a']);
  assert.deepEqual(Array.from(nextTopics([1, null, 'vote:b'], 'vote:a', true)), ['vote:b', 'vote:a']);
  const many = Array.from({ length: 50 }, (_, i) => `split:${i}`);
  const next = Array.from(nextTopics(many, 'vote:new', true));
  assert.equal(next.length, 50);
  assert.equal(next[0], 'split:1');
  assert.equal(next[49], 'vote:new');
});

test('VAPID 공개키가 없거나 서버 렌더면 unsupported', () => {
  assert.equal(getPushSupport(), 'unsupported');
});
