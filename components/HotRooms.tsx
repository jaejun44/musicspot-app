'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { Studio } from '@/types/studio';

const ROTATIONS = [-2, 1, -1, 2, -1, 0, 2, -2];

function PriceLabel({ studio }: { studio: Studio }) {
  if (studio.price_per_hour) {
    return <>{studio.price_per_hour.toLocaleString()}원/시간</>;
  }
  if (studio.price_info) {
    const trimmed = studio.price_info.trim();
    return <>{trimmed.length > 20 ? trimmed.slice(0, 20) + '…' : trimmed}</>;
  }
  return <>문의</>;
}

export default function HotRooms() {
  const [studios, setStudios] = useState<Studio[]>([]);

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('studios')
        .select('id, name, region, address, price_per_hour, price_info, photos, data_quality_score, has_drum, room_type, naver_place_url, kakao_channel')
        .eq('is_published', true)
        .not('photos', 'is', null)
        .gt('data_quality_score', 0)
        .order('data_quality_score', { ascending: false })
        .limit(8);

      if (data) setStudios(data as Studio[]);
    }
    load();
  }, []);

  if (studios.length === 0) return null;

  return (
    <section className="py-24 px-8 bg-[#FFF8F0]">
      <div className="max-w-[1440px] mx-auto">
        {/* Section Title */}
        <motion.h2
          initial={{ y: 30, opacity: 0 }}
          whileInView={{ y: 0, opacity: 1 }}
          viewport={{ once: true }}
          className="mb-12"
          style={{
            fontFamily: 'Bungee, sans-serif',
            fontSize: 'clamp(36px, 6vw, 48px)',
            color: '#0A0A0A',
          }}
        >
          지금 HOT한 연습실{' '}
          <motion.span
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ duration: 1, repeat: Infinity }}
            className="inline-block"
          >
            🔥
          </motion.span>
        </motion.h2>

        {/* Horizontal Scroll Container */}
        <div className="overflow-x-auto pb-8 -mx-8 px-8 scrollbar-hide">
          <div className="flex gap-6 min-w-max">
            {studios.map((studio, index) => {
              const photo = studio.photos?.[0];
              const location = studio.region ?? studio.address?.split(' ').slice(0, 2).join(' ') ?? '위치 미상';
              const hasInstantBook = !!(studio.naver_place_url || studio.kakao_channel);

              return (
                <Link key={studio.id} href={`/room/${studio.id}`}>
                  <motion.div
                    initial={{ y: 50, opacity: 0, rotate: 0 }}
                    whileInView={{ y: 0, opacity: 1, rotate: ROTATIONS[index % ROTATIONS.length] }}
                    whileHover={{ y: -10, rotate: 0, boxShadow: '10px 10px 0 #0A0A0A' }}
                    viewport={{ once: true }}
                    transition={{ delay: index * 0.08 }}
                    className="w-[280px] bg-white rounded-[24px] border-[3px] border-[#0A0A0A] overflow-hidden flex-shrink-0 cursor-pointer"
                    style={{ boxShadow: '6px 6px 0 #0A0A0A' }}
                  >
                    {/* Image */}
                    <div className="relative h-48 overflow-hidden bg-[#F0EBE3]">
                      {photo ? (
                        <img
                          src={photo}
                          alt={studio.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-5xl">🎸</div>
                      )}
                      {hasInstantBook && (
                        <motion.div
                          initial={{ rotate: 0 }}
                          animate={{ rotate: -5 }}
                          className="absolute top-4 right-4 px-3 py-1 bg-[#FFD600] border-[2px] border-[#0A0A0A] rounded-lg"
                          style={{
                            fontFamily: 'Pretendard, sans-serif',
                            fontWeight: 700,
                            fontSize: '12px',
                            boxShadow: '3px 3px 0 #0A0A0A',
                          }}
                        >
                          ⚡ 바로문의
                        </motion.div>
                      )}
                    </div>

                    {/* Content */}
                    <div className="p-5">
                      <h3
                        className="mb-2 line-clamp-1"
                        style={{ fontFamily: 'Pretendard, sans-serif', fontWeight: 800, fontSize: '20px' }}
                      >
                        {studio.name}
                      </h3>

                      <p
                        className="mb-3 text-[#0A0A0A]/60"
                        style={{ fontFamily: 'Pretendard, sans-serif', fontSize: '14px' }}
                      >
                        📍 {location}
                      </p>

                      {/* Tags */}
                      <div className="flex gap-1 mb-3 flex-wrap">
                        {studio.has_drum && (
                          <span className="px-2 py-0.5 bg-[#4FC3F7]/20 border border-[#4FC3F7] text-[11px] font-bold text-[#0A0A0A] rounded-[6px]">
                            🥁 드럼
                          </span>
                        )}
                        {studio.room_type === 'T' && (
                          <span className="px-2 py-0.5 bg-[#FFD600]/30 border border-[#FFD600] text-[11px] font-bold text-[#0A0A0A] rounded-[6px]">
                            T룸
                          </span>
                        )}
                        {studio.room_type === 'M' && (
                          <span className="px-2 py-0.5 bg-[#FFD600]/30 border border-[#FFD600] text-[11px] font-bold text-[#0A0A0A] rounded-[6px]">
                            M룸
                          </span>
                        )}
                        {studio.room_type === 'both' && (
                          <>
                            <span className="px-2 py-0.5 bg-[#FFD600]/30 border border-[#FFD600] text-[11px] font-bold text-[#0A0A0A] rounded-[6px]">T룸</span>
                            <span className="px-2 py-0.5 bg-[#FFD600]/30 border border-[#FFD600] text-[11px] font-bold text-[#0A0A0A] rounded-[6px]">M룸</span>
                          </>
                        )}
                      </div>

                      {/* Price */}
                      <div
                        className="text-right"
                        style={{ fontFamily: 'Bungee, sans-serif', fontSize: '18px', color: '#FF3D77' }}
                      >
                        <PriceLabel studio={studio} />
                      </div>
                    </div>
                  </motion.div>
                </Link>
              );
            })}
          </div>
        </div>
      </div>

      <style>{`
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </section>
  );
}
