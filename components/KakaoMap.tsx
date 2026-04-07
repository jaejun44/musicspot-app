'use client';

import { useEffect, useRef } from 'react';
import Script from 'next/script';

interface Props {
  lat: number;
  lng: number;
  name: string;
}

declare global {
  interface Window {
    kakao: any;
  }
}

export default function KakaoMap({ lat, lng, name }: Props) {
  const mapRef = useRef<HTMLDivElement>(null);

  function initMap() {
    if (!mapRef.current || !window.kakao?.maps) return;
    const position = new window.kakao.maps.LatLng(lat, lng);
    const map = new window.kakao.maps.Map(mapRef.current, {
      center: position,
      level: 3,
    });
    const marker = new window.kakao.maps.Marker({ map, position });
    const infoWindow = new window.kakao.maps.InfoWindow({
      content: `<div style="padding:4px 8px;font-size:12px;color:#000;">${name}</div>`,
    });
    infoWindow.open(map, marker);
  }

  useEffect(() => {
    if (window.kakao?.maps) {
      window.kakao.maps.load(initMap);
    }
  }, [lat, lng]);

  return (
    <>
      <Script
        src={`//dapi.kakao.com/v2/maps/sdk.js?appkey=${process.env.NEXT_PUBLIC_KAKAO_MAP_KEY}&autoload=false`}
        strategy="afterInteractive"
        onLoad={() => window.kakao.maps.load(initMap)}
      />
      <div ref={mapRef} className="w-full h-60 rounded-xl overflow-hidden" />
    </>
  );
}
