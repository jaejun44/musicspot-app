'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { track } from '@/lib/analytics';
import { unlockEarAudio } from '@/lib/ear/synth';
import { kstToday } from '@/lib/ear/daily';
import { startJam, type JamPlayer, type JamPosition, type JamSpec, type Part } from '@/lib/jam/engine';
import { markJamPlayed } from '@/lib/jam/storage';

type WakeLockSentinelLike = { release: () => Promise<void> };
type WakeLockNavigator = Navigator & { wakeLock?: { request: (type: 'screen') => Promise<WakeLockSentinelLike> } };

export type JamNotice = '' | 'underrun' | 'interrupted' | 'error';

interface Options {
  slug: string;
  spec: JamSpec;
  isDaily: boolean;
}

/**
 * 백킹 잼 재생 상태. 첫 재생은 사용자 탭 안에서(unlockEarAudio — 음감과 같은 iOS 무음 모드 대응).
 * - BPM: 다음 마디부터(엔진이 아직 예약 안 한 마디에 반영)
 * - 음소거: 즉시
 * - 진행(코드)이 바뀌면 재생 중일 때 새로 시작
 * - 탭을 다녀왔는데 오디오가 멈춰 있으면(iOS 등) 정지하고 안내
 */
export function useJamPlayer({ slug, spec, isDaily }: Options) {
  const [playing, setPlaying] = useState(false);
  const [pos, setPos] = useState<JamPosition | null>(null);
  const [notice, setNotice] = useState<JamNotice>('');
  const [countIn, setCountIn] = useState(true);
  const [muted, setMuted] = useState<Record<Part, boolean>>({ drums: false, bass: false, chords: false });
  const [bpm, setBpmState] = useState(spec.bpm);

  const player = useRef<JamPlayer | null>(null);
  const ctxRef = useRef<AudioContext | null>(null);
  const startedAt = useRef(0);
  const wake = useRef<WakeLockSentinelLike | null>(null);
  // 최신 값(콜백 안에서 쓰기)
  const live = useRef({ slug, spec, bpm, countIn, muted, isDaily });
  live.current = { slug, spec, bpm, countIn, muted, isDaily };

  const requestWake = useCallback(async () => {
    const wl = (navigator as WakeLockNavigator).wakeLock;
    if (!wl || document.visibilityState !== 'visible') return;
    try {
      wake.current = await wl.request('screen');
    } catch (e) {
      console.warn('[jam] 화면 꺼짐 방지 실패', e);
    }
  }, []);

  const releaseWake = useCallback(() => {
    wake.current?.release().catch(() => {});
    wake.current = null;
  }, []);

  const stop = useCallback(
    (why: JamNotice = '') => {
      const p = player.current;
      if (!p) return;
      p.stop();
      player.current = null;
      setPlaying(false);
      setPos(null);
      releaseWake();
      if (why) setNotice(why);
      track('jam_stop', { slug: live.current.slug, seconds: Math.round((performance.now() - startedAt.current) / 1000) });
    },
    [releaseWake],
  );

  const begin = useCallback(
    (ctx: AudioContext) => {
      const { spec: s, bpm: b, countIn: c, muted: m } = live.current;
      const p = startJam(ctx, { ...s, bpm: b }, { countIn: c, onUnderrun: () => stopRef.current('underrun') });
      (Object.keys(m) as Part[]).forEach((k) => m[k] && p.setMute(k, true));
      player.current = p;
    },
    [],
  );
  const stopRef = useRef(stop);
  stopRef.current = stop;

  /** 탭 핸들러에서 호출 */
  const play = useCallback(async () => {
    setNotice('');
    try {
      const ctx = await unlockEarAudio();
      ctxRef.current = ctx;
      player.current?.stop();
      begin(ctx);
      startedAt.current = performance.now();
      setPlaying(true);
      markJamPlayed(kstToday(new Date()));
      const { slug: sl, bpm: b, isDaily: d } = live.current;
      track('jam_play', { slug: sl, bpm: b, is_daily: d });
      requestWake();
    } catch (e) {
      console.error('[jam] 재생 시작 실패', e);
      setNotice('error');
    }
  }, [begin, requestWake]);

  const setBpm = useCallback((v: number) => {
    setBpmState(v);
    player.current?.setBpm(v);
  }, []);

  const toggleMute = useCallback((part: Part) => {
    setMuted((m) => {
      const next = { ...m, [part]: !m[part] };
      player.current?.setMute(part, next[part]);
      return next;
    });
  }, []);

  // 진행이 바뀌면(진행 선택) 재생 중일 때 새 진행으로 다시 시작
  const chordsKey = JSON.stringify(spec.chords);
  const firstChords = useRef(chordsKey);
  useEffect(() => {
    if (firstChords.current === chordsKey) return;
    firstChords.current = chordsKey;
    if (player.current && ctxRef.current) {
      player.current.stop();
      begin(ctxRef.current);
    }
  }, [chordsKey, begin]);

  // 현재 마디·박 표시
  useEffect(() => {
    if (!playing) return;
    let raf = 0;
    const loop = () => {
      setPos(player.current?.position() ?? null);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [playing]);

  // 탭을 다녀왔을 때: 오디오가 멈춰 있으면(iOS 백그라운드 등) 박자가 무너진 것 → 정지·안내. 아니면 화면 꺼짐 방지 다시
  useEffect(() => {
    const onVis = () => {
      if (document.visibilityState !== 'visible' || !player.current) return;
      if (ctxRef.current && ctxRef.current.state !== 'running') stopRef.current('interrupted');
      else requestWake();
    };
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, [requestWake]);

  // 페이지를 떠나면 정지(기록도 남김). 탭을 닫을 때는 언마운트가 안 돌아서 pagehide로(전송은 최선)
  useEffect(() => {
    const onHide = () => stopRef.current();
    window.addEventListener('pagehide', onHide);
    return () => {
      window.removeEventListener('pagehide', onHide);
      stopRef.current();
    };
  }, []);

  return { playing, pos, notice, countIn, setCountIn, muted, toggleMute, bpm, setBpm, play, stop: () => stop() };
}
