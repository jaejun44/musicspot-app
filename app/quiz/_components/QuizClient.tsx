'use client';

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import Link from 'next/link';

// ─── 타입 ───────────────────────────────────────────────────────────────────
type InstrumentKey = 'guitar' | 'bass' | 'drums' | 'vocal' | 'keyboard';

interface Question {
  id: number;
  text: string;
  character: string; // ms_character 이미지 파일명
  options: { text: string; scores: Partial<Record<InstrumentKey, number>> }[];
}

interface Result {
  key: InstrumentKey;
  emoji: string;
  instrument: string;
  title: string;
  description: string;
  musicians: string[];
  character: string;
  bg: string;
  accent: string;
  badge: string;
}

// ─── 퀴즈 데이터 ─────────────────────────────────────────────────────────────
const QUESTIONS: Question[] = [
  {
    id: 1,
    text: '친구들 사이에서 나는 어떤 존재인가요?',
    character: 'trio',
    options: [
      { text: '🎤 대화를 주도하고 분위기를 이끄는 사람', scores: { vocal: 2, guitar: 1 } },
      { text: '🤝 눈에 띄진 않지만 없으면 허전한 사람', scores: { bass: 2 } },
      { text: '⚡ 신나면 몸이 먼저 반응하는 에너지 덩어리', scores: { drums: 2 } },
      { text: '💡 독특한 아이디어로 모두를 놀라게 하는 사람', scores: { keyboard: 2, guitar: 1 } },
    ],
  },
  {
    id: 2,
    text: '스트레스를 받으면 어떻게 해소하나요?',
    character: 'rocker',
    options: [
      { text: '🗣️ 크게 소리 지르거나 노래를 부른다', scores: { vocal: 2, drums: 1 } },
      { text: '🎧 혼자 음악 들으며 조용히 충전한다', scores: { bass: 2, keyboard: 1 } },
      { text: '🏃 격렬한 운동으로 에너지를 발산한다', scores: { drums: 2 } },
      { text: '🎨 뭔가를 창작하거나 손으로 만든다', scores: { keyboard: 2, guitar: 1 } },
    ],
  },
  {
    id: 3,
    text: '게임에서 내가 선택하는 역할은?',
    character: 'girl',
    options: [
      { text: '⚔️ 딜러 — 화력으로 눈에 띄게 적을 제압한다', scores: { guitar: 2, vocal: 1 } },
      { text: '💚 서포터/힐러 — 뒤에서 팀원을 살린다', scores: { bass: 2 } },
      { text: '🛡️ 탱커 — 앞에서 버텨주는 게 내 사명', scores: { drums: 2, bass: 1 } },
      { text: '🔮 마법사/전략가 — 지식으로 상황을 뒤집는다', scores: { keyboard: 2, vocal: 1 } },
    ],
  },
  {
    id: 4,
    text: '좋아하는 음악을 들을 때 나도 모르게 따라 하는 건?',
    character: 'diva',
    options: [
      { text: '🎵 가사를 따라 부르거나 허밍한다', scores: { vocal: 2 } },
      { text: '🔉 저음 라인을 귀 기울여 흥얼거린다', scores: { bass: 2 } },
      { text: '🥁 손이나 발로 리듬을 두드린다', scores: { drums: 2, guitar: 1 } },
      { text: '🎼 멜로디와 화음에 빠져든다', scores: { keyboard: 2, guitar: 1 } },
    ],
  },
  {
    id: 5,
    text: '밴드를 한다면 어떤 스타일을 원하나요?',
    character: 'rocker',
    options: [
      { text: '🎤 마이크 잡고 무대 위에서 열정적으로 퍼포먼스', scores: { vocal: 2 } },
      { text: '🎸 화려한 솔로로 관중을 압도하고 싶다', scores: { guitar: 2 } },
      { text: '🎵 탄탄한 리듬으로 밴드 전체를 받쳐주고 싶다', scores: { bass: 2, drums: 1 } },
      { text: '🎹 전자음과 악기를 넘나드는 새로운 사운드', scores: { keyboard: 2 } },
    ],
  },
  {
    id: 6,
    text: '일할 때 나의 스타일은?',
    character: 'girl',
    options: [
      { text: '🏁 목표를 정하고 앞에서 팀을 이끈다', scores: { vocal: 2, guitar: 1 } },
      { text: '✅ 꼼꼼하게 체크하며 실수 없이 완수한다', scores: { bass: 2 } },
      { text: '⚡ 빠르게 결정하고 즉각 실행한다', scores: { drums: 2 } },
      { text: '🔍 여러 가능성을 탐색하며 창의적으로 해결한다', scores: { keyboard: 2, guitar: 1 } },
    ],
  },
  {
    id: 7,
    text: '나를 가장 잘 표현하는 단어는?',
    character: 'trio',
    options: [
      { text: '🔥 카리스마', scores: { vocal: 2, guitar: 1 } },
      { text: '💎 신뢰감', scores: { bass: 2 } },
      { text: '⚡ 에너지', scores: { drums: 2 } },
      { text: '✨ 창의성', scores: { keyboard: 2, guitar: 1 } },
    ],
  },
];

// ─── 결과 데이터 ──────────────────────────────────────────────────────────────
const RESULTS: Record<InstrumentKey, Result> = {
  guitar: {
    key: 'guitar',
    emoji: '🎸',
    instrument: '일렉기타',
    title: '자유로운 영혼의 락스타',
    description:
      '강렬한 솔로와 화려한 퍼포먼스로 무대를 불태우는 당신! 청중의 시선을 한 몸에 받는 것이 자연스럽고, 규칙보다 감성을 따르는 자유로운 에너지가 넘칩니다. 번뜩이는 창의력과 폭발적인 열정으로 어디서든 존재감을 뿜어내는 진짜 락스타 DNA를 가졌어요.',
    musicians: ['슬래시 (건즈 앤 로지즈)', '커트 코베인 (너바나)', '지미 페이지 (레드 제플린)'],
    character: 'rocker',
    bg: '#FF3D77',
    accent: '#0A0A0A',
    badge: '#F5FF4F',
  },
  bass: {
    key: 'bass',
    emoji: '🎸',
    instrument: '베이스 기타',
    title: '무대의 숨은 MVP',
    description:
      '겉으론 조용해 보여도 밴드의 핵심은 바로 당신! 묵직한 저음으로 모든 것을 떠받치는 베이시스트 타입이에요. 신뢰감 있고 팀을 안정시키는 능력이 탁월한 당신, 사실 이 자리 없이는 밴드 전체가 흔들립니다. 화려하지 않아도 없으면 안 되는 진짜 MVP랍니다.',
    musicians: ['폴 매카트니 (비틀즈)', '레미 킬미스터 (모터헤드)', '존 폴 존스 (레드 제플린)'],
    character: 'diva',
    bg: '#4FC3F7',
    accent: '#0A0A0A',
    badge: '#FF3D77',
  },
  drums: {
    key: 'drums',
    emoji: '🥁',
    instrument: '드럼',
    title: '밴드의 심장',
    description:
      '터지는 에너지와 일정한 리듬으로 밴드 전체를 이끄는 엔진! 당신이 박자를 잡으면 모두가 흔들립니다. 강한 추진력과 넘치는 체력, 무엇이든 직접 부딪히는 행동파인 당신에게 드럼은 운명 같은 악기예요. 강렬하고 변함없는 비트처럼, 당신이 있으면 밴드가 살아납니다.',
    musicians: ['존 본햄 (레드 제플린)', '데이브 그롤 (너바나)', '닐 피어트 (러시)'],
    character: 'girl',
    bg: '#242447',
    accent: '#FFFFFF',
    badge: '#F5FF4F',
  },
  vocal: {
    key: 'vocal',
    emoji: '🎤',
    instrument: '보컬',
    title: '무대를 지배하는 카리스마',
    description:
      '타고난 존재감과 폭발적인 표현력으로 모두를 사로잡는 당신! 말 한마디, 눈빛 하나로 사람들의 감정을 움직이는 천부적인 퍼포머예요. 주목받는 것이 오히려 에너지가 되는 진정한 프론트맨/우먼. 마이크만 잡으면 무대가 당신의 것이 됩니다.',
    musicians: ['프레디 머큐리 (퀸)', '로버트 플랜트 (레드 제플린)', '악셀 로즈 (건즈 앤 로지즈)'],
    character: 'trio',
    bg: '#F5FF4F',
    accent: '#0A0A0A',
    badge: '#FF3D77',
  },
  keyboard: {
    key: 'keyboard',
    emoji: '🎹',
    instrument: '키보드/신스',
    title: '밴드의 비밀 무기',
    description:
      '어떤 장르도 소화하는 만능 뮤지션! 클래식한 오르간부터 사이키델릭 신스까지 넘나드는 당신은 밴드에 깊이와 색채를 더하는 숨겨진 보석이에요. 창의적이고 지적인 접근으로 음악을 새로운 차원으로 끌어올리는, 알고 보면 가장 강력한 존재입니다.',
    musicians: ['존 로드 (딥 퍼플)', '레이 만자렉 (도어즈)', '조던 루데스 (드림 시어터)'],
    character: 'guitar',
    bg: '#41C66B',
    accent: '#0A0A0A',
    badge: '#FF3D77',
  },
};

// ─── 캐릭터 이미지 맵 ─────────────────────────────────────────────────────────
const CHARACTER_IMAGES: Record<string, string> = {
  trio: '/ms_character/Leonardo_Anime_XL_three_cute_chibi_rockstar_kids_standing_toge_1_3418649b-25bc-4055-a8f1-4ad72f27c7a6.jpg',
  diva: '/ms_character/Leonardo_Anime_XL_cute_chibi_character_elegant_diva_little_key_3.jpg',
  rocker: '/ms_character/lucid-origin_cute_chibi_character_mischievous_little_rockstar_kid_holding_a_hot_pink_electric-0.jpg',
  girl: '/ms_character/Leonardo_Anime_XL_cute_chibi_character_tough_strong_little_gir_2.jpg',
  guitar: '/ms_character/Leonardo_Anime_XL_cute_chibi_character_mischievous_little_rock_2.jpg',
};

// ─── 점수 계산 ────────────────────────────────────────────────────────────────
function calcResult(answers: Partial<Record<InstrumentKey, number>>): InstrumentKey {
  const order: InstrumentKey[] = ['drums', 'guitar', 'vocal', 'bass', 'keyboard'];
  let best: InstrumentKey = 'guitar';
  let max = -1;
  for (const key of order) {
    const score = answers[key] ?? 0;
    if (score > max) { max = score; best = key; }
  }
  return best;
}

// ─── 공유 ─────────────────────────────────────────────────────────────────────
const BASE_URL = 'https://musicspotapp.vercel.app';

function shareKakao(result: Result) {
  const url = `${BASE_URL}/quiz`;
  if (typeof window !== 'undefined' && (window as any).Kakao?.isInitialized()) {
    (window as any).Kakao.Share.sendDefault({
      objectType: 'feed',
      content: {
        title: `나의 악기 유형은 "${result.instrument}" — ${result.title}!`,
        description: `${result.emoji} 락·메탈 밴드 악기 유형 테스트 | Music Spot`,
        imageUrl: `${BASE_URL}/opengraph-image`,
        link: { mobileWebUrl: url, webUrl: url },
      },
      buttons: [{ title: '나도 테스트하기 🎸', link: { mobileWebUrl: url, webUrl: url } }],
    });
  }
}

async function copyLink(result: Result) {
  const text = `나의 락밴드 악기 유형은 "${result.instrument}" (${result.title})! 🎸\n너는? → ${BASE_URL}/quiz`;
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    // fallback
  }
}

// ─── 미니사이트 헤더 ──────────────────────────────────────────────────────────
function QuizHeader() {
  return (
    <header className="w-full flex items-center justify-between px-5 py-3 border-b-[2px] border-[#0A0A0A]/10">
      <Link href="/" className="flex items-center gap-2 group">
        <Image
          src="/ms_character/cutout_clean.png"
          alt="Music Spot"
          width={36}
          height={36}
          className="object-contain"
        />
        <span
          className="font-bungee text-sm text-[#0A0A0A] group-hover:text-[#FF3D77] transition-colors"
          style={{ letterSpacing: '0.05em' }}
        >
          MUSIC SPOT
        </span>
      </Link>
      <span className="bg-[#F5FF4F] font-bold text-[10px] text-[#0A0A0A] px-2.5 py-0.5 rounded-full border-[2px] border-[#0A0A0A]">
        악기 테스트
      </span>
    </header>
  );
}

// ─── 컴포넌트 ─────────────────────────────────────────────────────────────────
type Phase = 'intro' | 'quiz' | 'result';

export default function QuizClient() {
  const [phase, setPhase] = useState<Phase>('intro');
  const [current, setCurrent] = useState(0);
  const [scores, setScores] = useState<Partial<Record<InstrumentKey, number>>>({});
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const [copied, setCopied] = useState(false);
  const [direction, setDirection] = useState(1);

  const handleAnswer = useCallback(
    (optionIdx: number) => {
      if (selectedIdx !== null) return;
      setSelectedIdx(optionIdx);

      const option = QUESTIONS[current].options[optionIdx];
      const next: Partial<Record<InstrumentKey, number>> = { ...scores };
      for (const [k, v] of Object.entries(option.scores)) {
        next[k as InstrumentKey] = (next[k as InstrumentKey] ?? 0) + (v as number);
      }

      setTimeout(() => {
        setSelectedIdx(null);
        setDirection(1);
        if (current + 1 < QUESTIONS.length) {
          setCurrent((c) => c + 1);
          setScores(next);
        } else {
          const key = calcResult(next);
          setResult(RESULTS[key]);
          setPhase('result');
        }
      }, 600);
    },
    [current, scores, selectedIdx],
  );

  const restart = () => {
    setCurrent(0);
    setScores({});
    setSelectedIdx(null);
    setResult(null);
    setPhase('intro');
  };

  const handleCopy = async () => {
    if (!result) return;
    await copyLink(result);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // ── 인트로 ──────────────────────────────────────────────────────────────────
  if (phase === 'intro') {
    return (
      <div className="min-h-screen bg-[#FFF8F0] flex flex-col">
        <QuizHeader />
        <div className="flex-1 flex flex-col items-center justify-center px-4 py-12">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-lg"
        >
          {/* 헤더 뱃지 */}
          <div className="flex justify-center mb-6">
            <span className="bg-[#FF3D77] text-white font-bungee text-sm px-4 py-1 rounded-full border-[3px] border-[#0A0A0A]">
              MUSIC SPOT TEST
            </span>
          </div>

          {/* 타이틀 */}
          <div className="bg-white border-[3px] border-[#0A0A0A] rounded-[24px] shadow-[6px_6px_0_#0A0A0A] p-8 mb-6 text-center">
            <motion.div
              animate={{ rotate: [-2, 2, -2] }}
              transition={{ repeat: Infinity, duration: 2.5, ease: 'easeInOut' }}
              className="text-6xl mb-4"
            >
              🎸
            </motion.div>
            <h1 className="font-bungee text-3xl md:text-4xl text-[#0A0A0A] leading-tight mb-3">
              나에게 어울리는<br />
              <span className="text-[#FF3D77]">악기</span>는?
            </h1>
            <p className="text-[#0A0A0A]/70 text-base mb-1">
              락·메탈 밴드 악기 유형 테스트
            </p>
            <p className="text-[#0A0A0A]/50 text-sm">
              7가지 질문으로 알아보는 나의 악기 DNA 🎵
            </p>
          </div>

          {/* 캐릭터 */}
          <div className="flex justify-center gap-4 mb-6">
            {(['rocker', 'girl', 'diva'] as const).map((char, i) => (
              <motion.div
                key={char}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 + i * 0.1 }}
                whileHover={{ y: -6, rotate: i % 2 === 0 ? 3 : -3 }}
                className="w-24 h-24 rounded-[16px] border-[3px] border-[#0A0A0A] shadow-[4px_4px_0_#0A0A0A] overflow-hidden"
                style={{ rotate: `${i === 0 ? -2 : i === 1 ? 0 : 2}deg` }}
              >
                <Image
                  src={CHARACTER_IMAGES[char]}
                  alt={char}
                  width={96}
                  height={96}
                  className="w-full h-full object-cover"
                />
              </motion.div>
            ))}
          </div>

          {/* 결과 유형 미리보기 */}
          <div className="flex flex-wrap justify-center gap-2 mb-8">
            {Object.values(RESULTS).map((r) => (
              <span
                key={r.key}
                className="text-xs font-bold px-3 py-1 rounded-full border-[2px] border-[#0A0A0A]"
                style={{ background: r.bg, color: r.accent }}
              >
                {r.emoji} {r.instrument}
              </span>
            ))}
          </div>

          {/* 시작 버튼 */}
          <motion.button
            whileHover={{ y: -4, boxShadow: '8px 8px 0 #0A0A0A' }}
            whileTap={{ scale: 0.96, x: 3, y: 3, boxShadow: '2px 2px 0 #0A0A0A' }}
            onClick={() => setPhase('quiz')}
            className="w-full bg-[#FF3D77] text-white font-bungee text-xl py-4 rounded-[16px] border-[3px] border-[#0A0A0A] shadow-[6px_6px_0_#0A0A0A]"
          >
            테스트 시작하기 💥
          </motion.button>

          <p className="text-center text-[#0A0A0A]/40 text-xs mt-4">약 1분 소요</p>
        </motion.div>
        </div>
      </div>
    );
  }

  // ── 퀴즈 ──────────────────────────────────────────────────────────────────
  if (phase === 'quiz') {
    const q = QUESTIONS[current];
    const progress = ((current) / QUESTIONS.length) * 100;

    return (
      <div className="min-h-screen bg-[#FFF8F0] flex flex-col">
        <QuizHeader />
        <div className="flex-1 flex flex-col items-center px-4 py-8">
        <div className="w-full max-w-lg">
          {/* 프로그레스 */}
          <div className="mb-6">
            <div className="flex justify-between items-center mb-2">
              <span className="font-bungee text-sm text-[#0A0A0A]/60">
                {current + 1} / {QUESTIONS.length}
              </span>
              <span className="text-xs text-[#0A0A0A]/40">
                {Math.round(progress)}% 완료
              </span>
            </div>
            <div className="h-3 bg-white border-[2px] border-[#0A0A0A] rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-[#FF3D77] rounded-full"
                initial={{ width: `${((current) / QUESTIONS.length) * 100}%` }}
                animate={{ width: `${((current + 1) / QUESTIONS.length) * 100}%` }}
                transition={{ duration: 0.4, ease: 'easeOut' }}
              />
            </div>
          </div>

          {/* 캐릭터 + 말풍선 */}
          <AnimatePresence mode="wait">
            <motion.div
              key={`char-${current}`}
              initial={{ opacity: 0, x: direction * 40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: direction * -40 }}
              transition={{ duration: 0.3 }}
              className="flex items-end gap-4 mb-5"
            >
              <motion.div
                whileHover={{ y: -4 }}
                animate={{ y: [0, -5, 0] }}
                transition={{ repeat: Infinity, duration: 2.8, ease: 'easeInOut' }}
                className="w-20 h-20 flex-shrink-0 rounded-[16px] border-[3px] border-[#0A0A0A] shadow-[4px_4px_0_#0A0A0A] overflow-hidden"
              >
                <Image
                  src={CHARACTER_IMAGES[q.character]}
                  alt="guide character"
                  width={80}
                  height={80}
                  className="w-full h-full object-cover"
                />
              </motion.div>
              <div className="relative bg-white border-[3px] border-[#0A0A0A] rounded-[16px] px-4 py-3 shadow-[4px_4px_0_#0A0A0A] flex-1">
                <div className="absolute -left-[14px] bottom-4 w-0 h-0 border-t-[8px] border-t-transparent border-b-[8px] border-b-transparent border-r-[12px] border-r-[#0A0A0A]" />
                <div className="absolute -left-[11px] bottom-[18px] w-0 h-0 border-t-[6px] border-t-transparent border-b-[6px] border-b-transparent border-r-[10px] border-r-white" />
                <p className="text-[#FF3D77] font-bold text-xs mb-0.5">Q{current + 1}</p>
                <p className="text-[#0A0A0A] font-bold text-sm leading-snug">{q.text}</p>
              </div>
            </motion.div>
          </AnimatePresence>

          {/* 선택지 */}
          <AnimatePresence mode="wait">
            <motion.div
              key={`opts-${current}`}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3, delay: 0.05 }}
              className="flex flex-col gap-3"
            >
              {q.options.map((opt, i) => {
                const isSelected = selectedIdx === i;
                const isDimmed = selectedIdx !== null && !isSelected;
                return (
                  <motion.button
                    key={i}
                    whileHover={selectedIdx === null ? { x: 4, boxShadow: '6px 6px 0 #0A0A0A' } : {}}
                    whileTap={selectedIdx === null ? { scale: 0.98, x: 2, y: 2 } : {}}
                    animate={
                      isSelected
                        ? { scale: 1.02, borderColor: '#FF3D77', backgroundColor: '#FF3D77' }
                        : isDimmed
                        ? { opacity: 0.4 }
                        : {}
                    }
                    onClick={() => handleAnswer(i)}
                    disabled={selectedIdx !== null}
                    className="w-full text-left bg-white border-[3px] border-[#0A0A0A] rounded-[16px] shadow-[4px_4px_0_#0A0A0A] px-5 py-4 font-bold text-sm text-[#0A0A0A] transition-colors"
                    style={{ cursor: selectedIdx !== null ? 'default' : 'pointer' }}
                  >
                    <span className={isSelected ? 'text-white' : ''}>{opt.text}</span>
                  </motion.button>
                );
              })}
            </motion.div>
          </AnimatePresence>
        </div>
        </div>
      </div>
    );
  }

  // ── 결과 ──────────────────────────────────────────────────────────────────
  if (phase === 'result' && result) {
    const shareUrl = `${BASE_URL}/quiz`;
    const shareText = `나의 락밴드 악기 유형은 "${result.instrument}" (${result.title})! ${result.emoji}\n너는? → ${shareUrl}`;
    const twitterUrl = `https://x.com/intent/tweet?text=${encodeURIComponent(shareText)}`;

    return (
      <div
        className="min-h-screen flex flex-col"
        style={{ background: result.bg }}
      >
        <QuizHeader />
        <div className="flex-1 flex flex-col items-center justify-center px-4 py-12">
        <motion.div
          initial={{ opacity: 0, scale: 0.85 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, type: 'spring', bounce: 0.35 }}
          className="w-full max-w-lg"
        >
          {/* 결과 뱃지 */}
          <div className="flex justify-center mb-4">
            <motion.span
              initial={{ rotate: -5 }}
              animate={{ rotate: 5 }}
              transition={{ repeat: Infinity, repeatType: 'reverse', duration: 1.5 }}
              className="font-bungee text-sm px-4 py-1.5 rounded-full border-[3px] border-[#0A0A0A] shadow-[3px_3px_0_#0A0A0A]"
              style={{ background: result.badge, color: '#0A0A0A' }}
            >
              🎸 RESULT
            </motion.span>
          </div>

          {/* 메인 카드 */}
          <div className="bg-white border-[3px] border-[#0A0A0A] rounded-[24px] shadow-[8px_8px_0_#0A0A0A] p-6 mb-5">
            {/* 캐릭터 + 제목 */}
            <div className="flex items-center gap-4 mb-5">
              <motion.div
                animate={{ y: [0, -8, 0] }}
                transition={{ repeat: Infinity, duration: 2.5, ease: 'easeInOut' }}
                className="w-24 h-24 flex-shrink-0 rounded-[20px] border-[3px] border-[#0A0A0A] shadow-[4px_4px_0_#0A0A0A] overflow-hidden"
              >
                <Image
                  src={CHARACTER_IMAGES[result.character]}
                  alt={result.instrument}
                  width={96}
                  height={96}
                  className="w-full h-full object-cover"
                />
              </motion.div>
              <div className="flex-1">
                <div
                  className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-full border-[2px] border-[#0A0A0A] mb-2"
                  style={{ background: result.bg, color: result.accent }}
                >
                  {result.emoji} {result.instrument}
                </div>
                <h2 className="font-bungee text-xl text-[#0A0A0A] leading-tight">
                  {result.title}
                </h2>
              </div>
            </div>

            {/* 설명 */}
            <p className="text-[#0A0A0A]/80 text-sm leading-relaxed mb-5 border-t-[2px] border-[#0A0A0A]/10 pt-4">
              {result.description}
            </p>

            {/* 추천 뮤지션 */}
            <div
              className="rounded-[16px] border-[2px] border-[#0A0A0A] p-4"
              style={{ background: result.bg + '33' }}
            >
              <p className="font-bold text-xs text-[#0A0A0A]/60 mb-2 uppercase tracking-wider">
                🎙️ 닮은 뮤지션
              </p>
              <div className="flex flex-wrap gap-2">
                {result.musicians.map((m) => (
                  <span
                    key={m}
                    className="text-xs font-bold px-3 py-1.5 bg-white border-[2px] border-[#0A0A0A] rounded-full shadow-[2px_2px_0_#0A0A0A]"
                  >
                    {m}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* 공유 섹션 */}
          <div className="bg-white border-[3px] border-[#0A0A0A] rounded-[20px] shadow-[6px_6px_0_#0A0A0A] p-5 mb-5">
            <p className="font-bold text-sm text-[#0A0A0A] mb-3 text-center">
              🔥 친구에게 공유하기
            </p>
            <div className="flex gap-3">
              {/* 카카오 */}
              <motion.button
                whileHover={{ y: -3, boxShadow: '5px 5px 0 #0A0A0A' }}
                whileTap={{ scale: 0.95, x: 2, y: 2 }}
                onClick={() => shareKakao(result)}
                className="flex-1 flex items-center justify-center gap-2 bg-[#FFD600] text-[#0A0A0A] font-bold text-sm py-3 rounded-[12px] border-[3px] border-[#0A0A0A] shadow-[4px_4px_0_#0A0A0A]"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                  <path d="M12 3C6.477 3 2 6.582 2 11.05c0 2.838 1.69 5.345 4.264 6.886l-.98 3.624a.375.375 0 0 0 .557.41l4.088-2.69A12.1 12.1 0 0 0 12 19.1c5.523 0 10-3.582 10-8.05S17.523 3 12 3z" fill="#0A0A0A"/>
                </svg>
                카카오톡
              </motion.button>

              {/* X(트위터) */}
              <motion.a
                href={twitterUrl}
                target="_blank"
                rel="noopener noreferrer"
                whileHover={{ y: -3, boxShadow: '5px 5px 0 #0A0A0A' }}
                whileTap={{ scale: 0.95, x: 2, y: 2 }}
                className="flex-1 flex items-center justify-center gap-2 bg-[#0A0A0A] text-white font-bold text-sm py-3 rounded-[12px] border-[3px] border-[#0A0A0A] shadow-[4px_4px_0_#555]"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                </svg>
                X (트위터)
              </motion.a>

              {/* 링크 복사 */}
              <motion.button
                whileHover={{ y: -3, boxShadow: '5px 5px 0 #0A0A0A' }}
                whileTap={{ scale: 0.95, x: 2, y: 2 }}
                onClick={handleCopy}
                className="flex-1 flex items-center justify-center gap-2 border-[3px] border-[#0A0A0A] shadow-[4px_4px_0_#0A0A0A] font-bold text-sm py-3 rounded-[12px] transition-colors"
                style={{
                  background: copied ? '#41C66B' : 'white',
                  color: '#0A0A0A',
                }}
              >
                {copied ? '✅ 복사됨!' : '🔗 링크복사'}
              </motion.button>
            </div>
          </div>

          {/* 하단 CTA */}
          <div className="flex flex-col gap-3">
            <Link href="/search">
              <motion.div
                whileHover={{ y: -3, boxShadow: '7px 7px 0 #0A0A0A' }}
                whileTap={{ scale: 0.96, x: 2, y: 2 }}
                className="w-full text-center bg-[#FF3D77] text-white font-bungee text-base py-3.5 rounded-[16px] border-[3px] border-[#0A0A0A] shadow-[5px_5px_0_#0A0A0A]"
              >
                🎸 연습실 찾으러 가기
              </motion.div>
            </Link>
            <motion.button
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.97 }}
              onClick={restart}
              className="w-full text-center bg-white text-[#0A0A0A] font-bold text-sm py-3 rounded-[14px] border-[3px] border-[#0A0A0A] shadow-[4px_4px_0_#0A0A0A]"
            >
              🔄 다시 테스트하기
            </motion.button>
          </div>

          <p className="text-center text-[#0A0A0A]/40 text-xs mt-5">
            Music Spot — 뮤지션을 위한 연습실 플랫폼
          </p>
        </motion.div>
        </div>
      </div>
    );
  }

  return null;
}
