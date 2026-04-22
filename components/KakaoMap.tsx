'use client';

import { useEffect, useRef } from 'react';

interface Props {
  lat: number;
  lng: number;
  name: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getKakao(): any {
  return (typeof window !== 'undefined' && (window as any).kakao) || null;
}

export default function KakaoMap({ lat, lng, name }: Props) {
  const mapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let destroyed = false;

    function initMap() {
      if (destroyed || !mapRef.current) return;
      const kakao = getKakao();
      if (!kakao?.maps) return;

      const position = new kakao.maps.LatLng(lat, lng);
      const map = new kakao.maps.Map(mapRef.current, { center: position, level: 3 });
      const marker = new kakao.maps.Marker({ map, position });
      const infoWindow = new kakao.maps.InfoWindow({
        content: `<div style="padding:4px 8px;font-size:12px;color:#000;white-space:nowrap;">${name}</div>`,
      });
      infoWindow.open(map, marker);
    }

    const kakao = getKakao();
    if (kakao?.maps) {
      kakao.maps.load(initMap);
      return () => { destroyed = true; };
    }

    // Avoid injecting the SDK script twice
    const existing = document.querySelector('script[src*="dapi.kakao.com/v2/maps"]');
    if (existing) {
      const timer = setInterval(() => {
        if (getKakao()?.maps) {
          clearInterval(timer);
          getKakao().maps.load(initMap);
        }
      }, 60);
      return () => { destroyed = true; clearInterval(timer); };
    }

    const script = document.createElement('script');
    script.async = true;
    script.src = `//dapi.kakao.com/v2/maps/sdk.js?appkey=${process.env.NEXT_PUBLIC_KAKAO_MAP_KEY}&autoload=false`;
    script.onload = () => {
      if (!destroyed) getKakao()?.maps?.load(initMap);
    };
    document.head.appendChild(script);

    return () => { destroyed = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lat, lng]);

  return (
    <div style={{ width: '100%', height: '240px', overflow: 'hidden', position: 'relative' }}>
      <div ref={mapRef} style={{ width: '100%', height: '100%' }} />
    </div>
  );
}
