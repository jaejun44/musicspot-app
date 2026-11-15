// lib/jam/catalog.ts: 백킹 잼 키×스타일 조합·슬러그·진행·스케일·메타
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
  vm.runInNewContext(source, { exports, require: (m) => deps[m] ?? {}, process: { env: {} } });
  return exports;
}

const cat = loadLib('jam/catalog');
const { COMBOS, STYLES, KEYS, parseSlug, comboSlug, transposeSlug, progressionChords, scaleNotes, comboMeta } = cat;

const MAJOR = [0, 2, 4, 5, 7, 9, 11];
const MINOR = [0, 2, 3, 5, 7, 8, 10];
const TONES = { maj: [0, 4, 7], min: [0, 3, 7], '7': [0, 4, 7, 10], m7: [0, 3, 7, 10], '5': [0, 7] };

test('키 24개, 조합 132개(메탈은 단조만), 슬러그 중복 없음', () => {
  assert.equal(KEYS.length, 24);
  assert.equal(COMBOS.length, 12 * 2 * 5 + 12);
  assert.equal(new Set(COMBOS.map((c) => c.slug)).size, COMBOS.length);
  for (const s of ['a-minor-blues', 'e-minor-metal', 'f-sharp-minor-rock', 'e-flat-major-ballad', 'c-sharp-minor-funk', 'b-flat-major-pop-punk']) {
    assert.ok(parseSlug(s), s);
  }
  assert.equal(parseSlug('c-major-metal'), null);
  assert.equal(parseSlug('a-minor-blues-120'), null); // BPM은 주소가 아니다
});

test('슬러그 왕복: parse → comboSlug, 반음 이동 ±1·±12', () => {
  for (const c of COMBOS) {
    assert.equal(comboSlug(c.key.pc, c.key.mode, c.style.slug), c.slug);
    assert.equal(transposeSlug(parseSlug(transposeSlug(c, 1)), -1), c.slug);
    assert.equal(transposeSlug(c, 12), c.slug);
    assert.equal(parseSlug(transposeSlug(c, 1)).style.slug, c.style.slug);
  }
  assert.equal(transposeSlug(parseSlug('b-minor-rock'), 1), 'c-minor-rock');
  assert.equal(transposeSlug(parseSlug('c-major-funk'), -1), 'b-major-funk');
});

test('스타일마다 기본 BPM이 범위 안, 조성마다 진행 2~3개·8마디', () => {
  assert.equal(STYLES.length, 6);
  for (const s of STYLES) {
    assert.ok(s.bpm >= s.bpmRange[0] && s.bpm <= s.bpmRange[1], s.slug);
    for (const mode of s.modes) {
      const list = s.progressions[mode];
      assert.ok(list.length >= 2 && list.length <= 3, `${s.slug} ${mode} ${list.length}`);
      for (const p of list) {
        assert.equal(p.bars.length, 8, `${s.slug} ${p.id}`);
        assert.ok(p.scales.length >= 1 && p.scales.length <= 2);
      }
    }
  }
});

test('진행의 코드가 조에 맞는다(블루스·도리안은 근음만)', () => {
  for (const s of STYLES) {
    for (const mode of s.modes) {
      const scale = mode === 'major' ? MAJOR : MINOR;
      for (const p of s.progressions[mode]) {
        for (const [iv, q] of p.bars) {
          assert.ok(scale.includes(iv), `${s.slug} ${p.id} 근음 ${iv}`);
          if (!p.modal) {
            for (const t of TONES[q]) assert.ok(scale.includes((iv + t) % 12), `${s.slug} ${mode} ${p.id} ${iv}${q} 구성음 ${t}`);
          }
        }
      }
    }
  }
  const a = parseSlug('a-minor-rock');
  assert.deepEqual(
    JSON.parse(JSON.stringify(progressionChords(a.key, a.style.progressions.minor[0]).slice(0, 4))),
    [{ root: 9, quality: 'min' }, { root: 5, quality: 'maj' }, { root: 0, quality: 'maj' }, { root: 7, quality: 'maj' }],
  );
});

test('스케일 구성음 표기', () => {
  const k = (slug) => parseSlug(slug).key;
  assert.equal(scaleNotes(k('a-minor-blues'), 'minorPenta').join(' '), 'A C D E G');
  assert.equal(scaleNotes(k('a-minor-blues'), 'blues').join(' '), 'A C D E♭ E G');
  assert.equal(scaleNotes(k('f-sharp-minor-rock'), 'minorPenta').join(' '), 'F# A B C# E');
  assert.equal(scaleNotes(k('f-sharp-minor-rock'), 'blues').join(' '), 'F# A B C C# E');
  assert.equal(scaleNotes(k('e-flat-major-ballad'), 'major').join(' '), 'E♭ F G A♭ B♭ C D');
});

test('조합 페이지 제목·설명은 모두 다르다', () => {
  const metas = COMBOS.map(comboMeta);
  assert.equal(new Set(metas.map((m) => m.title)).size, COMBOS.length);
  assert.equal(new Set(metas.map((m) => m.description)).size, COMBOS.length);
  assert.equal(metas[COMBOS.findIndex((c) => c.slug === 'a-minor-blues')].title, 'A 마이너 블루스 백킹 트랙 — 브라우저에서 바로 연주 | Music Spot');
});
