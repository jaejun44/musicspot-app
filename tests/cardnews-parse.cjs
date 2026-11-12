// 카드뉴스 캡션 파싱(scripts/cardnews_parse.py) 테스트를 node --test에서 함께 돌린다
const { test } = require('node:test');
const assert = require('node:assert');
const { spawnSync } = require('node:child_process');
const path = require('node:path');

test('카드뉴스 캡션 파싱 — 제목·해시태그·저작자 표기·출처·slug (python unittest)', () => {
  const script = path.join(__dirname, '..', 'scripts', 'test_cardnews_parse.py');
  const res = spawnSync('python3', [script], { encoding: 'utf8' });
  assert.strictEqual(res.error, undefined, `python3 실행 실패: ${res.error}`);
  assert.strictEqual(res.status, 0, res.stderr);
});
