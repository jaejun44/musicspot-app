'use client';

import { useEffect, useRef, useState } from 'react';
import { Studio } from '@/types/studio';

interface RoomMapViewProps {
  studios: Studio[];
  userLat: number | null;
  userLng: number | null;
  onMarkerClick: (studio: Studio) => void;
}

declare global {
  interface Window {
    kakao: any;
  }
}

const SEOUL = { lat: 37.5665, lng: 126.978 };

/** 카카오맵 SDK(클러스터러 포함)를 1회만 로드. 이미 로드됐으면 즉시 resolve. */
function loadKakaoMapSdk(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined') return reject(new Error('no window'));
    if (window.kakao?.maps) {
      window.kakao.maps.load(() => resolve());
      return;
    }
    const SRC_MATCH = 'dapi.kakao.com/v2/maps';
    const existing = document.querySelector(`script[src*="${SRC_MATCH}"]`) as HTMLScriptElement | null;

    const onReady = () => {
      if (window.kakao?.maps) window.kakao.maps.load(() => resolve());
      else reject(new Error('kakao maps unavailable'));
    };

    if (existing) {
      // 이미 주입됐지만 아직 init 전일 수 있음 → 폴링
      const timer = setInterval(() => {
        if (window.kakao?.maps) {
          clearInterval(timer);
          window.kakao.maps.load(() => resolve());
        }
      }, 60);
      setTimeout(() => clearInterval(timer), 8000);
      return;
    }

    const appkey = process.env.NEXT_PUBLIC_KAKAO_MAP_KEY;
    if (!appkey) return reject(new Error('NEXT_PUBLIC_KAKAO_MAP_KEY missing'));

    const script = document.createElement('script');
    script.async = true;
    // autoload=false + libraries=clusterer (마커 클러스터링)
    script.src = `//dapi.kakao.com/v2/maps/sdk.js?appkey=${appkey}&autoload=false&libraries=clusterer`;
    script.onload = onReady;
    script.onerror = () => reject(new Error('kakao sdk load failed'));
    document.head.appendChild(script);
  });
}

export default function RoomMapView({
  studios,
  userLat,
  userLng,
  onMarkerClick,
}: RoomMapViewProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const clustererRef = useRef<any>(null);
  const myMarkerRef = useRef<any>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');

  // 최신 onMarkerClick 참조 유지(리스너 재바인딩 방지)
  const clickRef = useRef(onMarkerClick);
  clickRef.current = onMarkerClick;

  // SDK 로드 + 지도 1회 초기화
  useEffect(() => {
    let cancelled = false;
    loadKakaoMapSdk()
      .then(() => {
        if (cancelled || !mapRef.current) return;
        const kakao = window.kakao;
        const center = new kakao.maps.LatLng(userLat ?? SEOUL.lat, userLng ?? SEOUL.lng);
        const map = new kakao.maps.Map(mapRef.current, { center, level: userLat ? 5 : 8 });
        mapInstanceRef.current = map;

        clustererRef.current = new kakao.maps.MarkerClusterer({
          map,
          averageCenter: true,
          minLevel: 6, // 이 레벨 이상으로 축소되면 클러스터링
          disableClickZoom: false,
        });

        renderMarkers();
        setStatus('ready');
      })
      .catch(() => {
        if (!cancelled) setStatus('error');
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 내 위치 마커 갱신
  useEffect(() => {
    const kakao = window.kakao;
    const map = mapInstanceRef.current;
    if (!kakao?.maps || !map) return;

    if (myMarkerRef.current) {
      myMarkerRef.current.setMap(null);
      myMarkerRef.current = null;
    }
    if (userLat != null && userLng != null) {
      const pos = new kakao.maps.LatLng(userLat, userLng);
      myMarkerRef.current = new kakao.maps.Marker({ map, position: pos, title: '내 위치' });
      map.setCenter(pos);
      map.setLevel(5);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userLat, userLng, status]);

  // 스튜디오 마커 갱신(클러스터러 사용)
  function renderMarkers() {
    const kakao = window.kakao;
    const clusterer = clustererRef.current;
    if (!kakao?.maps || !clusterer) return;

    clusterer.clear();
    const markers = studios
      .filter((s) => s.lat != null && s.lng != null)
      .map((studio) => {
        const marker = new kakao.maps.Marker({
          position: new kakao.maps.LatLng(studio.lat!, studio.lng!),
          title: studio.name,
        });
        kakao.maps.event.addListener(marker, 'click', () => clickRef.current(studio));
        return marker;
      });
    clusterer.addMarkers(markers);
  }

  useEffect(() => {
    if (status === 'ready') renderMarkers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [studios, status]);

  return (
    <div className="relative w-full flex-1 min-h-0" style={{ minHeight: '400px' }}>
      <div ref={mapRef} className="w-full h-full" style={{ minHeight: '400px' }} />

      {status === 'loading' && (
        <div className="absolute inset-0 flex items-center justify-center bg-comic-cream/60 backdrop-blur-sm">
          <div className="w-9 h-9 rounded-full border-[3px] border-[#FF3D77] border-t-transparent animate-spin" />
        </div>
      )}
      {status === 'error' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-comic-cream/80 px-6 text-center">
          <span className="text-3xl">🗺️</span>
          <p className="text-[13px] font-bold text-[#0A0A0A]/70">
            지도를 불러오지 못했어요. 목록 보기로 확인해주세요.
          </p>
        </div>
      )}
    </div>
  );
}
