'use client';

export default function Error({ reset }: { reset: () => void }) {
  return (
    <div className="min-h-screen bg-[#FFF8F0] flex flex-col items-center justify-center gap-4 px-4">
      <p
        className="text-[18px] font-bold text-[#0A0A0A]"
        style={{ fontFamily: 'Pretendard, sans-serif' }}
      >
        8마디 챌린지를 불러올 수 없어요
      </p>
      <button
        onClick={reset}
        className="px-6 py-3 bg-[#FF3D77] text-white font-bold text-[14px] rounded-[12px] border-[3px] border-[#0A0A0A]"
        style={{ boxShadow: '4px 4px 0 #0A0A0A', fontFamily: 'Pretendard, sans-serif' }}
      >
        다시 시도
      </button>
    </div>
  );
}
