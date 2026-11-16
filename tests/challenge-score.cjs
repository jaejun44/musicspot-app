// lib/challenge-score.ts 상수와 DB CHECK(supabase/22_stem_loop.sql)가 같은 값인지, 업로드 3곳이 모두 상수를 쓰는지
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const lib = fs.readFileSync('lib/challenge-score.ts', 'utf8');
const score = Number(lib.match(/export const TRACK_UPLOAD_SCORE = (\d+);/)[1]);

test('점수 상수 = DB CHECK가 받는 값', () => {
  assert.equal(score, 10);
  const sql = fs.readFileSync('supabase/22_stem_loop.sql', 'utf8');
  assert.match(sql, new RegExp(`CHECK \\(challenge_score IN \\(0, ${score}\\)\\)`));
});

test('업로드 경로 3곳(파일·녹음·함께 / 유튜브 / 백킹 잼)이 모두 상수를 넣는다', () => {
  const panel = fs.readFileSync('app/stems/_components/TrackUploadPanel.tsx', 'utf8');
  const take = fs.readFileSync('app/jam/_components/TakePanel.tsx', 'utf8');
  const count = (src) => (src.match(/challenge_score: TRACK_UPLOAD_SCORE/g) || []).length;
  assert.equal((panel.match(/from\('stem_tracks'\)\.insert/g) || []).length, 2);
  assert.equal(count(panel), 2);
  assert.equal((take.match(/from\('stem_tracks'\)\.insert/g) || []).length, 1);
  assert.equal(count(take), 1);
});
