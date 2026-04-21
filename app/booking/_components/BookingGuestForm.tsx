'use client';

import { motion } from 'framer-motion';

const PURPOSES = ['합주 연습', '개인 연습', '녹음', '공연 리허설', '기타'];

const RULES = [
  '예약 시간 10분 전 도착을 권장합니다.',
  '장비 파손 시 변상 책임이 있습니다.',
  '음식물 반입은 제한될 수 있습니다.',
  '예약 취소는 이용 24시간 전까지 가능합니다.',
];

interface Props {
  persons: number;
  bandName: string;
  contact: string;
  purpose: string;
  agreed: boolean;
  onPersonsChange: (n: number) => void;
  onBandNameChange: (v: string) => void;
  onContactChange: (v: string) => void;
  onPurposeChange: (v: string) => void;
  onAgreedChange: (v: boolean) => void;
  errors: { bandName?: string; contact?: string; agreed?: string };
}

export default function BookingGuestForm({
  persons,
  bandName,
  contact,
  purpose,
  agreed,
  onPersonsChange,
  onBandNameChange,
  onContactChange,
  onPurposeChange,
  onAgreedChange,
  errors,
}: Props) {
  return (
    <div
      className="bg-white rounded-[20px] border-[3px] border-[#0A0A0A] p-5 space-y-4"
      style={{ boxShadow: '6px 6px 0 #0A0A0A' }}
    >
      <h2
        className="text-[15px] font-bold text-[#0A0A0A]"
        style={{ fontFamily: 'Pretendard, sans-serif' }}
      >
        👤 예약자 정보
      </h2>

      {/* 밴드명 */}
      <div>
        <label
          className="text-[12px] font-bold text-[#0A0A0A]/50 mb-1.5 block"
          style={{ fontFamily: 'Pretendard, sans-serif' }}
        >
          밴드명 / 이름
        </label>
        <input
          type="text"
          placeholder="예) 소닉 버스트"
          value={bandName}
          onChange={(e) => onBandNameChange(e.target.value)}
          className={[
            'w-full px-4 py-3 bg-[#FFF8F0] rounded-[12px] text-[14px] text-[#0A0A0A] outline-none transition-colors placeholder:text-[#0A0A0A]/30',
            errors.bandName
              ? 'border-[2px] border-[#FF3D77]'
              : 'border-[2px] border-[#0A0A0A] focus:border-[#FF3D77]',
          ].join(' ')}
          style={{ fontFamily: 'Pretendard, sans-serif' }}
        />
        {errors.bandName && (
          <p className="text-[11px] text-[#FF3D77] font-bold mt-1" style={{ fontFamily: 'Pretendard, sans-serif' }}>
            {errors.bandName}
          </p>
        )}
      </div>

      {/* 연락처 */}
      <div>
        <label
          className="text-[12px] font-bold text-[#0A0A0A]/50 mb-1.5 block"
          style={{ fontFamily: 'Pretendard, sans-serif' }}
        >
          대표자 연락처
        </label>
        <input
          type="tel"
          placeholder="010-0000-0000"
          value={contact}
          onChange={(e) => onContactChange(e.target.value)}
          className={[
            'w-full px-4 py-3 bg-[#FFF8F0] rounded-[12px] text-[14px] text-[#0A0A0A] outline-none transition-colors placeholder:text-[#0A0A0A]/30',
            errors.contact
              ? 'border-[2px] border-[#FF3D77]'
              : 'border-[2px] border-[#0A0A0A] focus:border-[#FF3D77]',
          ].join(' ')}
          style={{ fontFamily: 'Pretendard, sans-serif' }}
        />
        {errors.contact && (
          <p className="text-[11px] text-[#FF3D77] font-bold mt-1" style={{ fontFamily: 'Pretendard, sans-serif' }}>
            {errors.contact}
          </p>
        )}
      </div>

      {/* 인원 */}
      <div>
        <label
          className="text-[12px] font-bold text-[#0A0A0A]/50 mb-2 block"
          style={{ fontFamily: 'Pretendard, sans-serif' }}
        >
          인원
        </label>
        <div className="flex items-center gap-3">
          <motion.button
            type="button"
            onClick={() => onPersonsChange(Math.max(1, persons - 1))}
            whileTap={{ scale: 0.88 }}
            className="w-10 h-10 rounded-[10px] border-[2px] border-[#0A0A0A] bg-[#FFF8F0] font-bold text-[18px] flex items-center justify-center"
            style={{ boxShadow: '2px 2px 0 #0A0A0A' }}
          >
            −
          </motion.button>
          <span
            className="text-[20px] font-bold w-8 text-center"
            style={{ fontFamily: 'Bungee, sans-serif' }}
          >
            {persons}
          </span>
          <motion.button
            type="button"
            onClick={() => onPersonsChange(Math.min(20, persons + 1))}
            whileTap={{ scale: 0.88 }}
            className="w-10 h-10 rounded-[10px] border-[2px] border-[#0A0A0A] bg-[#FFF8F0] font-bold text-[18px] flex items-center justify-center"
            style={{ boxShadow: '2px 2px 0 #0A0A0A' }}
          >
            +
          </motion.button>
          <span
            className="text-[13px] text-[#0A0A0A]/50 ml-1"
            style={{ fontFamily: 'Pretendard, sans-serif' }}
          >
            명
          </span>
        </div>
      </div>

      {/* 이용 목적 */}
      <div>
        <label
          className="text-[12px] font-bold text-[#0A0A0A]/50 mb-2 block"
          style={{ fontFamily: 'Pretendard, sans-serif' }}
        >
          이용 목적
        </label>
        <div className="flex flex-wrap gap-2">
          {PURPOSES.map((p) => (
            <motion.button
              key={p}
              type="button"
              onClick={() => onPurposeChange(p)}
              whileTap={{ scale: 0.92 }}
              className={[
                'px-3 py-2 rounded-[10px] border-[2px] border-[#0A0A0A] text-[12px] font-bold transition-colors',
                purpose === p ? 'bg-[#4FC3F7] text-[#0A0A0A]' : 'bg-[#FFF8F0] text-[#0A0A0A]',
              ].join(' ')}
              style={{
                boxShadow: purpose === p ? '2px 2px 0 #0A0A0A' : '1px 1px 0 #0A0A0A',
                fontFamily: 'Pretendard, sans-serif',
              }}
            >
              {p}
            </motion.button>
          ))}
        </div>
      </div>

      {/* 이용 규칙 */}
      <div className="bg-[#FFF8F0] rounded-[14px] border-[2px] border-[#0A0A0A] p-4">
        <p
          className="text-[12px] font-bold text-[#0A0A0A] mb-2"
          style={{ fontFamily: 'Pretendard, sans-serif' }}
        >
          📋 이용 규칙
        </p>
        <ul className="space-y-1">
          {RULES.map((rule, i) => (
            <li
              key={i}
              className="text-[12px] text-[#0A0A0A]/70 flex gap-1.5"
              style={{ fontFamily: 'Pretendard, sans-serif' }}
            >
              <span className="text-[#FF3D77] flex-shrink-0">·</span>
              {rule}
            </li>
          ))}
        </ul>
      </div>

      {/* 동의 체크 */}
      <label className="flex items-center gap-3 cursor-pointer">
        <div
          onClick={() => onAgreedChange(!agreed)}
          className={[
            'w-6 h-6 rounded-[6px] border-[2px] border-[#0A0A0A] flex items-center justify-center transition-colors flex-shrink-0',
            agreed ? 'bg-[#FF3D77]' : 'bg-white',
          ].join(' ')}
          style={{ boxShadow: '2px 2px 0 #0A0A0A' }}
        >
          {agreed && (
            <svg viewBox="0 0 12 10" className="w-3.5 h-3 fill-none stroke-white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M1 5l3.5 3.5L11 1" />
            </svg>
          )}
        </div>
        <span
          className="text-[13px] font-bold text-[#0A0A0A]"
          style={{ fontFamily: 'Pretendard, sans-serif' }}
          onClick={() => onAgreedChange(!agreed)}
        >
          이용 규칙을 확인하고 동의합니다
        </span>
      </label>
      {errors.agreed && (
        <p className="text-[11px] text-[#FF3D77] font-bold -mt-2" style={{ fontFamily: 'Pretendard, sans-serif' }}>
          {errors.agreed}
        </p>
      )}
    </div>
  );
}
