// lib/candidates.ts: 합주 후보 연습실 목록(최대 5곳, localStorage)
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
  vm.runInNewContext(source, { exports, require: () => ({}) });
  return exports;
}

const { toggleCandidate, parseCandidates, MAX_CANDIDATES } = loadLib('candidates');

test('없으면 끝에 추가, 있으면 해제', () => {
  const a = toggleCandidate([], 'a');
  assert.deepEqual([...a.list], ['a']);
  assert.equal(a.added, true);
  const b = toggleCandidate(['a', 'b'], 'a');
  assert.deepEqual([...b.list], ['b']);
  assert.equal(b.added, false);
  assert.equal(b.full, false);
});

test('최대 5곳: 가득 차면 추가를 거부하고 목록은 그대로, 해제는 된다', () => {
  const five = ['1', '2', '3', '4', '5'];
  assert.equal(MAX_CANDIDATES, 5);
  const r = toggleCandidate(five, '6');
  assert.equal(r.full, true);
  assert.equal(r.added, false);
  assert.deepEqual([...r.list], five);
  assert.deepEqual([...toggleCandidate(five, '3').list], ['1', '2', '4', '5']);
});

test('저장값 복구: 깨진 JSON·배열 아님·문자열 아닌 항목·중복·초과분을 버린다', () => {
  assert.deepEqual([...parseCandidates(null)], []);
  assert.deepEqual([...parseCandidates('{broken')], []);
  assert.deepEqual([...parseCandidates('{"a":1}')], []);
  assert.deepEqual([...parseCandidates('["a",1,"",null,"a","b"]')], ['a', 'b']);
  assert.deepEqual([...parseCandidates('["1","2","3","4","5","6","7"]')], ['1', '2', '3', '4', '5']);
});
