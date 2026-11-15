'use client';

// 8마디 놀이형 동시 녹음.
// [녹음 시작] → 마이크 → 카운트인(메트로놈) → 끝나는 순간 이전 트랙 합주 재생 + 마이크 녹음 동시 시작
// → 8마디 길이 지나면 자동 정지 → 녹음된 단독 webm blob 을 onRecorded 로 전달(기존 업로드 경로 재사용).
// 레벨 A: 레이턴시 보정 없음. 단순 동시 start.

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Mic, Square } from 'lucide-react';
import { loadTracks } from '@/lib/ensemble-audio';
import { useTakeRecorder, TAKE_BARS, TAKE_COUNT_IN_BEATS } from '@/hooks/useTakeRecorder';
import { useT } from '@/lib/i18n';

export type JamMode = 'layer' | 'extend';

interface Props {
  projectId: string;
  bpm: number;
  /** 쌓기(레이어) 모드에서 깔아줄 최근 섹션의 트랙 URL. */
  layerBackingUrls: string[];
  /** 기존 트랙이 있는지. false면 첫 주자(모드 선택 무의미, 카운트인+녹음만). */
  hasPrevious: boolean;
  onRecorded: (blob: Blob, mode: JamMode) => void;
  /**
   * 백킹 잼 프로젝트면 반주 8마디(합성). 쌓기·이어붙이기 모두 깐다(이어붙인 섹션에도 같은 반주).
   * 없거나 null을 돌려주면 기존과 똑같이 동작
   */
  jamBacking?: () => Promise<AudioBuffer | null>;
}

const BARS = TAKE_BARS;
const COUNT_IN_BEATS = TAKE_COUNT_IN_BEATS;

export default function JamRecorder({ bpm, layerBackingUrls, hasPrevious, onRecorded, jamBacking }: Props) {
  const t = useT();
  // 기본값: 이어붙이기(확장) — "8마디 추가"의 자연스러운 모델. 첫 주자는 어차피 동일.
  const [mode, setMode] = useState<JamMode>('extend');
  const rec = useTakeRecorder(bpm);
  const { phase, countNumber, currentBar, error, totalSec } = rec;

  const isFirstRunner = !hasPrevious;
  // 쌓기 모드일 때만 이전 트랙을 깐다(같은 8마디 위에 겹침). 이어붙이기는 새 섹션이라 이전 트랙 없음.
  const backingUrls = mode === 'layer' ? layerBackingUrls : [];

  function handleStart() {
    const recordMode: JamMode = isFirstRunner ? 'extend' : mode;
    void rec.start({
      loadBacking: async (ctx) => {
        const buffers = backingUrls.length > 0 ? await loadTracks(backingUrls, ctx) : [];
        const jam = jamBacking ? await jamBacking() : null;
        return jam ? [jam, ...buffers] : buffers;
      },
      onRecorded: (blob) => onRecorded(blob, recordMode),
    });
  }

  function handleCancel() {
    rec.cancel();
  }

  // ---- UI ----
  return (
    <div className="flex flex-col items-center gap-4 p-5 bg-white rounded-[16px] border-[3px] border-dashed border-[#0A0A0A]/30">
      {phase === 'idle' || phase === 'done' || phase === 'error' ? (
        <>
          <div className="w-14 h-14 rounded-full bg-[#FFB627]/15 border-[3px] border-[#FFB627] flex items-center justify-center">
            <span className="text-[26px]">🎸</span>
          </div>
          {/* 모드 선택: 쌓기(합주) vs 이어붙이기(확장) — 항상 표시(발견성). 첫 주자는 결과 동일. */}
          <div
            className="flex w-full rounded-[12px] border-[2px] border-[#0A0A0A] overflow-hidden"
            style={{ boxShadow: '2px 2px 0 #0A0A0A' }}
          >
            {(['extend', 'layer'] as JamMode[]).map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={[
                  'flex-1 py-2.5 text-[12px] font-bold transition-colors',
                  mode === m ? 'bg-[#0A0A0A] text-white' : 'bg-white text-[#0A0A0A]/50 hover:bg-[#0A0A0A]/5',
                ].join(' ')}
                style={{ fontFamily: 'Pretendard, sans-serif' }}
              >
                {m === 'extend' ? t('➡️ 이어붙이기 (8마디 확장)') : t('🔼 쌓기 (합주로 두껍게)')}
              </button>
            ))}
          </div>
          <p
            className="text-[12px] text-[#0A0A0A]/60 font-bold text-center leading-relaxed"
            style={{ fontFamily: 'Pretendard, sans-serif' }}
          >
            {isFirstRunner ? (
              <>
                {t('첫 8마디예요! 카운트인 4박 뒤 바로 녹음돼요 🥁')}
                <br />
                <span className="text-[12px] text-[#0A0A0A]/40">{t('다음 주자가 이어붙이거나(확장) 쌓을 수(합주) 있어요')}</span>
              </>
            ) : mode === 'extend' ? (
              <>
                {t('새 8마디를 곡')} <b>{t('뒤에 이어 붙여요')}</b>{t('. 카운트인 후')}
                <br />
                {t('내 연주만 녹음 → 곡이 길어집니다 ➡️')}
              </>
            ) : (
              <>
                {t('최근 8마디')} <b>{t('위에 겹쳐 쌓아요')}</b>{t('. 이전 트랙이 깔리고')}
                <br />
                {t('동시에 녹음 → 합주로 두꺼워져요 🔼')}
              </>
            )}
          </p>
          {phase === 'done' && (
            <p className="text-[12px] font-bold text-[#41C66B]" style={{ fontFamily: 'Pretendard, sans-serif' }}>
              {t('✅ 녹음 완료! 아래에서 등록하거나 다시 녹음하세요')}
            </p>
          )}
          {phase === 'error' && error && (
            <p className="text-[12px] font-bold text-[#FF3D77] text-center whitespace-pre-line" style={{ fontFamily: 'Pretendard, sans-serif' }}>
              ⚠️ {error}
            </p>
          )}
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={handleStart}
            className="px-6 py-3 bg-[#FFB627] rounded-[12px] border-[2px] border-[#0A0A0A] text-[#0A0A0A] font-bold text-[13px] flex items-center gap-2"
            style={{ boxShadow: '3px 3px 0 #0A0A0A', fontFamily: 'Pretendard, sans-serif' }}
          >
            <Mic className="w-4 h-4" /> {phase === 'done' ? t('다시 함께 연주') : t('함께 연주 시작')} 🎙️
          </motion.button>
          <p className="text-[12px] text-[#0A0A0A]/40 font-bold" style={{ fontFamily: 'Pretendard, sans-serif' }}>
            {t('♩ {bpm} BPM · {bars}마디 (약 {sec}초) · 헤드폰 권장 🎧', { bpm, bars: BARS, sec: Math.round(totalSec) })}
          </p>
        </>
      ) : phase === 'preparing' ? (
        <p className="text-[14px] font-bold text-[#0A0A0A]/60 py-6" style={{ fontFamily: 'Pretendard, sans-serif' }}>
          {t('준비 중... 🎚️')}
        </p>
      ) : phase === 'countin' ? (
        <div className="flex flex-col items-center gap-3 py-4">
          <motion.div
            key={countNumber}
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="text-[72px] font-bold text-[#FF3D77] leading-none"
            style={{ fontFamily: 'Bungee, sans-serif' }}
          >
            {countNumber || COUNT_IN_BEATS}
          </motion.div>
          <p className="text-[12px] font-bold text-[#0A0A0A]/50" style={{ fontFamily: 'Pretendard, sans-serif' }}>
            {t('카운트인... 준비하세요!')}
          </p>
        </div>
      ) : (
        // recording
        <div className="flex flex-col items-center gap-4 w-full py-2">
          <div className="relative flex items-center justify-center w-20 h-20">
            <motion.div
              className="absolute inset-0 rounded-full bg-[#FF3D77]/20"
              animate={{ scale: [1, 1.3, 1] }}
              transition={{ duration: 60 / Math.max(bpm, 1), repeat: Infinity, ease: 'easeInOut' }}
            />
            <div className="w-12 h-12 rounded-full bg-[#FF3D77] border-[3px] border-[#0A0A0A] flex items-center justify-center z-10">
              <Mic className="w-5 h-5 text-white" />
            </div>
          </div>
          <p className="text-[15px] font-bold text-[#FF3D77]" style={{ fontFamily: 'Bungee, sans-serif' }}>
            {t('REC · {currentBar} / {bars}마디', { currentBar, bars: BARS })}
          </p>
          {/* 마디 진행바 */}
          <div className="flex gap-1 w-full">
            {Array.from({ length: BARS }).map((_, i) => (
              <div
                key={i}
                className="flex-1 h-2.5 rounded-full border-[1.5px] border-[#0A0A0A] transition-colors"
                style={{ backgroundColor: i < currentBar ? '#FF3D77' : '#FFF' }}
              />
            ))}
          </div>
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={handleCancel}
            className="px-5 py-2.5 bg-[#0A0A0A] rounded-[12px] border-[2px] border-[#0A0A0A] text-white font-bold text-[12px] flex items-center gap-2"
            style={{ boxShadow: '3px 3px 0 #0A0A0A', fontFamily: 'Pretendard, sans-serif' }}
          >
            <Square className="w-4 h-4 fill-white" /> {t('중단')}
          </motion.button>
        </div>
      )}
    </div>
  );
}
