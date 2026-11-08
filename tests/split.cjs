// lib/split.ts: 합주비 1인당 금액 (서버 split_per_person과 같은 규칙: 100원 단위 올림)
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

const { calcPerPerson, splitTotal } = loadLib('split');

test('기본: 1만원 × 2시간 ÷ 4명 = 5,000원', () => {
  assert.equal(calcPerPerson(10000, 2, 4), 5000);
});

test('100원 단위 올림 (서버 로컬 검증과 같은 값)', () => {
  assert.equal(calcPerPerson(7777, 1.5, 4), 3000); // 11,665.5 ÷ 4 = 2,916.4 → 3,000
  assert.equal(calcPerPerson(10000, 2, 3), 6700); // 6,666.7 → 6,700
  assert.equal(calcPerPerson(9000, 2, 4), 4500); // 나누어떨어지면 그대로
  assert.equal(calcPerPerson(1, 0.5, 2), 100); // 0.25원도 100원으로
});

test('추가 비용', () => {
  assert.equal(calcPerPerson(9000, 2, 3, 3000), 7000);
  assert.equal(calcPerPerson(0, 2, 4, 10000), 2500);
});

test('0원', () => {
  assert.equal(calcPerPerson(0, 2, 4), 0);
});

test('경계값: 인원 2~20, 시간 0.5~24·0.5 단위, 금액 음수·총액 100만원 초과 거부', () => {
  assert.equal(calcPerPerson(10000, 2, 2), 10000);
  assert.equal(calcPerPerson(10000, 2, 20), 1000);
  assert.equal(calcPerPerson(10000, 2, 1), null);
  assert.equal(calcPerPerson(10000, 2, 21), null);
  assert.equal(calcPerPerson(10000, 0.5, 4), 1300); // 1,250 → 1,300
  assert.equal(calcPerPerson(10000, 24, 20), 12000);
  assert.equal(calcPerPerson(10000, 0, 4), null);
  assert.equal(calcPerPerson(10000, 24.5, 4), null);
  assert.equal(calcPerPerson(10000, 2.3, 4), null);
  assert.equal(calcPerPerson(-1, 2, 4), null);
  assert.equal(calcPerPerson(10000, 2, 4, -1), null);
  assert.equal(calcPerPerson(500000, 2, 4), 250000); // 총액 정확히 100만원은 허용
  assert.equal(calcPerPerson(500000, 2, 4, 1), null);
  assert.equal(calcPerPerson(10000.5, 2, 4), null);
});

test('총액', () => {
  assert.equal(splitTotal(7777, 1.5), 11666); // 11,665.5 → 반올림 표시
  assert.equal(splitTotal(10000, 2, 3000), 23000);
});
