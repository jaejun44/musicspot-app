'use client';

import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Studio } from '@/types/studio';

interface Props {
  studio: Studio;
  index: number;
}

export default function StudioMiniCard({ studio, index }: Props) {
  const router = useRouter();
  const photo = studio.photos?.[0] ?? null;
  const rotate = index % 3 === 0 ? -1 : index % 3 === 1 ? 0 : 1;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06, type: 'spring', stiffness: 260, damping: 22 }}
      onClick={() => router.push(`/room/${studio.id}`)}
      style={{ rotate, boxShadow: '4px 4px 0 #0A0A0A' }}
      whileHover={{ y: -4, rotate: rotate + 1, boxShadow: '6px 6px 0 #0A0A0A' }}
      whileTap={{ scale: 0.97, x: 2, y: 2 }}
      className="bg-white rounded-[16px] border-[3px] border-[#0A0A0A] overflow-hidden cursor-pointer"
    >
      <div className="relative w-full h-28 bg-[#0A0A0A]/5">
        {photo ? (
          <Image src={photo} alt={studio.name} fill className="object-cover" sizes="200px" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-[28px]">🎸</div>
        )}
        {studio.room_type && studio.room_type !== 'both' && (
          <span
            className="absolute top-2 left-2 px-2 py-0.5 bg-[#FF3D77] border-[2px] border-[#0A0A0A] text-white text-[10px] font-bold rounded-[6px]"
            style={{ boxShadow: '1px 1px 0 #0A0A0A', fontFamily: 'Pretendard, sans-serif' }}
          >
            {studio.room_type}룸
          </span>
        )}
      </div>

      <div className="p-3">
        <p
          className="text-[13px] font-bold text-[#0A0A0A] leading-tight line-clamp-1"
          style={{ fontFamily: 'Pretendard, sans-serif' }}
        >
          {studio.name}
        </p>
        <p
          className="text-[11px] text-[#0A0A0A]/50 mt-0.5 line-clamp-1"
          style={{ fontFamily: 'Pretendard, sans-serif' }}
        >
          {studio.address ?? studio.region ?? ''}
        </p>
        {studio.price_per_hour ? (
          <p
            className="text-[12px] font-bold text-[#FF3D77] mt-1"
            style={{ fontFamily: 'Bungee, sans-serif' }}
          >
            ₩{studio.price_per_hour.toLocaleString()}/h
          </p>
        ) : studio.price_info ? (
          <p
            className="text-[11px] text-[#0A0A0A]/40 mt-1 font-bold"
            style={{ fontFamily: 'Pretendard, sans-serif' }}
          >
            {studio.price_info}
          </p>
        ) : null}
      </div>
    </motion.div>
  );
}
