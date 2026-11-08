// lib/ask-members.ts: "멤버한테 물어보기" 후보 구성 · 문의 후 돌아왔을 때 넛지 판정
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
  // ./candidates 에서는 MAX_CANDIDATES만 쓴다
  vm.runInNewContext(source, { exports, require: () => ({ MAX_CANDIDATES: 5 }), window: {} });
  return exports;
}

const { buildAskCandidates, shouldShowNudge, parseContactOut, parseShown, NUDGE_MIN_MS, NUDGE_MAX_MS } =
  loadLib('ask-members');

test('순서: 현재 → 기존 후보 → 근처(3곳까지)', () => {
  assert.deepEqual(Array.from(buildAskCandidates('cur', [], ['n1', 'n2', 'n3'])), ['cur', 'n1', 'n2']);
  assert.deepEqual(Array.from(buildAskCandidates('cur', ['e1'], ['n1', 'n2'])), ['cur', 'e1', 'n1']);
});

test('기존 후보가 이미 3곳 이상이면 근처는 안 채운다', () => {
  assert.deepEqual(Array.from(buildAskCandidates('cur', ['e1', 'e2'], ['n1'])), ['cur', 'e1', 'e2']);
});

test('중복 제거 — 근처가 기존 후보와 겹쳐도 한 번만', () => {
  assert.deepEqual(Array.from(buildAskCandidates('cur', ['n1'], ['n1', 'n2'])), ['cur', 'n1', 'n2']);
});

test('현재 연습실이 이미 후보에 있으면 맨 앞으로, 한 번만', () => {
  assert.deepEqual(Array.from(buildAskCandidates('cur', ['e1', 'cur'], ['n1'])), ['cur', 'e1', 'n1']);
});

test('최대 5곳', () => {
  const r = buildAskCandidates('cur', ['e1', 'e2', 'e3', 'e4', 'e5'], ['n1']);
  assert.equal(r.length, 5);
  assert.deepEqual(Array.from(r), ['cur', 'e1', 'e2', 'e3', 'e4']);
});

test('근처가 비면 있는 것만', () => {
  assert.deepEqual(Array.from(buildAskCandidates('cur', [], [])), ['cur']);
});

test('넛지: 같은 연습실·10초~30분·이번 세션 처음일 때만', () => {
  const out = { studioId: 's1', at: 1_000_000 };
  assert.equal(shouldShowNudge(out, 's1', out.at + 15_000, []), true);
  assert.equal(shouldShowNudge(out, 's1', out.at + NUDGE_MIN_MS - 1, []), false);
  assert.equal(shouldShowNudge(out, 's1', out.at + NUDGE_MAX_MS + 1, []), false);
  assert.equal(shouldShowNudge(out, 's2', out.at + 15_000, []), false);
  assert.equal(shouldShowNudge(out, 's1', out.at + 15_000, ['s1']), false);
  assert.equal(shouldShowNudge(null, 's1', out.at + 15_000, []), false);
});

test('저장값 파싱: 깨진 값은 비움', () => {
  assert.equal(parseContactOut('{bad'), null);
  assert.equal(parseContactOut('{"studioId":1,"at":2}'), null);
  assert.deepEqual({ ...parseContactOut('{"studioId":"s","at":2}') }, { studioId: 's', at: 2 });
  assert.deepEqual(Array.from(parseShown('["a",1,"b"]')), ['a', 'b']);
  assert.deepEqual(Array.from(parseShown('x')), []);
});
