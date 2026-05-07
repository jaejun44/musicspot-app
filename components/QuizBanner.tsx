'use client';

import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';

const INSTRUMENTS = [
  { emoji: '🎸', label: '일렉기타', color: '#FF3D77' },
  { emoji: '🎵', label: '베이스', color: '#242447' },
  { emoji: '🥁', label: '드럼', color: '#4FC3F7' },
  { emoji: '🎤', label: '보컬', color: '#F5FF4F' },
  { emoji: '🎹', label: '키보드', color: '#41C66B' },
];

export default function QuizBanner() {
  return (
    <section className="py-16 px-4 bg-[#242447] relative overflow-hidden">
      {/* 배경 데코 */}
      <div className="absolute inset-0 pointer-events-none select-none">
        {['🎸', '🎵', '🥁', '🎤', '🎹', '⚡', '🔥', '💥'].map((emoji, i) => (
          <motion.span
            key={i}
            className="absolute text-2xl opacity-10"
            style={{
              left: `${10 + i * 12}%`,
              top: `${15 + (i % 3) * 30}%`,
            }}
            animate={{ y: [0, -12, 0], rotate: [0, 10, -10, 0] }}
            transition={{ duration: 3 + i * 0.4, repeat: Infinity, ease: 'easeInOut' }}
          >
            {emoji}
          </motion.span>
        ))}
      </div>

      <div className="max-w-5xl mx-auto relative z-10">
        <div
          className="rounded-[24px] border-[3px] border-[#0A0A0A] overflow-hidden"
          style={{ boxShadow: '8px 8px 0 #0A0A0A', background: '#FFF8F0' }}
        >
          <div className="flex flex-col md:flex-row items-center gap-0">
            {/* 캐릭터 영역 */}
            <div className="relative md:w-64 w-full h-56 md:h-auto flex-shrink-0 bg-[#FF3D77] flex items-end justify-center overflow-hidden border-b-[3px] md:border-b-0 md:border-r-[3px] border-[#0A0A0A]">
              <motion.div
                animate={{ y: [0, -6, 0] }}
                transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
                className="relative w-40 h-44 md:w-48 md:h-52"
              >
                <Image
                  src="/ms_character/Leonardo_Anime_XL_three_cute_chibi_rockstar_kids_standing_toge_1_3418649b-25bc-4055-a8f1-4ad72f27c7a6.jpg"
                  alt="Music Spot 캐릭터들"
                  fill
                  className="object-contain object-bottom"
                />
              </motion.div>
              {/* 말풍선 */}
              <motion.div
                className="absolute top-4 right-4 bg-[#F5FF4F] border-[2px] border-[#0A0A0A] rounded-[12px] px-3 py-1.5 text-xs font-bold text-[#0A0A0A]"
                style={{ boxShadow: '2px 2px 0 #0A0A0A' }}
                animate={{ rotate: [0, 3, -3, 0], scale: [1, 1.05, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                나는 어떤 악기?! 🤔
              </motion.div>
            </div>

            {/* 텍스트 + CTA 영역 */}
            <div className="flex-1 p-8 md:p-10">
              {/* 뱃지 */}
              <div className="flex items-center gap-2 mb-4">
                <span
                  className="px-3 py-1 rounded-full border-[2px] border-[#0A0A0A] text-xs font-bold bg-[#FF3D77] text-white"
                  style={{ boxShadow: '2px 2px 0 #0A0A0A' }}
                >
                  🔥 무료 테스트
                </span>
                <span
                  className="px-3 py-1 rounded-full border-[2px] border-[#0A0A0A] text-xs font-bold bg-[#F5FF4F] text-[#0A0A0A]"
                  style={{ boxShadow: '2px 2px 0 #0A0A0A' }}
                >
                  7문항 · 1분
                </span>
              </div>

              <h2 className="font-bungee text-3xl md:text-4xl text-[#0A0A0A] leading-tight mb-2">
                나에게 어울리는
              </h2>
              <h2 className="font-bungee text-3xl md:text-4xl text-[#FF3D77] leading-tight mb-4">
                악기는? 🎸
              </h2>
              <p className="text-[#0A0A0A] text-sm md:text-base mb-6 leading-relaxed">
                락·메탈 밴드 악기 유형 테스트!<br />
                7가지 질문으로 알아보는 나의 악기 DNA.
              </p>

              {/* 악기 미리보기 */}
              <div className="flex flex-wrap gap-2 mb-8">
                {INSTRUMENTS.map((inst) => (
                  <motion.span
                    key={inst.label}
                    className="px-3 py-1.5 rounded-full border-[2px] border-[#0A0A0A] text-xs font-bold text-[#0A0A0A]"
                    style={{ background: inst.color, boxShadow: '2px 2px 0 #0A0A0A' }}
                    whileHover={{ y: -2, scale: 1.05 }}
                  >
                    {inst.emoji} {inst.label}
                  </motion.span>
                ))}
              </div>

              {/* CTA 버튼 */}
              <Link href="/quiz">
                <motion.button
                  className="px-8 py-4 rounded-[14px] border-[3px] border-[#0A0A0A] font-bold text-lg text-white bg-[#FF3D77] cursor-pointer"
                  style={{ boxShadow: '5px 5px 0 #0A0A0A' }}
                  whileHover={{ y: -3, boxShadow: '8px 8px 0 #0A0A0A' }}
                  whileTap={{ scale: 0.97, y: 2, boxShadow: '2px 2px 0 #0A0A0A' }}
                >
                  테스트 시작하기 💥
                </motion.button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
