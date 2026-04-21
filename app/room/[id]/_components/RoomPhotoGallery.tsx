'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface RoomPhotoGalleryProps {
  photos: string[];
  name: string;
}

export default function RoomPhotoGallery({ photos, name }: RoomPhotoGalleryProps) {
  const [current, setCurrent] = useState(0);
  const [lightbox, setLightbox] = useState(false);

  if (photos.length === 0) {
    return (
      <div className="w-full h-64 bg-[#0A0A0A]/10 border-b-[4px] border-[#0A0A0A] flex items-center justify-center">
        <span className="text-6xl">🎵</span>
      </div>
    );
  }

  const prev = () => setCurrent((c) => (c === 0 ? photos.length - 1 : c - 1));
  const next = () => setCurrent((c) => (c === photos.length - 1 ? 0 : c + 1));

  return (
    <>
      {/* 메인 그리드 */}
      <div className="border-b-[4px] border-[#0A0A0A]">
        {photos.length === 1 ? (
          <div className="relative h-72 cursor-pointer" onClick={() => setLightbox(true)}>
            <img src={photos[0]} alt={name} className="w-full h-full object-cover" />
          </div>
        ) : (
          <div className="flex h-72 gap-1">
            {/* 메인 사진 (60%) */}
            <div
              className="relative w-[60%] cursor-pointer overflow-hidden"
              onClick={() => { setCurrent(0); setLightbox(true); }}
            >
              <img src={photos[0]} alt={name} className="w-full h-full object-cover" />
            </div>

            {/* 보조 사진 (40%) — 세로 2분할 */}
            <div className="flex flex-col gap-1 w-[40%]">
              {[1, 2].map((idx) =>
                photos[idx] ? (
                  <div
                    key={idx}
                    className="relative flex-1 cursor-pointer overflow-hidden"
                    onClick={() => { setCurrent(idx); setLightbox(true); }}
                  >
                    <img src={photos[idx]} alt={`${name} ${idx + 1}`} className="w-full h-full object-cover" />
                    {/* 더보기 오버레이 (마지막 썸네일에만) */}
                    {idx === 2 && photos.length > 3 && (
                      <div className="absolute inset-0 bg-[#0A0A0A]/60 flex items-center justify-center">
                        <span
                          className="text-white font-bold text-[15px]"
                          style={{ fontFamily: 'Bungee, sans-serif' }}
                        >
                          +{photos.length - 3}
                        </span>
                      </div>
                    )}
                  </div>
                ) : (
                  <div key={idx} className="flex-1 bg-[#0A0A0A]/10" />
                )
              )}
            </div>
          </div>
        )}
      </div>

      {/* 라이트박스 */}
      <AnimatePresence>
        {lightbox && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-[#0A0A0A]/90 flex items-center justify-center"
            onClick={() => setLightbox(false)}
          >
            <div className="relative w-full max-w-2xl px-4" onClick={(e) => e.stopPropagation()}>
              <img
                src={photos[current]}
                alt={`${name} ${current + 1}`}
                className="w-full max-h-[80vh] object-contain rounded-[12px]"
              />

              {photos.length > 1 && (
                <>
                  <motion.button
                    onClick={prev}
                    whileTap={{ scale: 0.9 }}
                    className="absolute left-6 top-1/2 -translate-y-1/2 w-10 h-10 bg-white rounded-full border-[2px] border-[#0A0A0A] flex items-center justify-center"
                    style={{ boxShadow: '3px 3px 0 #0A0A0A' }}
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </motion.button>
                  <motion.button
                    onClick={next}
                    whileTap={{ scale: 0.9 }}
                    className="absolute right-6 top-1/2 -translate-y-1/2 w-10 h-10 bg-white rounded-full border-[2px] border-[#0A0A0A] flex items-center justify-center"
                    style={{ boxShadow: '3px 3px 0 #0A0A0A' }}
                  >
                    <ChevronRight className="w-5 h-5" />
                  </motion.button>
                </>
              )}

              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5">
                {photos.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setCurrent(i)}
                    className={`w-2 h-2 rounded-full transition-colors ${
                      i === current ? 'bg-[#FF3D77]' : 'bg-white/50'
                    }`}
                  />
                ))}
              </div>
            </div>

            <button
              onClick={() => setLightbox(false)}
              className="absolute top-4 right-4 w-10 h-10 bg-white rounded-full border-[2px] border-[#0A0A0A] flex items-center justify-center font-bold text-lg"
            >
              ✕
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
