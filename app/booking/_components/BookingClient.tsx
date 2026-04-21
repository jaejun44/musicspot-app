'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { ChevronLeft } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Studio } from '@/types/studio';
import Navigation from '@/components/Navigation';
import BookingStudioCard from './BookingStudioCard';
import BookingDatePicker from './BookingDatePicker';
import BookingGuestForm from './BookingGuestForm';

export default function BookingClient() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const roomId = searchParams.get('roomId') ?? '';
  const roomTypeParam = searchParams.get('room_type');
  const initPersons = parseInt(searchParams.get('persons') ?? '2', 10);

  const selectedRoom: 'T' | 'M' | null =
    roomTypeParam === 'T' ? 'T' : roomTypeParam === 'M' ? 'M' : null;

  const [studio, setStudio] = useState<Studio | null>(null);
  const [loading, setLoading] = useState(true);

  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [duration, setDuration] = useState(2);
  const [persons, setPersons] = useState(initPersons);
  const [bandName, setBandName] = useState('');
  const [contact, setContact] = useState('');
  const [purpose, setPurpose] = useState('합주 연습');
  const [agreed, setAgreed] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!roomId) { setLoading(false); return; }
    supabase
      .from('studios')
      .select('*')
      .eq('id', roomId)
      .eq('is_published', true)
      .single()
      .then(({ data }) => {
        if (data) setStudio(data as Studio);
        setLoading(false);
      });
  }, [roomId]);

  function validate() {
    const errs: Record<string, string> = {};
    if (!date) errs.date = '날짜를 선택해주세요';
    if (!time) errs.time = '시작 시간을 선택해주세요';
    if (!bandName.trim()) errs.bandName = '밴드명 / 이름을 입력해주세요';
    if (!contact.trim()) errs.contact = '연락처를 입력해주세요';
    if (!agreed) errs.agreed = '이용 규칙에 동의해주세요';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  function handleSubmit() {
    if (!validate() || !studio) return;

    const bookingData = {
      studioId: studio.id,
      studioName: studio.name,
      studioAddress: studio.address ?? '',
      roomType: selectedRoom,
      date,
      time,
      duration,
      persons,
      bandName,
      contact,
      purpose,
      pricePerHour: studio.price_per_hour ?? null,
      priceInfo: studio.price_info ?? null,
      totalPrice: studio.price_per_hour ? studio.price_per_hour * duration : null,
    };

    sessionStorage.setItem('musicspot_booking', JSON.stringify(bookingData));
    router.push('/payment');
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FFF8F0] flex items-center justify-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 0.9, ease: 'linear' }}
          className="w-10 h-10 rounded-full border-[3px] border-[#FF3D77] border-t-transparent"
        />
      </div>
    );
  }

  if (!studio) {
    return (
      <div className="min-h-screen bg-[#FFF8F0] flex flex-col items-center justify-center gap-4 px-4">
        <div
          className="bg-white rounded-[20px] border-[3px] border-[#0A0A0A] px-8 py-8 text-center"
          style={{ boxShadow: '6px 6px 0 #0A0A0A' }}
        >
          <p className="text-[15px] font-bold text-[#0A0A0A]" style={{ fontFamily: 'Pretendard, sans-serif' }}>
            연습실 정보를 불러올 수 없어요
          </p>
        </div>
        <motion.button
          onClick={() => router.back()}
          whileTap={{ scale: 0.95 }}
          className="px-6 py-3 bg-[#FFD600] rounded-[14px] border-[2px] border-[#0A0A0A] font-bold text-[14px]"
          style={{ boxShadow: '3px 3px 0 #0A0A0A', fontFamily: 'Pretendard, sans-serif' }}
        >
          돌아가기
        </motion.button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FFF8F0] pb-32">
      <Navigation />

      {/* 뒤로가기 */}
      <div className="px-4 pt-4 pb-2">
        <motion.button
          onClick={() => router.back()}
          whileTap={{ scale: 0.93 }}
          className="flex items-center gap-1 text-[14px] font-bold text-[#0A0A0A]/60 hover:text-[#0A0A0A] transition-colors"
          style={{ fontFamily: 'Pretendard, sans-serif' }}
        >
          <ChevronLeft className="w-5 h-5" />
          연습실로
        </motion.button>
      </div>

      {/* 헤더 */}
      <div className="px-4 pb-4">
        <h1
          className="text-[28px] font-bold text-[#0A0A0A]"
          style={{ fontFamily: 'Bungee, sans-serif' }}
        >
          BOOKING 🎸
        </h1>
        <p
          className="text-[13px] text-[#0A0A0A]/50 mt-1"
          style={{ fontFamily: 'Pretendard, sans-serif' }}
        >
          예약 정보를 입력해주세요
        </p>
      </div>

      <div className="px-4 space-y-5 max-w-2xl mx-auto">
        <BookingStudioCard studio={studio} roomType={selectedRoom} duration={duration} />

        <BookingDatePicker
          date={date}
          time={time}
          duration={duration}
          onDateChange={setDate}
          onTimeChange={setTime}
          onDurationChange={setDuration}
          errors={{ date: errors.date, time: errors.time }}
        />

        <BookingGuestForm
          persons={persons}
          bandName={bandName}
          contact={contact}
          purpose={purpose}
          agreed={agreed}
          onPersonsChange={setPersons}
          onBandNameChange={setBandName}
          onContactChange={setContact}
          onPurposeChange={setPurpose}
          onAgreedChange={setAgreed}
          errors={{ bandName: errors.bandName, contact: errors.contact, agreed: errors.agreed }}
        />
      </div>

      {/* 하단 고정 버튼 */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-[#FFF8F0] border-t-[3px] border-[#0A0A0A] px-4 py-3">
        <div className="max-w-2xl mx-auto">
          <motion.button
            onClick={handleSubmit}
            whileTap={{ scale: 0.96, y: 2 }}
            className="w-full py-4 bg-[#FF3D77] rounded-[16px] border-[3px] border-[#0A0A0A] text-white font-bold text-[16px]"
            style={{ boxShadow: '4px 4px 0 #0A0A0A', fontFamily: 'Bungee, sans-serif' }}
          >
            다음 단계 💥
          </motion.button>
        </div>
      </div>
    </div>
  );
}
