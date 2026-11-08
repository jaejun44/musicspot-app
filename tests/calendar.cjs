// lib/calendar.ts: 구글 캘린더 링크 · .ics(RFC 5545)
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
  vm.runInNewContext(source, { exports, require: () => ({}), URLSearchParams, TextEncoder, Date });
  return exports;
}

const { buildGoogleCalendarUrl, buildIcs, escapeIcsText, foldIcsLine, addMinutes, isCalendarReady } =
  loadLib('calendar');

const ev = {
  uid: 'vote-abc',
  title: '합주 · 드럼에비뉴',
  location: '경기 수원시 팔달구 효원로 1, 3층',
  date: '2026-11-10',
  startTime: '18:00',
  description: '투표: https://www.musicspotfest.com/vote/abc?utm_source=calendar\n다음 합주 정하기: https://x/y',
};

test('구글 캘린더: TEMPLATE·KST·기본 2시간·장소·메모', () => {
  const url = new URL(buildGoogleCalendarUrl(ev));
  assert.equal(url.origin + url.pathname, 'https://calendar.google.com/calendar/render');
  assert.equal(url.searchParams.get('action'), 'TEMPLATE');
  assert.equal(url.searchParams.get('text'), '합주 · 드럼에비뉴');
  assert.equal(url.searchParams.get('dates'), '20261110T180000/20261110T200000');
  assert.equal(url.searchParams.get('ctz'), 'Asia/Seoul');
  assert.equal(url.searchParams.get('location'), ev.location);
  assert.equal(url.searchParams.get('details'), ev.description);
});

test('끝 시각: endTime 우선, 자정 넘김', () => {
  const u1 = new URL(buildGoogleCalendarUrl({ ...ev, endTime: '21:30' }));
  assert.equal(u1.searchParams.get('dates'), '20261110T180000/20261110T213000');
  const u2 = new URL(buildGoogleCalendarUrl({ ...ev, startTime: '23:00' }));
  assert.equal(u2.searchParams.get('dates'), '20261110T230000/20261111T010000');
  const end = addMinutes('2026-12-31', '23:30', 60);
  assert.deepEqual({ ...end }, { date: '2027-01-01', time: '00:30' });
});

test('.ics: CRLF·TZID·VALARM 하루 전 1개·DTSTAMP UTC', () => {
  const ics = buildIcs(ev, new Date(Date.UTC(2026, 10, 8, 5, 6, 7)));
  assert.ok(ics.endsWith('\r\n'));
  assert.equal(ics.replace(/\r\n/g, '').includes('\n'), false, 'LF만 있는 줄 없음');
  const unfolded = ics.replace(/\r\n /g, '');
  assert.match(unfolded, /\r\nDTSTART;TZID=Asia\/Seoul:20261110T180000\r\n/);
  assert.match(unfolded, /\r\nDTEND;TZID=Asia\/Seoul:20261110T200000\r\n/);
  assert.match(unfolded, /\r\nDTSTAMP:20261108T050607Z\r\n/);
  assert.equal((unfolded.match(/BEGIN:VALARM/g) || []).length, 1);
  assert.match(unfolded, /\r\nTRIGGER:-P1D\r\n/);
  assert.match(unfolded, /\r\nLOCATION:경기 수원시 팔달구 효원로 1\\, 3층\r\n/);
  assert.match(unfolded, /DESCRIPTION:투표: https:\/\/www\.musicspotfest\.com\/vote\/abc\?utm_source=calendar\\n다음/);
});

test('이스케이프: \\ ; , 줄바꿈', () => {
  assert.equal(escapeIcsText('a\\b;c,d\ne'), 'a\\\\b\\;c\\,d\\ne');
});

test('줄 접기: 75바이트 이하, 한글 안 깨짐, 펼치면 원래대로', () => {
  const line = 'DESCRIPTION:' + '합주실'.repeat(40);
  const folded = foldIcsLine(line);
  const enc = new TextEncoder();
  for (const part of folded.split('\r\n')) assert.ok(enc.encode(part).length <= 75, part);
  assert.equal(folded.replace(/\r\n /g, ''), line);
});

test('캘린더에 넣을 수 있는지', () => {
  assert.equal(isCalendarReady('2026-11-10', '18:00'), true);
  assert.equal(isCalendarReady('2026-11-10', '18:00:00'), true);
  assert.equal(isCalendarReady(null, '18:00'), false);
  assert.equal(isCalendarReady('2026-11-10', null), false);
  assert.equal(isCalendarReady('11/10', '18:00'), false);
});
