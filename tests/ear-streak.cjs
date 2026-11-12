// lib/ear/streak.ts: 오늘의 음감 기록·연속·공유 텍스트
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

// vm 안에서 만든 배열·객체는 다른 realm이라 deepEqual 전에 평범한 값으로
const plain = (v) => JSON.parse(JSON.stringify(v));
const same = (a, b) => assert.deepEqual(plain(a), plain(b));

function loadLib(file, deps = {}) {
  const exports = {};
  const source = ts.transpileModule(fs.readFileSync(path.join('lib', `${file}.ts`), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  vm.runInNewContext(source, { exports, require: (m) => deps[m] ?? {}, process: { env: {} } });
  return exports;
}

const { emptyRecord, parseRecord, addAnswer, currentStreak, prevDate, isDone, hasPlayed, buildShareText } = loadLib('ear/streak');

/** 하루 5문제를 marks대로 푼다 */
function solve(record, date, marks = [true, true, true, true, true]) {
  return marks.reduce((r, ok, i) => addAnswer(r, date, `p${i}`, ok), record);
}

test('하루 5문제를 다 풀어야 연속 1, 다음 날 풀면 2', () => {
  let r = emptyRecord();
  r = addAnswer(r, '2026-11-12', 'a', true);
  assert.equal(r.current, 0);
  assert.equal(r.last, null);
  assert.equal(hasPlayed(r), false);
  r = solve(emptyRecord(), '2026-11-12');
  assert.equal(r.current, 1);
  assert.equal(r.best, 1);
  assert.ok(isDone(r.days['2026-11-12']));
  r = solve(r, '2026-11-13');
  assert.equal(r.current, 2);
  assert.equal(r.best, 2);
  assert.equal(currentStreak(r, '2026-11-13'), 2);
  assert.equal(currentStreak(r, '2026-11-14'), 2); // 오늘 아직 안 풀었어도 어제까지 이어짐
});

test('하루 건너뛰면 0부터 다시, 최장 기록은 남는다', () => {
  let r = solve(solve(emptyRecord(), '2026-11-10'), '2026-11-11');
  assert.equal(currentStreak(r, '2026-11-13'), 0);
  r = solve(r, '2026-11-13');
  assert.equal(r.current, 1);
  assert.equal(r.best, 2);
});

test('같은 날 중복: 다 푼 날은 더 답해도 그대로', () => {
  const r = solve(emptyRecord(), '2026-11-12', [true, false, true, true, false]);
  const again = addAnswer(r, '2026-11-12', 'x', true);
  assert.equal(again, r);
  same(r.days['2026-11-12'].marks, [true, false, true, true, false]);
  assert.equal(r.current, 1);
});

test('날짜 경계: 월·연 넘어가도 하루 전 계산', () => {
  assert.equal(prevDate('2026-12-01'), '2026-11-30');
  assert.equal(prevDate('2027-01-01'), '2026-12-31');
  assert.equal(prevDate('2028-03-01'), '2028-02-29');
  const r = solve(solve(emptyRecord(), '2026-12-31'), '2027-01-01');
  assert.equal(r.current, 2);
});

test('깨진 저장값은 빈 기록, 이상한 날짜·값은 버린다', () => {
  same(parseRecord(null), emptyRecord());
  same(parseRecord('x'), emptyRecord());
  const r = parseRecord({ days: { bad: { picks: [], marks: [] }, '2026-11-12': { picks: ['a', 1], marks: [true] } }, current: -3, best: 'x', last: 'nope' });
  same(Object.keys(r.days), ['2026-11-12']);
  same(r.days['2026-11-12'].picks, ['a']);
  assert.equal(r.current, 0);
  assert.equal(r.last, null);
});

test('공유 텍스트: 점수·정오 칸·연속만, 정답 key 없음', () => {
  const r = solve(emptyRecord(), '2026-11-12', [true, true, false, true, true]);
  const text = buildShareText('2026-11-12', r.days['2026-11-12'], 3, 'ko');
  assert.equal(text, '오늘의 음감 11/12 · 4/5 🟩🟩🟥🟩🟩 · 🔥3일째');
  assert.doesNotMatch(text, /p\d/);
  assert.equal(buildShareText('2026-11-12', r.days['2026-11-12'], 0, 'ja'), '今日の音感 11/12 · 4/5 🟩🟩🟥🟩🟩');
});
