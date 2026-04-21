'use client';

import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

export default function SearchBar() {
  const router = useRouter();
  const [location, setLocation] = useState('서울 전체');

  return (
    <div className="relative -mt-20 z-30 px-8">
      <motion.div
        initial={{ y: 50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.8 }}
        className="max-w-[1200px] mx-auto bg-white p-8 rounded-[24px] border-[4px] border-[#0A0A0A]"
        style={{ boxShadow: '10px 10px 0 #0A0A0A' }}
      >
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
          {/* Location */}
          <div>
            <label
              className="block mb-2"
              style={{ fontFamily: 'Pretendard, sans-serif', fontWeight: 700 }}
            >
              지역
            </label>
            <select
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="w-full px-4 py-3 border-[3px] border-[#0A0A0A] rounded-xl bg-[#FFF8F0]"
              style={{ fontFamily: 'Pretendard, sans-serif' }}
            >
              <option>서울 전체</option>
              <option>강남구</option>
              <option>홍대</option>
            </select>
          </div>

          {/* Date */}
          <div>
            <label
              className="block mb-2"
              style={{ fontFamily: 'Pretendard, sans-serif', fontWeight: 700 }}
            >
              날짜
            </label>
            <input
              type="date"
              className="w-full px-4 py-3 border-[3px] border-[#0A0A0A] rounded-xl bg-[#FFF8F0]"
              style={{ fontFamily: 'Pretendard, sans-serif' }}
            />
          </div>

          {/* Time */}
          <div>
            <label
              className="block mb-2"
              style={{ fontFamily: 'Pretendard, sans-serif', fontWeight: 700 }}
            >
              시간
            </label>
            <select
              className="w-full px-4 py-3 border-[3px] border-[#0A0A0A] rounded-xl bg-[#FFF8F0]"
              style={{ fontFamily: 'Pretendard, sans-serif' }}
            >
              <option>오전</option>
              <option>오후</option>
              <option>저녁</option>
            </select>
          </div>

          {/* People */}
          <div>
            <label
              className="block mb-2"
              style={{ fontFamily: 'Pretendard, sans-serif', fontWeight: 700 }}
            >
              인원
            </label>
            <select
              className="w-full px-4 py-3 border-[3px] border-[#0A0A0A] rounded-xl bg-[#FFF8F0]"
              style={{ fontFamily: 'Pretendard, sans-serif' }}
            >
              <option>1-2명</option>
              <option>3-5명</option>
              <option>6명 이상</option>
            </select>
          </div>

          {/* Search Button */}
          <motion.button
            whileHover={{
              y: 5,
              boxShadow: '4px 4px 0 #0A0A0A',
            }}
            whileTap={{ scale: 0.95 }}
            onClick={() => router.push('/search')}
            className="px-6 py-4 bg-[#FF3D77] text-white rounded-xl border-[3px] border-[#0A0A0A]"
            style={{
              boxShadow: '8px 8px 0 #0A0A0A',
              fontFamily: 'Bungee, sans-serif',
              fontSize: '20px',
            }}
          >
            ⚡ 검색!
          </motion.button>
        </div>
      </motion.div>
    </div>
  );
}
