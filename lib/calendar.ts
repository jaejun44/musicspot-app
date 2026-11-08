/**
 * 합주 일정 → 내 캘린더(구글 캘린더 링크 · .ics 파일). 서버 없이 만든다.
 * 웹은 푸시를 못 보내니, 캘린더의 하루 전 알림 + 메모의 우리 링크가 다음 방문의 입구가 된다.
 * 시간은 모두 한국 시간(Asia/Seoul) 기준 벽시계 값으로 다룬다.
 */

export const CALENDAR_TZ = 'Asia/Seoul';
export const DEFAULT_DURATION_MIN = 120;

export interface CalendarEvent {
  /** 고유 id(같은 일정을 다시 가져오면 캘린더가 덮어쓴다) */
  uid: string;
  title: string;
  location?: string | null;
  /** YYYY-MM-DD (한국 날짜) */
  date: string;
  /** HH:MM (한국 시각) */
  startTime: string;
  /** HH:MM. 없으면 durationMin */
  endTime?: string | null;
  durationMin?: number;
  description?: string;
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^\d{2}:\d{2}(:\d{2})?$/;

/** 날짜·시각이 캘린더에 넣을 수 있는 꼴인지 */
export function isCalendarReady(date: string | null | undefined, time: string | null | undefined): boolean {
  return !!date && !!time && DATE_RE.test(date) && TIME_RE.test(time);
}

/** "2026-11-10", "18:00" → "20261110T180000" (벽시계 값, 시간대 변환 없음) */
function stamp(date: string, time: string): string {
  return `${date.replace(/-/g, '')}T${time.slice(0, 5).replace(':', '')}00`;
}

/** 벽시계 날짜·시각에 분을 더한다(자정 넘김 포함). UTC 계산만 빌려 써 시간대 영향이 없다 */
export function addMinutes(date: string, time: string, minutes: number): { date: string; time: string } {
  const [y, m, d] = date.split('-').map(Number);
  const [hh, mm] = time.split(':').map(Number);
  const t = new Date(Date.UTC(y, m - 1, d, hh, mm) + minutes * 60_000);
  const pad = (n: number) => String(n).padStart(2, '0');
  return {
    date: `${t.getUTCFullYear()}-${pad(t.getUTCMonth() + 1)}-${pad(t.getUTCDate())}`,
    time: `${pad(t.getUTCHours())}:${pad(t.getUTCMinutes())}`,
  };
}

function endOf(ev: CalendarEvent): { date: string; time: string } {
  if (ev.endTime && TIME_RE.test(ev.endTime) && ev.endTime.slice(0, 5) > ev.startTime.slice(0, 5)) {
    return { date: ev.date, time: ev.endTime.slice(0, 5) };
  }
  return addMinutes(ev.date, ev.startTime.slice(0, 5), ev.durationMin ?? DEFAULT_DURATION_MIN);
}

/** 구글 캘린더 "일정 만들기" 화면 링크 */
export function buildGoogleCalendarUrl(ev: CalendarEvent): string {
  const end = endOf(ev);
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: ev.title,
    dates: `${stamp(ev.date, ev.startTime)}/${stamp(end.date, end.time)}`,
    ctz: CALENDAR_TZ,
  });
  if (ev.location) params.set('location', ev.location);
  if (ev.description) params.set('details', ev.description);
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

/** RFC 5545 TEXT 이스케이프: \ ; , 줄바꿈 */
export function escapeIcsText(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r\n|\r|\n/g, '\\n');
}

/** 한 줄 75바이트(UTF-8) 넘으면 접는다(이어지는 줄은 공백으로 시작). 한글이 중간에 잘리지 않게 글자 단위로 */
export function foldIcsLine(line: string): string {
  const enc = new TextEncoder();
  const parts: string[] = [];
  let current = '';
  let bytes = 0;
  for (const ch of line) {
    const n = enc.encode(ch).length;
    const limit = parts.length === 0 ? 75 : 74; // 이어지는 줄은 앞 공백 1바이트
    if (bytes + n > limit) {
      parts.push(current);
      current = '';
      bytes = 0;
    }
    current += ch;
    bytes += n;
  }
  parts.push(current);
  return parts.join('\r\n ');
}

function utcStamp(d: Date): string {
  return d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
}

/** .ics 본문(CRLF). 하루 전 알림 1개 */
export function buildIcs(ev: CalendarEvent, now: Date = new Date()): string {
  const end = endOf(ev);
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Music Spot//Jam Calendar//KO',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    // 한국은 서머타임이 없어 표준시 하나면 된다
    'BEGIN:VTIMEZONE',
    `TZID:${CALENDAR_TZ}`,
    'BEGIN:STANDARD',
    'DTSTART:19700101T000000',
    'TZOFFSETFROM:+0900',
    'TZOFFSETTO:+0900',
    'TZNAME:KST',
    'END:STANDARD',
    'END:VTIMEZONE',
    'BEGIN:VEVENT',
    `UID:${ev.uid}@musicspotfest.com`,
    `DTSTAMP:${utcStamp(now)}`,
    `DTSTART;TZID=${CALENDAR_TZ}:${stamp(ev.date, ev.startTime)}`,
    `DTEND;TZID=${CALENDAR_TZ}:${stamp(end.date, end.time)}`,
    `SUMMARY:${escapeIcsText(ev.title)}`,
    ...(ev.location ? [`LOCATION:${escapeIcsText(ev.location)}`] : []),
    ...(ev.description ? [`DESCRIPTION:${escapeIcsText(ev.description)}`] : []),
    'BEGIN:VALARM',
    'ACTION:DISPLAY',
    `DESCRIPTION:${escapeIcsText(`내일 ${ev.title}`)}`,
    'TRIGGER:-P1D',
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
  ];
  return lines.map(foldIcsLine).join('\r\n') + '\r\n';
}

/** 메모에 넣을 링크 줄 */
export function calendarDescription(links: { label: string; url: string }[]): string {
  return [...links.map((l) => `${l.label}: ${l.url}`), '', 'Music Spot — 합주실 찾기·멤버 투표'].join('\n');
}
