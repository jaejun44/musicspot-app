'use client';

import { useState } from 'react';

interface Props {
  photos: string[];
  name: string;
}

export default function PhotoGallery({ photos, name }: Props) {
  const [current, setCurrent] = useState(0);

  if (photos.length === 0) {
    return (
      <div className="w-full h-56 bg-comic-black/10 border-b-[3px] border-comic-black flex items-center justify-center">
        <span className="text-6xl">🎵</span>
      </div>
    );
  }

  return (
    <div className="relative w-full h-56 overflow-hidden border-b-[3px] border-comic-black">
      <img
        src={photos[current]}
        alt={`${name} 사진 ${current + 1}`}
        className="w-full h-full object-cover"
      />

      {photos.length > 1 && (
        <>
          <button
            onClick={() => setCurrent((p) => (p === 0 ? photos.length - 1 : p - 1))}
            className="absolute left-2 top-1/2 -translate-y-1/2 w-9 h-9 bg-comic-cream border-[2px] border-comic-black flex items-center justify-center font-bold text-lg"
            style={{ boxShadow: '2px 2px 0 #0A0A0A' }}
          >
            ‹
          </button>
          <button
            onClick={() => setCurrent((p) => (p === photos.length - 1 ? 0 : p + 1))}
            className="absolute right-2 top-1/2 -translate-y-1/2 w-9 h-9 bg-comic-cream border-[2px] border-comic-black flex items-center justify-center font-bold text-lg"
            style={{ boxShadow: '2px 2px 0 #0A0A0A' }}
          >
            ›
          </button>
          <div
            className="absolute bottom-2 right-3 px-2 py-0.5 bg-comic-black text-comic-yellow text-xs font-bold"
          >
            {current + 1} / {photos.length}
          </div>
        </>
      )}
    </div>
  );
}
