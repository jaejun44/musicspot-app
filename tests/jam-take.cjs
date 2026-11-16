// lib/jam/take.ts: 테이크 싱크·길이·음량 가공 + WAV, lib/jam/backing.ts 저장값 → 반주 스펙
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
  vm.runInNewContext(source, { exports, require: (m) => deps[m] ?? {}, process: { env: {} }, Float32Array, ArrayBuffer, DataView, Math, Map, console, Promise });
  return exports;
}

const take = loadLib('jam/take');
const SR = 44100;
const ramp = (n) => Float32Array.from({ length: n }, (_, i) => ((i % 1000) + 1) / 2000); // 0이 아닌 값

test('싱크 +100ms → 테이크가 4410샘플(100ms) 늦어지고 앞은 무음, 길이는 8마디 그대로', () => {
  const src = ramp(SR * 3);
  const out = take.processTake(src, SR, 100, 2, 1);
  assert.equal(out.length, SR * 2);
  for (let i = 0; i < 4410; i++) assert.equal(out[i], 0);
  assert.equal(out[4410], src[0]);
  assert.equal(out[10000], src[10000 - 4410]);
  // WAV로 인코딩해도 길이(파형 샘플 수) 유지
  const info = take.readWavInfo(take.encodeWavMono16(out, SR));
  assert.deepEqual({ ...info }, { sampleRate: SR, channels: 1, samples: SR * 2 });
});

test('싱크 −100ms → 앞 100ms를 잘라 당기고, 모자란 뒤는 무음', () => {
  const src = ramp(SR); // 1초뿐
  const out = take.processTake(src, SR, -100, 2, 1);
  assert.equal(out[0], src[4410]);
  assert.equal(out[SR - 4410 - 1], src[SR - 1]);
  assert.equal(out[SR - 4410], 0); // 원본이 끝난 뒤는 무음
  assert.equal(out.length, SR * 2);
});

test('싱크는 ±300ms·10ms 단위로 맞춘다, 0이면 그대로', () => {
  assert.equal(take.clampOffset(999), 300);
  assert.equal(take.clampOffset(-999), -300);
  assert.equal(take.clampOffset(104), 100);
  assert.equal(take.clampOffset(-15), -10); // 가장 가까운 10ms(반올림)
  const src = ramp(SR);
  const out = take.processTake(src, SR, 0, 1, 1);
  assert.equal(out[0], src[0]);
  assert.equal(out[SR - 1], src[SR - 1]);
});

test('음량 배수 적용·−1~1로 자름, 모노 믹스는 평균', () => {
  const out = take.processTake(Float32Array.from([0.4, -0.8, 0.9]), 3, 0, 1, 2);
  assert.deepEqual(Array.from(out).map((v) => Math.round(v * 100) / 100), [0.8, -1, 1]);
  const mono = take.mixToMono([Float32Array.from([1, 0]), Float32Array.from([0, 1])]);
  assert.deepEqual(Array.from(mono), [0.5, 0.5]);
});

test('WAV 헤더: RIFF·모노·16bit·샘플레이트', () => {
  const buf = take.encodeWavMono16(Float32Array.from([0, 1, -1]), 48000);
  const v = new DataView(buf);
  assert.equal(String.fromCharCode(v.getUint8(0), v.getUint8(1), v.getUint8(2), v.getUint8(3)), 'RIFF');
  assert.equal(v.getUint16(22, true), 1);
  assert.equal(v.getUint16(34, true), 16);
  assert.equal(v.getUint32(24, true), 48000);
  assert.equal(v.getInt16(46, true), 32767);
  assert.equal(v.getInt16(48, true), -32768);
});

const catalog = loadLib('jam/catalog');
const engine = { maskToMutes: (m) => ({ drums: !!((m ?? 0) & 1), bass: !!((m ?? 0) & 2), chords: !!((m ?? 0) & 4) }), renderJamLoop: () => Promise.reject(new Error('브라우저 전용')) };
const backing = loadLib('jam/backing', { './catalog': catalog, './engine': engine });

test('저장값 → 반주: 일반 프로젝트는 null, 반주 프로젝트는 진행·BPM·음소거 그대로', () => {
  assert.equal(backing.resolveJamBacking({ jam_slug: null, jam_bpm: null, jam_prog: null }), null);
  const r = backing.resolveJamBacking({ jam_slug: 'a-minor-rock', jam_bpm: 132, jam_prog: 'i-VII-VI-VII', jam_mutes: 5 });
  assert.equal(r.progression.id, 'i-VII-VI-VII');
  assert.equal(r.spec.bpm, 132);
  assert.equal(r.spec.style, 'rock8');
  assert.deepEqual(JSON.parse(JSON.stringify(r.spec.chords.slice(0, 2))), [{ root: 9, quality: 'min' }, { root: 7, quality: 'maj' }]);
  assert.deepEqual({ ...r.muted }, { drums: true, bass: false, chords: true });
});

test('카탈로그에 없는 조합·진행이면 null(화면은 반주 없이 테이크만 재생)', () => {
  assert.equal(backing.resolveJamBacking({ jam_slug: 'z-minor-rock', jam_bpm: 120, jam_prog: 'i-VII-VI-VII' }), null);
  assert.equal(backing.resolveJamBacking({ jam_slug: 'a-minor-rock', jam_bpm: 120, jam_prog: 'gone' }), null);
});

test('반주 음량 %: null·없음은 100%, 0~200으로 자름', () => {
  assert.equal(backing.jamGainFactor(null), 1);
  assert.equal(backing.jamGainFactor(undefined), 1);
  assert.equal(backing.jamGainFactor(60), 0.6);
  assert.equal(backing.jamGainFactor(0), 0);
  assert.equal(backing.jamGainFactor(250), 2);
  assert.equal(backing.jamGainFactor(-5), 0);
});

test('자동 음량 맞춤: 작으면 −3dB까지 키우고, 크면 그대로, 거의 무음이면 null', () => {
  const quiet = new Float32Array([0, 0.1, -0.05, 0]); // −20dB
  const n = take.normalizeTake(quiet);
  assert.equal(n.peakDb, -20);
  assert.equal(n.boostDb, 17);
  assert.ok(Math.abs(Math.max(...n.samples) - Math.pow(10, -3 / 20)) < 1e-6);
  assert.equal(quiet[1], Math.fround(0.1), '원본은 건드리지 않음');

  const loud = new Float32Array([0, 0.9, -0.2]);
  const l = take.normalizeTake(loud);
  assert.equal(l.boostDb, 0);
  assert.equal(l.samples, loud, '이미 크면 그대로(줄이지 않음)');

  assert.equal(take.normalizeTake(new Float32Array([0, 0.002, -0.001])), null, '−54dB → 증폭 안 함');
  assert.equal(take.normalizeTake(new Float32Array(100)), null, '완전 무음');
  assert.ok(take.normalizeTake(new Float32Array([0.0032])) !== null, '−49.9dB는 맞춤 대상');
});

test('테이크 음량 슬라이더는 올리는 파일(processTake)에 곱해진다', () => {
  const s = new Float32Array(10).fill(0.25);
  const out = take.processTake(s, 10, 0, 1, 1.5);
  assert.ok(Math.abs(out[0] - 0.375) < 1e-6);
});

test('함께 녹음 음량: 파일 배수 = 내 연주/기존, 16bit가 깨지지 않게 상한', () => {
  const p = Math.pow(10, -3 / 20); // 음량 맞춤 뒤 최대 레벨
  const a = take.layerMix(1, 1, p);
  assert.equal(a.ratio, 1);
  assert.equal(a.capped, false);
  const b = take.layerMix(0.8, 1, p); // 1.25배 → 상한(1.41) 안
  assert.ok(Math.abs(b.ratio - 1.25) < 1e-9);
  assert.ok(Math.abs(b.previewMine - 1) < 1e-9, '미리듣기 내 연주 = 슬라이더 그대로');
  const c = take.layerMix(0.5, 1, p); // 2배 → 1.41에서 멈춤
  assert.equal(c.capped, true);
  assert.ok(Math.abs(c.ratio * p - 1) < 1e-9, '최대 레벨이 정확히 1');
  assert.ok(Math.abs(c.previewMine - c.ratio * 0.5) < 1e-9, '미리듣기도 파일과 같은 균형');
  assert.equal(take.layerMix(0, 1, p).previewBase, take.LAYER_BASE_MIN);
  assert.equal(take.layerMix(1, 0.5, p).ratio, 0.5);
});
