'use client';

import { useEffect, useRef } from 'react';
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

export default function RoomMapView({
  studios,
  userLat,
  userLng,
  onMarkerClick,
}: RoomMapViewProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);

  function initMap() {
    if (!mapRef.current || !window.kakao?.maps) return;

    const centerLat = userLat ?? 37.5665;
    const centerLng = userLng ?? 126.978;

    const map = new window.kakao.maps.Map(mapRef.current, {
      center: new window.kakao.maps.LatLng(centerLat, centerLng),
      level: userLat ? 5 : 8,
    });
    mapInstanceRef.current = map;

    // 내 위치 마커
    if (userLat && userLng) {
      const myPos = new window.kakao.maps.LatLng(userLat, userLng);
      const myMarker = new window.kakao.maps.Marker({
        map,
        position: myPos,
        title: '내 위치',
      });
      markersRef.current.push(myMarker);
    }

    placeStudioMarkers(map);
  }

  function placeStudioMarkers(map: any) {
    // Clear previous studio markers (keep user position marker)
    markersRef.current.slice(userLat ? 1 : 0).forEach((m) => m.setMap(null));
    markersRef.current = markersRef.current.slice(0, userLat ? 1 : 0);

    studios
      .filter((s) => s.lat != null && s.lng != null)
      .forEach((studio) => {
        const pos = new window.kakao.maps.LatLng(studio.lat!, studio.lng!);
        const marker = new window.kakao.maps.Marker({ map, position: pos, title: studio.name });
        window.kakao.maps.event.addListener(marker, 'click', () => onMarkerClick(studio));
        markersRef.current.push(marker);
      });
  }

  // Init map on mount
  useEffect(() => {
    if (window.kakao?.maps) {
      window.kakao.maps.load(initMap);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Re-place markers when studios list changes
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    placeStudioMarkers(mapInstanceRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [studios]);

  return (
    <div
      ref={mapRef}
      className="w-full flex-1 min-h-0"
      style={{ minHeight: '400px' }}
    />
  );
}
