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
      <div className="w-full h-56 bg-brand-card flex items-center justify-center text-brand-muted">
        <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"
          />
        </svg>
      </div>
    );
  }

  return (
    <div className="relative w-full h-56 overflow-hidden">
      <img
        src={photos[current]}
        alt={`${name} 사진 ${current + 1}`}
        className="w-full h-full object-cover"
      />

      {photos.length > 1 && (
        <>
          <button
            onClick={() => setCurrent((p) => (p === 0 ? photos.length - 1 : p - 1))}
            className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-black/50 rounded-full flex items-center justify-center text-white"
          >
            ‹
          </button>
          <button
            onClick={() => setCurrent((p) => (p === photos.length - 1 ? 0 : p + 1))}
            className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-black/50 rounded-full flex items-center justify-center text-white"
          >
            ›
          </button>
          <div className="absolute bottom-2 right-3 px-2 py-0.5 bg-black/60 rounded text-xs text-white">
            {current + 1} / {photos.length}
          </div>
        </>
      )}
    </div>
  );
}
