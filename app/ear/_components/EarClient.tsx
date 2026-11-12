'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { track } from '@/lib/analytics';
import { useT, useIsJapanMode } from '@/lib/i18n';
import { buildDailyQuiz, kstToday, msUntilKstMidnight, type Question } from '@/lib/ear/daily';
import { isIOS, playSound, stopSound, unlockEarAudio } from '@/lib/ear/synth';
import {
  EAR_QUESTION_COUNT,
  addAnswer,
  currentStreak,
  emptyRecord,
  isDone,
  loadRecord,
  saveRecord,
  type EarDay,
  type EarRecord,
} from '@/lib/ear/streak';
import PushOptIn from '@/components/PushOptIn';
import { EAR_TARGET_ID } from '@/lib/push-messages';
import EarShare from './EarShare';

const FONT = { fontFamily: 'Pretendard, sans-serif' };
const CARD = 'bg-white rounded-[20px] border-[3px] border-[#0A0A0A]';

function formatCountdown(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000));
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(Math.floor(s / 3600))}:${pad(Math.floor((s % 3600) / 60))}:${pad(s % 60)}`;
}

function formatDate(date: string): string {
  const [, m, d] = date.split('-');
  return `${Number(m)}/${Number(d)}`;
}

/** 듣기 버튼. 첫 탭에서 오디오를 깨운다(iOS는 사용자 탭 안에서만 소리가 난다) */
function ListenButton({ question, heard, onPlayed }: { question: Question; heard: boolean; onPlayed: () => void }) {
  const t = useT();
  const [playing, setPlaying] = useState(false);
  const [ios, setIos] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => () => clearTimeout(timer.current), []);
  useEffect(() => setIos(isIOS()), []); // 서버 렌더와 어긋나지 않게 마운트 후 판별

  async function handlePlay() {
    try {
      const audio = await unlockEarAudio();
      const sec = playSound(audio, question.sound);
      setPlaying(true);
      clearTimeout(timer.current);
      timer.current = setTimeout(() => setPlaying(false), sec * 1000);
      onPlayed();
    } catch (e) {
      console.error('[ear] 재생 실패', e);
      setPlaying(false);
    }
  }

  const button = (
    <motion.button
      type="button"
      onClick={handlePlay}
      whileTap={{ scale: 0.95, x: 2, y: 2 }}
      className="w-full min-h-[56px] py-4 rounded-[16px] border-[3px] border-[#0A0A0A] bg-[#FF3D77] text-white text-[17px] font-bold"
      style={{ boxShadow: '4px 4px 0 #0A0A0A', ...FONT }}
    >
      {playing ? t('🔊 재생 중…') : heard ? t('🔁 다시 듣기') : t('▶ 듣기')}
    </motion.button>
  );
  if (!ios) return button;
  return (
    <div>
      {button}
      <p className="mt-2 text-center text-[12px] font-bold text-[#0A0A0A]/60 break-keep" style={FONT}>
        {t('소리가 안 들리면 무음 모드와 볼륨을 확인하세요')}
      </p>
    </div>
  );
}

/** 결과 화면 복습 한 줄: 문제·정답·내 답 + 다시 듣기 */
function ReviewRow({ index, question, pick, correct }: { index: number; question: Question; pick: string; correct: boolean }) {
  const t = useT();
  const label = (key: string) => t(question.choices.find((c) => c.key === key)?.label ?? key);
  return (
    <li className="flex items-center gap-3 py-3 border-b-[2px] border-[#0A0A0A]/10 last:border-b-0">
      <span className="text-[18px]" aria-hidden>
        {correct ? '🟩' : '🟥'}
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-bold text-[#0A0A0A]/60">
          {index + 1}. {t(question.prompt)}
        </p>
        <p className="text-[14px] font-bold text-[#0A0A0A] break-keep">
          {t('정답')}: {label(question.answer)}
          {!correct && <span className="text-[#FF3D77]"> · {t('내 답')}: {label(pick)}</span>}
        </p>
      </div>
      <button
        type="button"
        onClick={async () => {
          try {
            playSound(await unlockEarAudio(), question.sound);
          } catch (e) {
            console.error('[ear] 복습 재생 실패', e);
          }
        }}
        className="flex-shrink-0 min-w-[44px] min-h-[44px] px-3 rounded-[12px] border-[2px] border-[#0A0A0A] bg-[#F5FF4F] text-[13px] font-bold"
        style={{ boxShadow: '2px 2px 0 #0A0A0A' }}
        aria-label={t('{n}번 다시 듣기', { n: index + 1 })}
      >
        🔁
      </button>
    </li>
  );
}

export default function EarClient() {
  const t = useT();
  const isJapanMode = useIsJapanMode();
  const [today, setToday] = useState<string | null>(null);
  const [record, setRecord] = useState<EarRecord>(emptyRecord);
  const [started, setStarted] = useState(false);
  const [heard, setHeard] = useState(false);
  /** 방금 답한 문제 번호 — 정답 공개 후 [다음]을 누를 때까지 */
  const [reveal, setReveal] = useState<number | null>(null);
  const [countdown, setCountdown] = useState(0);
  const todayRef = useRef<string | null>(null);

  // 날짜·기록은 브라우저에서만 읽는다(서버 렌더와 어긋나지 않게)
  useEffect(() => {
    setToday(kstToday(new Date()));
    setRecord(loadRecord());
  }, []);

  // 내일 문제까지 남은 시간. 자정을 넘기면 새 문제로
  useEffect(() => {
    const tick = () => {
      const now = new Date();
      setCountdown(msUntilKstMidnight(now));
      const d = kstToday(now);
      if (todayRef.current && todayRef.current !== d) {
        stopSound();
        setStarted(false);
        setReveal(null);
        setHeard(false);
        setToday(d);
      }
      todayRef.current = d;
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => () => stopSound(), []);

  const quiz = useMemo(() => (today ? buildDailyQuiz(today) : []), [today]);
  const day: EarDay = (today && record.days[today]) || { picks: [], marks: [] };
  const done = isDone(day);
  const streak = today ? currentStreak(record, today) : 0;
  const index = reveal ?? day.picks.length;
  const question = quiz[index];

  const handleStart = useCallback(() => {
    setStarted(true);
    setHeard(false);
    track('ear_start', { streak });
  }, [streak]);

  function handlePick(key: string) {
    if (!today || !question || reveal !== null || done) return;
    const correct = key === question.answer;
    const next = addAnswer(record, today, key, correct);
    saveRecord(next);
    setRecord(next);
    setReveal(index);
    track('ear_answer', { index: index + 1, type: question.type, correct });
    if (isDone(next.days[today])) {
      track('ear_complete', { score: next.days[today].marks.filter(Boolean).length, streak: next.current });
    }
  }

  function handleNext() {
    stopSound();
    setReveal(null);
    setHeard(false);
  }

  if (!today) {
    return <main className="min-h-screen bg-comic-cream" />;
  }

  // ─── 결과 (오늘 다 풂, 정답 공개 화면을 넘긴 뒤) ───
  if (done && reveal === null) {
    const score = day.marks.filter(Boolean).length;
    return (
      <main className="min-h-screen bg-comic-cream px-4 py-8 max-w-2xl mx-auto space-y-5" style={FONT}>
        <section className={`${CARD} p-6 text-center`} style={{ boxShadow: '6px 6px 0 #0A0A0A' }}>
          <p className="text-[13px] font-bold text-[#0A0A0A]/60">
            {t('오늘의 음감')} · {formatDate(today)}
          </p>
          <p className="mt-2 font-bungee text-[56px] leading-none text-[#0A0A0A]">
            {score}/{EAR_QUESTION_COUNT}
          </p>
          <p className="mt-3 text-[28px] tracking-[4px]" aria-label={t('정답 {n}개', { n: score })}>
            {day.marks.map((ok) => (ok ? '🟩' : '🟥')).join('')}
          </p>
          <p className="mt-3 text-[16px] font-bold text-[#0A0A0A]" style={{ fontWeight: 900 }}>
            🔥 {t('{n}일째', { n: streak })}
            <span className="ml-2 text-[13px] font-bold text-[#0A0A0A]/50">{t('최장 {n}일', { n: record.best })}</span>
          </p>
          <p className="mt-4 text-[13px] font-bold text-[#0A0A0A]/60">
            {t('내일 문제까지')} <span className="font-bungee text-[#0A0A0A]">{formatCountdown(countdown)}</span>
          </p>
        </section>

        <EarShare date={today} day={day} streak={streak} />

        <PushOptIn kind="ear" targetId={EAR_TARGET_ID} where="ear" />

        <section className={`${CARD} p-5`} style={{ boxShadow: '4px 4px 0 #0A0A0A' }}>
          <h2 className="text-[15px] font-bold text-[#0A0A0A]">{t('정답 복습')}</h2>
          <ul className="mt-1">
            {quiz.map((q, i) => (
              <ReviewRow key={q.type} index={i} question={q} pick={day.picks[i]} correct={day.marks[i]} />
            ))}
          </ul>
        </section>

        <div className="grid gap-3">
          {!isJapanMode && (
            <Link
              href="/search"
              className={`${CARD} block px-5 py-4 text-[15px] font-bold text-[#0A0A0A]`}
              style={{ boxShadow: '4px 4px 0 #0A0A0A' }}
            >
              📍 {t('이번 주 합주할 곳 찾기')} →
            </Link>
          )}
          <Link
            href="/stems"
            className={`${CARD} block px-5 py-4 text-[15px] font-bold text-[#0A0A0A]`}
            style={{ boxShadow: '4px 4px 0 #0A0A0A' }}
          >
            🎸 {t('오늘 들은 진행으로 8마디 만들기')} →
          </Link>
        </div>
      </main>
    );
  }

  // ─── 시작 ───
  if (!started && reveal === null) {
    const resumed = day.picks.length > 0;
    return (
      <main className="min-h-screen bg-comic-cream px-4 py-8 max-w-2xl mx-auto space-y-5" style={FONT}>
        <section className={`${CARD} p-6 text-center`} style={{ boxShadow: '6px 6px 0 #0A0A0A' }}>
          <p className="inline-block px-3 py-1 rounded-full border-[2px] border-[#0A0A0A] bg-[#F5FF4F] text-[13px] font-bold">
            🎧 {formatDate(today)}
          </p>
          <h1 className="mt-3 text-[28px] text-[#0A0A0A]" style={{ fontWeight: 900 }}>
            {t('오늘의 음감')}
          </h1>
          <p className="mt-2 text-[14px] font-bold text-[#0A0A0A]/60 break-keep">
            {t('하루 한 번, 모두 같은 5문제. 듣고 맞혀 보세요.')}
          </p>
          <p className="mt-4 text-[15px] font-bold text-[#0A0A0A]">
            🔥 {streak > 0 ? t('{n}일째 이어가는 중', { n: streak }) : t('오늘부터 연속 기록 시작')}
          </p>
          <motion.button
            type="button"
            onClick={handleStart}
            whileTap={{ scale: 0.95, x: 2, y: 2 }}
            className="mt-5 w-full min-h-[56px] py-4 rounded-[16px] border-[3px] border-[#0A0A0A] bg-[#FF3D77] text-white text-[17px] font-bold"
            style={{ boxShadow: '4px 4px 0 #0A0A0A' }}
          >
            {resumed ? t('이어 풀기 ({n}/5)', { n: day.picks.length + 1 }) : t('시작')}
          </motion.button>
          <p className="mt-3 text-[12px] text-[#0A0A0A]/50">{t('소리가 나요. 이어폰을 추천해요.')}</p>
        </section>
      </main>
    );
  }

  // ─── 문제 ───
  if (!question) return null;
  const answered = reveal !== null;
  const pick = answered ? day.picks[index] : null;
  const twoChoices = question.choices.length === 2;

  return (
    <main className="min-h-screen bg-comic-cream px-4 py-8 max-w-2xl mx-auto space-y-5" style={FONT}>
      <div className="flex items-center justify-center gap-2" aria-label={t('{n}번째 문제', { n: index + 1 })}>
        {quiz.map((q, i) => {
          const mark = day.marks[i];
          const bg = i < day.marks.length ? (mark ? 'bg-[#41C66B]' : 'bg-[#FF3D77]') : i === index ? 'bg-[#F5FF4F]' : 'bg-white';
          return <span key={q.type} className={`w-4 h-4 rounded-full border-[2px] border-[#0A0A0A] ${bg}`} />;
        })}
      </div>

      <section className={`${CARD} p-5`} style={{ boxShadow: '6px 6px 0 #0A0A0A' }}>
        <p className="text-[13px] font-bold text-[#0A0A0A]/50">
          {index + 1} / {EAR_QUESTION_COUNT}
        </p>
        <h1 className="mt-1 text-[20px] text-[#0A0A0A] break-keep" style={{ fontWeight: 900 }}>
          {t(question.prompt)}
        </h1>
        <div className="mt-4">
          <ListenButton key={`${today}-${index}`} question={question} heard={heard || answered} onPlayed={() => setHeard(true)} />
        </div>
        {!heard && !answered && <p className="mt-2 text-[12px] text-[#0A0A0A]/50 text-center">{t('먼저 들어 보세요')}</p>}

        <div className={`mt-4 grid gap-3 ${twoChoices ? 'grid-cols-2' : 'grid-cols-1 sm:grid-cols-2'}`}>
          {question.choices.map((c) => {
            const isAnswer = c.key === question.answer;
            const isPick = c.key === pick;
            const state = !answered ? 'idle' : isAnswer ? 'answer' : isPick ? 'wrong' : 'other';
            const style =
              state === 'answer'
                ? 'bg-[#41C66B] text-white'
                : state === 'wrong'
                  ? 'bg-[#FF3D77] text-white'
                  : state === 'other'
                    ? 'bg-white text-[#0A0A0A]/40'
                    : 'bg-white text-[#0A0A0A]';
            return (
              <motion.button
                key={c.key}
                type="button"
                onClick={() => handlePick(c.key)}
                disabled={answered || !heard}
                whileTap={answered || !heard ? undefined : { scale: 0.95, x: 2, y: 2 }}
                className={`min-h-[52px] px-3 py-3 rounded-[14px] border-[3px] border-[#0A0A0A] text-[15px] font-bold break-keep disabled:cursor-default ${style} ${
                  !answered && !heard ? 'opacity-50' : ''
                }`}
                style={{ boxShadow: '3px 3px 0 #0A0A0A' }}
              >
                {state === 'answer' ? '✓ ' : state === 'wrong' ? '✗ ' : ''}
                {t(c.label)}
              </motion.button>
            );
          })}
        </div>

        {answered && (
          <div className="mt-5">
            <p className="text-center text-[16px] font-bold" style={{ fontWeight: 900 }}>
              {day.marks[index] ? t('정답! 🎉') : t('아쉬워요. 정답을 다시 들어 보세요')}
            </p>
            <motion.button
              type="button"
              onClick={handleNext}
              whileTap={{ scale: 0.95, x: 2, y: 2 }}
              className="mt-3 w-full min-h-[52px] py-3 rounded-[14px] border-[3px] border-[#0A0A0A] bg-[#F5FF4F] text-[16px] font-bold text-[#0A0A0A]"
              style={{ boxShadow: '3px 3px 0 #0A0A0A' }}
            >
              {index + 1 < EAR_QUESTION_COUNT ? t('다음 문제 →') : t('결과 보기 →')}
            </motion.button>
          </div>
        )}
      </section>
    </main>
  );
}
