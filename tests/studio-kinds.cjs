// 연습실 종류 분류(scripts/studio_rules.py classify_kinds·band_rank) 테스트를 node --test에서 함께 돌린다
const { test } = require('node:test');
const assert = require('node:assert');
const { spawnSync } = require('node:child_process');
const path = require('node:path');

test('연습실 종류 분류 — 종류별 대표·부정 표현·섞임·표현 없음·band_rank (python unittest)', () => {
  const script = path.join(__dirname, '..', 'scripts', 'test_studio_rules.py');
  const res = spawnSync('python3', [script], { encoding: 'utf8' });
  assert.strictEqual(res.error, undefined, `python3 실행 실패: ${res.error}`);
  assert.strictEqual(res.status, 0, res.stderr);
});
