// lib/takevideo: 영상 길이(45초 이하·백킹 잼 8마디 안 자름), 마디 위치, 진폭, mp4 형식 선택
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

function loadLib(file, ctx = {}) {
  const exports = {};
  const source = ts.transpileModule(fs.readFileSync(path.join('lib', `${file}.ts`), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  vm.runInNewContext(source, { exports, require: () => ({}), Float32Array, Math, Error, console, ...ctx });
  return exports;
}

const tl = loadLib('takevideo/timeline');
const mix = loadLib('takevideo/mix');

test('백킹 잼: 가장 느린 56 BPM도 8마디 전체 + 엔드 카드 1.5초, 45초 이하', () => {
  const r = tl.computeTimeline(10, 56);
  assert.ok(Math.abs(r.musicSec - 8 * (240 / 56)) < 1e-9);
  assert.ok(Math.abs(r.totalSec - (r.musicSec + 1.5)) < 1e-9);
  assert.ok(r.totalSec <= 45);
  assert.equal(r.fadeFromSec, null);
  assert.equal(r.barsExact, true);
  // 백킹 잼 카탈로그의 가장 느린 BPM(발라드 56)이 바뀌면 이 테스트가 잡는다
  const catalog = fs.readFileSync('lib/jam/catalog.ts', 'utf8');
  const mins = [...catalog.matchAll(/bpmRange: \[(\d+), \d+\]/g)].map((m) => Number(m[1]));
  for (const bpm of mins) assert.ok(tl.computeTimeline(10, bpm).totalSec <= 45, `${bpm} BPM`);
});

test('반주 없는 프로젝트: 43.5초 넘으면 자르고 페이드, 짧으면 그대로', () => {
  const long = tl.computeTimeline(60, null);
  assert.equal(long.musicSec, 43.5);
  assert.equal(long.totalSec, 45);
  assert.equal(long.fadeFromSec, 43.5 - tl.CUT_FADE_SEC);
  assert.equal(long.barsExact, false);
  const short = tl.computeTimeline(20, null);
  assert.equal(short.musicSec, 20);
  assert.equal(short.fadeFromSec, null);
  assert.equal(short.barSec, 20 / 8);
});

test('마디 위치: 경계에서 다음 마디, 끝나면 null', () => {
  const r = tl.computeTimeline(10, 120); // 한 마디 2초
  assert.equal(tl.barAt(0, r).bar, 0);
  assert.equal(tl.barAt(0, r).frac, 0);
  assert.equal(tl.barAt(1.999, r).bar, 0);
  assert.equal(tl.barAt(2, r).bar, 1);
  assert.equal(tl.barAt(15.9, r).bar, 7);
  assert.equal(tl.barAt(16, r), null);
  assert.throws(() => tl.computeTimeline(0, 120));
});

test('진폭: 무음 0, 0dBFS 1, 소리가 있는 구간만 올라감', () => {
  const sr = 3000;
  const data = new Float32Array(sr * 2);
  for (let i = sr; i < sr * 2; i++) data[i] = i % 2 ? 1 : -1;
  const env = mix.envelope([{ data: [data], sampleRate: sr }], 2, 10);
  assert.equal(env.length, 20);
  assert.equal(env[0], 0);
  assert.equal(env[15], 1);
});

test('mp4(H.264+AAC)만 고르고, 안 되면 null(버튼 숨김)', () => {
  function sup(accept) {
    class AC {}
    AC.prototype.createMediaStreamDestination = () => ({});
    class Canvas {}
    Canvas.prototype.captureStream = () => ({});
    return loadLib('takevideo/support', {
      window: { AudioContext: AC },
      MediaRecorder: { isTypeSupported: accept },
      HTMLCanvasElement: Canvas,
    });
  }
  assert.equal(sup((t) => t.startsWith('video/mp4')).pickTakeVideoMime(), 'video/mp4;codecs=avc1.640028,mp4a.40.2');
  assert.equal(sup((t) => t.startsWith('video/webm')).pickTakeVideoMime(), null);
  assert.equal(sup(() => false).pickTakeVideoMime(), null);
  assert.equal(sup(() => true).takeVideoFileName('3f2a9c1e-77aa-4b'), 'musicspot-3f2a9c1e.mp4');
});
