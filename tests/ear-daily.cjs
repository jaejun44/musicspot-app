// lib/ear/daily.ts: 날짜로 정해지는 오늘의 음감 5문제
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

const { buildDailyQuiz, kstToday, msUntilKstMidnight, QUESTION_ORDER } = loadLib('ear/daily');
const json = (v) => JSON.stringify(v);

function dates(start, n) {
  const out = [];
  const d = new Date(`${start}T00:00:00Z`);
  for (let i = 0; i < n; i++) {
    out.push(d.toISOString().slice(0, 10));
    d.setUTCDate(d.getUTCDate() + 1);
  }
  return out;
}

test('같은 날짜는 같은 문제·보기 순서, 다른 날짜는 다른 문제', () => {
  assert.equal(json(buildDailyQuiz('2026-11-12')), json(buildDailyQuiz('2026-11-12')));
  const all = dates('2026-11-01', 120).map((d) => json(buildDailyQuiz(d)));
  assert.equal(new Set(all).size, all.length);
});

test('정답은 항상 보기 안에 있고, 보기 수는 1·3번 2개 / 나머지 4개', () => {
  for (const d of dates('2026-01-01', 365)) {
    const quiz = buildDailyQuiz(d);
    quiz.forEach((q, i) => {
      const keys = q.choices.map((c) => c.key);
      assert.ok(keys.includes(q.answer), `${d} ${q.type}`);
      assert.equal(new Set(keys).size, keys.length);
      assert.equal(keys.length, i === 0 || i === 2 ? 2 : 4);
    });
  }
});

test('5문제 유형 순서 고정 + 소리 모양', () => {
  for (const d of dates('2026-11-01', 30)) {
    const quiz = buildDailyQuiz(d);
    same(quiz.map((q) => q.type), QUESTION_ORDER);
    same([...QUESTION_ORDER], ['higher', 'interval', 'quality', 'chord', 'progression']);
    const [higher, , , , prog] = quiz;
    const [a, b] = higher.sound.notes;
    assert.equal(higher.answer, a > b ? 'first' : 'second');
    assert.equal(prog.sound.chords.length, 4);
    for (const q of quiz) {
      const notes = q.sound.kind === 'progression' ? q.sound.chords.flat() : q.sound.notes;
      for (const n of notes) assert.ok(n >= 36 && n <= 88, `${d} ${q.type} 음역 ${n}`);
    }
  }
});

test('보기 순서도 날마다 섞인다 (진행 문제 첫 보기가 늘 같지 않음)', () => {
  const firsts = new Set(dates('2026-11-01', 30).map((d) => buildDailyQuiz(d)[4].choices[0].key));
  assert.ok(firsts.size > 1);
});

test('날짜 경계는 KST: UTC 15:00 = 한국 자정', () => {
  assert.equal(kstToday(new Date('2026-11-11T14:59:59Z')), '2026-11-11');
  assert.equal(kstToday(new Date('2026-11-11T15:00:00Z')), '2026-11-12');
  assert.equal(msUntilKstMidnight(new Date('2026-11-11T14:59:00Z')), 60 * 1000);
  assert.equal(msUntilKstMidnight(new Date('2026-11-11T15:00:00Z')), 24 * 60 * 60 * 1000);
});
