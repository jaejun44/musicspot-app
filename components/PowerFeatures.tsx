'use client';

import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';

const features = [
  {
    id: 1,
    name: '연습실 찾기',
    description: '내 동네 연습실을 3초만에 찾고 예약!',
    image: '/ms_character/doll.png',
    overlayFrom: 'from-[#FF3D77]',
    overlayColor: '#FF3D77',
    badgeColor: '#FFE5EE',
    rotation: -2,
    action: 'scroll-search',
    cta: '바로가기 →',
  },
  {
    id: 2,
    name: '밴드 찾기',
    description: '실력·장르로 합주 파트너 찾기',
    image: '/ms_character/mika.png',
    overlayFrom: 'from-[#41C66B]',
    overlayColor: '#41C66B',
    badgeColor: '#E5FFE8',
    rotation: 2,
    action: 'scroll-band',
    cta: '바로가기 →',
  },
  {
    id: 3,
    name: '8마디 챌린지',
    description: '8마디 던지면 답마디가 온다. 거기서 밴드가 만들어진다.',
    image: '/ms_character/lucky.png',
    overlayFrom: 'from-[#4FC3F7]',
    overlayColor: '#4FC3F7',
    badgeColor: '#E5F6FF',
    rotation: -1,
    action: 'stems',
    cta: '챌린지 시작 →',
  },
];

export default function PowerFeatures() {
  const router = useRouter();

  function handleClick(action: string) {
    if (action === 'scroll-search') {
      router.push('/search');
    } else if (action === 'scroll-band') {
      router.push('/band-matching');
    } else if (action === 'stems') {
      router.push('/stems');
    }
  }

  return (
    <section className="relative -mt-16 z-10 py-24 px-8">
        <div className="max-w-[1440px] mx-auto">
          {/* Section Title */}
          <motion.h2
            initial={{ y: 30, opacity: 0 }}
            whileInView={{ y: 0, opacity: 1 }}
            viewport={{ once: true }}
            className="text-center mb-16"
            style={{
              fontFamily: 'Bungee, sans-serif',
              fontSize: 'clamp(36px, 6vw, 48px)',
              color: '#0A0A0A',
            }}
          >
            우리의{' '}
            <span
              className="italic"
              style={{
                color: '#FF3D77',
                WebkitTextStroke: '2px #0A0A0A',
                textShadow: '5px 5px 0 #F5FF4F, 7px 7px 0 #0A0A0A',
                paintOrder: 'stroke fill',
                letterSpacing: '0.05em',
              }}
            >
              POWER
            </span>{' '}
            3종 세트 💥
          </motion.h2>

          {/* Feature Cards — full-bleed image style */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <motion.div
                key={feature.id}
                initial={{ y: 50, opacity: 0, rotate: 0 }}
                whileInView={{ y: 0, opacity: 1, rotate: feature.rotation }}
                whileHover={{ y: -10, rotate: 0, boxShadow: '12px 12px 0 #0A0A0A', cursor: 'pointer' }}
                whileTap={{ scale: 0.97 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.15 }}
                onClick={() => handleClick(feature.action)}
                className="relative overflow-hidden rounded-[24px] border-[4px] border-[#0A0A0A]"
                style={{
                  boxShadow: '8px 8px 0 #0A0A0A',
                  height: '420px',
                }}
              >
                {/* Full-bleed character image */}
                <img
                  src={feature.image}
                  alt={feature.name}
                  className="absolute inset-0 w-full h-full object-cover object-top"
                />

                {/* Gradient overlay — bottom 55% */}
                <div
                  className="absolute inset-0"
                  style={{
                    background: `linear-gradient(to top, ${feature.overlayColor}F0 0%, ${feature.overlayColor}CC 30%, ${feature.overlayColor}55 55%, transparent 75%)`,
                  }}
                />

                {/* Text content */}
                <div className="absolute bottom-0 left-0 right-0 px-6 pb-6 flex flex-col gap-1.5">
                  <h3
                    className="text-white"
                    style={{
                      fontFamily: 'Bungee, sans-serif',
                      fontSize: '26px',
                      textShadow: '2px 2px 0 rgba(10,10,10,0.6)',
                    }}
                  >
                    {feature.name}
                  </h3>

                  <p
                    className="text-white/90"
                    style={{
                      fontFamily: 'Pretendard, sans-serif',
                      fontWeight: 700,
                      fontSize: '14px',
                      textShadow: '1px 1px 0 rgba(10,10,10,0.5)',
                    }}
                  >
                    {feature.description}
                  </p>

                  {/* CTA pill */}
                  <div
                    className="mt-2 inline-flex items-center self-start px-4 py-1.5 rounded-full border-[2px] border-[#0A0A0A] bg-white text-[#0A0A0A] text-[13px] font-bold"
                    style={{
                      fontFamily: 'Pretendard, sans-serif',
                      boxShadow: '2px 2px 0 #0A0A0A',
                    }}
                  >
                    {feature.cta}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
    </section>
  );
}
