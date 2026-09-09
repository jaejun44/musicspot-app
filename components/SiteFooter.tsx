'use client';

import Link from 'next/link';
import { useT, useIsJapanMode } from '@/lib/i18n';

const rockerImage = '/ms_character/joy.png';

// 푸터 노출용 인기 지역(전역 내부 링크 → SEO 크롤링 경로 + 발견성)
const FOOTER_REGIONS = [
  { slug: 'hongdae', label: '홍대' },
  { slug: 'gangnam', label: '강남' },
  { slug: 'konkuk', label: '건대' },
  { slug: 'sinchon', label: '신촌' },
  { slug: 'busan', label: '부산' },
  { slug: 'daegu', label: '대구' },
];

export default function SiteFooter() {
  const t = useT();
  const isJapanMode = useIsJapanMode();

  // 일본 모드: 연습실 관련 서비스 링크 제외
  const services: { label: string; href: string }[] = isJapanMode
    ? [
        { label: t('밴드 매칭'), href: '/band-matching' },
        { label: t('8마디 챌린지'), href: '/stems' },
        { label: t('커뮤니티'), href: '/community' },
      ]
    : [
        { label: t('연습실 찾기'), href: '/search' },
        { label: t('합주실'), href: '/search' },
        { label: t('밴드 매칭'), href: '/band-matching' },
        { label: t('8마디 챌린지'), href: '/stems' },
      ];

  return (
    <footer className="bg-[#0A0A1F] text-white py-16 px-8">
      <div className="max-w-[1440px] mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-6 gap-12 mb-12">
          {/* Logo & Tagline */}
          <div className="md:col-span-2">
            <div className="flex items-center gap-4 mb-4">
              <img
                src={rockerImage}
                alt="Rock Character Mascot"
                className="w-16 h-16 object-contain"
              />
              <h3
                className="uppercase"
                style={{ fontFamily: 'Bungee, sans-serif', fontSize: '24px', color: '#FF3D77' }}
              >
                MUSIC SPOT
              </h3>
            </div>
            <p
              className="text-gray-300"
              style={{ fontFamily: 'Pretendard, sans-serif', fontSize: '16px' }}
            >
              Your stage starts here. ⚡ POW!
            </p>
          </div>

          {/* Services */}
          <div>
            <h4
              className="mb-4"
              style={{ fontFamily: 'Bungee, sans-serif', fontSize: '16px', color: '#F5FF4F' }}
            >
              {t('서비스')}
            </h4>
            <ul className="space-y-2">
              {services.map((item) => (
                <li key={item.label}>
                  <Link
                    href={item.href}
                    className="text-gray-300 hover:text-[#FF3D77] transition-colors"
                    style={{ fontFamily: 'Pretendard, sans-serif', fontSize: '14px' }}
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* 지역 (SEO 내부 링크) — 일본 모드 숨김 */}
          {!isJapanMode && (
          <div>
            <h4
              className="mb-4"
              style={{ fontFamily: 'Bungee, sans-serif', fontSize: '16px', color: '#F5FF4F' }}
            >
              {t('지역')}
            </h4>
            <ul className="space-y-2">
              {FOOTER_REGIONS.map((r) => (
                <li key={r.slug}>
                  <Link
                    href={`/region/${r.slug}`}
                    className="text-gray-300 hover:text-[#FF3D77] transition-colors"
                    style={{ fontFamily: 'Pretendard, sans-serif', fontSize: '14px' }}
                  >
                    {r.label} {t('연습실')}
                  </Link>
                </li>
              ))}
              <li>
                <Link
                  href="/region"
                  className="text-[#F5FF4F] hover:text-[#FF3D77] transition-colors font-bold"
                  style={{ fontFamily: 'Pretendard, sans-serif', fontSize: '14px' }}
                >
                  {t('전체 지역 보기 →')}
                </Link>
              </li>
            </ul>
          </div>
          )}

          <div>
            <h4 className="mb-4 font-bold text-[#F5FF4F]">{t('고객지원')}</h4>
            <ul className="space-y-2 text-sm text-gray-300">
              <li><Link href="/feedback" className="hover:text-[#FF3D77]">{t('문의하기')}</Link></li>
              {!isJapanMode && <li><Link href="/room/new" className="hover:text-[#FF3D77]">연습실 등록 요청</Link></li>}
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-gray-700 pt-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <p
              className="text-gray-400"
              style={{ fontFamily: 'Pretendard, sans-serif', fontSize: '14px' }}
            >
              © 2026 Music Spot. All rights reserved.
            </p>
            <a href="https://www.instagram.com/music_spot_kr/" target="_blank" rel="noopener noreferrer" className="text-gray-300 hover:text-[#4FC3F7] text-sm">
              Instagram · @music_spot_kr
            </a>

          </div>
        </div>
      </div>
    </footer>
  );
}
