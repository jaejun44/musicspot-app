'use client';

import { useState, useEffect } from 'react';
import { isFavorite, toggleFavorite } from '@/lib/favorites';
import { trackEvent } from '@/lib/analytics';

interface Props {
  studioId: string;
  studioName?: string;
  size?: 'sm' | 'md';
}

export default function FavoriteButton({ studioId, studioName, size = 'sm' }: Props) {
  const [fav, setFav] = useState(false);
  const [animating, setAnimating] = useState(false);

  useEffect(() => {
    setFav(isFavorite(studioId));
  }, [studioId]);

  function handleClick(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();

    const added = toggleFavorite(studioId);
    setFav(added);
    setAnimating(true);
    setTimeout(() => setAnimating(false), 150);

    trackEvent('favorite_toggle', {
      studio_id: studioId,
      studio_name: studioName || '',
      action: added ? 'add' : 'remove',
    });
  }

  const iconSize = size === 'md' ? 'w-6 h-6' : 'w-4 h-4';
  const btnSize = size === 'md' ? 'w-9 h-9' : 'w-7 h-7';

  return (
    <button
      onClick={handleClick}
      className={`flex items-center justify-center ${btnSize} border-[2px] border-comic-black transition-transform duration-150 ${
        fav ? 'bg-comic-pink' : 'bg-white'
      } ${animating ? 'scale-125' : 'scale-100'}`}
      style={{ boxShadow: '2px 2px 0 #0A0A0A' }}
      aria-label={fav ? '즐겨찾기 해제' : '즐겨찾기 추가'}
    >
      {fav ? (
        <svg className={`${iconSize} text-white`} viewBox="0 0 24 24" fill="currentColor">
          <path d="M11.645 20.91l-.007-.003-.022-.012a15.247 15.247 0 01-.383-.218 25.18 25.18 0 01-4.244-3.17C4.688 15.36 2.25 12.174 2.25 8.25 2.25 5.322 4.714 3 7.688 3A5.5 5.5 0 0112 5.052 5.5 5.5 0 0116.313 3c2.973 0 5.437 2.322 5.437 5.25 0 3.925-2.438 7.111-4.739 9.256a25.175 25.175 0 01-4.244 3.17 15.247 15.247 0 01-.383.219l-.022.012-.007.004-.003.001a.752.752 0 01-.704 0l-.003-.001z" />
        </svg>
      ) : (
        <svg className={`${iconSize} text-comic-black`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
        </svg>
      )}
    </button>
  );
}
