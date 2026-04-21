'use client';

import { motion } from 'framer-motion';

const stats = [
  { label: '음악인', value: '1,000+', rotation: -3 },
  { label: '연습실', value: '500+', rotation: 2 },
  { label: '밴드', value: '300+', rotation: -2 },
  { label: '공연', value: '100+', rotation: 3 },
];

export default function StatsBar() {
  return (
    <section className="py-20 px-8 bg-[#FF3D77] relative overflow-hidden">
      {/* Halftone Background */}
      <div
        className="absolute inset-0 opacity-20"
        style={{
          backgroundImage: 'radial-gradient(circle, #0A0A0A 2px, transparent 2px)',
          backgroundSize: '15px 15px',
        }}
      />

      <div className="relative max-w-[1440px] mx-auto">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {stats.map((stat, index) => (
            <motion.div
              key={stat.label}
              initial={{ y: 50, opacity: 0, rotate: 0 }}
              whileInView={{ y: 0, opacity: 1, rotate: stat.rotation }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              className="text-center"
            >
              <motion.div
                whileHover={{ scale: 1.1, rotate: 0 }}
                style={{
                  fontFamily: 'Bungee, sans-serif',
                  fontSize: 'clamp(48px, 8vw, 72px)',
                  color: '#FFFFFF',
                  WebkitTextStroke: '3px #0A0A0A',
                  paintOrder: 'stroke fill',
                  textShadow: '6px 6px 0 #0A0A0A',
                }}
              >
                {stat.value}
              </motion.div>
              <div
                style={{
                  fontFamily: 'Pretendard, sans-serif',
                  fontWeight: 700,
                  fontSize: '20px',
                  color: '#FFFFFF',
                }}
              >
                {stat.label}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
