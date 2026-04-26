'use client';

import { motion } from 'framer-motion';

const TIME_SLOTS = [
  '10:00', '11:00', '12:00', '13:00', '14:00', '15:00',
  '16:00', '17:00', '18:00', '19:00', '20:00', '21:00', '22:00',
];
const DURATIONS = [1, 2, 3, 4];

interface Props {
  date: string;
  time: string;
  duration: number;
  onDateChange: (d: string) => void;
  onTimeChange: (t: string) => void;
  onDurationChange: (d: number) => void;
  errors: { date?: string; time?: string };
}

export default function BookingDatePicker({
  date,
  time,
  duration,
  onDateChange,
  onTimeChange,
  onDurationChange,
  errors,
}: Props) {
  const today = new Date().toISOString().split('T')[0];

  return (
    <div
      className="bg-white rounded-[20px] border-[3px] border-[#0A0A0A] p-5"
      style={{ boxShadow: '6px 6px 0 #0A0A0A' }}
    >
      <h2
        className="text-[15px] font-bold mb-4 text-[#0A0A0A]"
        style={{ fontFamily: 'Pretendard, sans-serif' }}
      >
        📅 날짜 & 시간
      </h2>

      {/* 날짜 */}
      <div className="mb-4">
        <label
          className="text-[12px] font-bold text-[#0A0A0A]/50 mb-1.5 block"
          style={{ fontFamily: 'Pretendard, sans-serif' }}
        >
          날짜
        </label>
        <input
          type="date"
          min={today}
          value={date}
          onChange={(e) => onDateChange(e.target.value)}
          className={[
            'w-full px-4 py-3 bg-[#FFF8F0] rounded-[12px] text-[14px] font-bold text-[#0A0A0A] outline-none transition-colors',
            errors.date
              ? 'border-[2px] border-[#FF3D77]'
              : 'border-[2px] border-[#0A0A0A] focus:border-[#FF3D77]',
          ].join(' ')}
          style={{ fontFamily: 'Pretendard, sans-serif' }}
        />
        {errors.date && (
          <p className="text-[11px] text-[#FF3D77] font-bold mt-1" style={{ fontFamily: 'Pretendard, sans-serif' }}>
            {errors.date}
          </p>
        )}
      </div>

      {/* 시작 시간 */}
      <div className="mb-4">
        <label
          className="text-[12px] font-bold text-[#0A0A0A]/50 mb-2 block"
          style={{ fontFamily: 'Pretendard, sans-serif' }}
        >
          시작 시간
        </label>
        <div className="grid grid-cols-4 gap-1.5">
          {TIME_SLOTS.map((slot) => (
            <motion.button
              key={slot}
              type="button"
              onClick={() => onTimeChange(slot)}
              whileTap={{ scale: 0.88 }}
              className={[
                'py-2 rounded-[10px] border-[2px] border-[#0A0A0A] text-[12px] font-bold transition-colors',
                time === slot ? 'bg-[#FF3D77] text-white' : 'bg-[#FFF8F0] text-[#0A0A0A]',
              ].join(' ')}
              style={{
                boxShadow: time === slot ? '2px 2px 0 #0A0A0A' : '1px 1px 0 #0A0A0A',
                fontFamily: 'Pretendard, sans-serif',
              }}
            >
              {slot}
            </motion.button>
          ))}
        </div>
        {errors.time && (
          <p className="text-[11px] text-[#FF3D77] font-bold mt-1.5" style={{ fontFamily: 'Pretendard, sans-serif' }}>
            {errors.time}
          </p>
        )}
      </div>

      {/* 이용 시간 */}
      <div>
        <label
          className="text-[12px] font-bold text-[#0A0A0A]/50 mb-2 block"
          style={{ fontFamily: 'Pretendard, sans-serif' }}
        >
          이용 시간
        </label>
        <div className="flex gap-2">
          {DURATIONS.map((d) => (
            <motion.button
              key={d}
              type="button"
              onClick={() => onDurationChange(d)}
              whileTap={{ scale: 0.92 }}
              className={[
                'flex-1 py-3 rounded-[12px] border-[2px] border-[#0A0A0A] text-[13px] font-bold transition-colors',
                duration === d ? 'bg-[#F5FF4F] text-[#0A0A0A]' : 'bg-[#FFF8F0] text-[#0A0A0A]',
              ].join(' ')}
              style={{
                boxShadow: duration === d ? '3px 3px 0 #0A0A0A' : '2px 2px 0 #0A0A0A',
                fontFamily: 'Pretendard, sans-serif',
              }}
            >
              {d}시간
            </motion.button>
          ))}
        </div>
      </div>
    </div>
  );
}
