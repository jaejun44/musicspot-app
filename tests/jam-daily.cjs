// lib/jam/daily.ts: 오늘의 잼 — 같은 날 같은 결과, 음감 5번 문제와 같은 진행·같은 조
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
  vm.runInNewContext(source, { exports, require: (m) => deps[m] ?? {}, process: { env: {} }, Error });
  return exports;
}

const ear = loadLib('ear/daily');
const catalog = loadLib('jam/catalog');
const { dailyJam } = loadLib('jam/daily', { '@/lib/ear/daily': ear, './catalog': catalog });

function dates(start, n) {
  const out = [];
  const d = new Date(`${start}T00:00:00Z`);
  for (let i = 0; i < n; i++) {
    out.push(d.toISOString().slice(0, 10));
    d.setUTCDate(d.getUTCDate() + 1);
  }
  return out;
}

test('같은 날짜 → 같은 잼', () => {
  for (const d of dates('2026-11-01', 30)) {
    const a = dailyJam(d);
    const b = dailyJam(d);
    assert.equal(a.slug, b.slug);
    assert.equal(a.progression.id, b.progression.id);
    assert.ok(catalog.parseSlug(a.slug), a.slug);
    assert.equal(a.bpm, a.style.bpm);
  }
});

test('음감 5번 문제와 같은 진행·같은 조(앞 4마디 코드 근음·장단이 일치)', () => {
  const styles = new Set();
  const keys = new Set();
  for (const d of dates('2026-11-01', 120)) {
    const jam = dailyJam(d);
    const q = ear.buildDailyQuiz(d)[4];
    assert.equal(jam.progression.id, q.answer, d);
    const chords = catalog.progressionChords(jam.key, jam.progression);
    q.sound.chords.forEach((voiced, i) => {
      const root = voiced[1];
      assert.equal(chords[i].root, root % 12, `${d} ${i}번째 근음`);
      const minor = voiced[2] - root === 3;
      assert.equal(chords[i].quality === 'min', minor, `${d} ${i}번째 장단`);
    });
    styles.add(jam.style.slug);
    keys.add(jam.key.pc);
  }
  // 날마다 스타일·키가 돌아가며 나온다
  assert.ok(styles.size >= 3, [...styles].join(','));
  assert.ok(keys.size >= 8);
});
