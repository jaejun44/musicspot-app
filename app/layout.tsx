import type { Metadata } from 'next';
import Script from 'next/script';
import { headers } from 'next/headers';
import PWAInstallBanner from '@/components/PWAInstallBanner';
import AmplitudeProvider from '@/components/AmplitudeProvider';
import { LocaleProvider } from '@/lib/i18n';
import { DEFAULT_LOCALE, isLocale } from '@/lib/i18n/locale';
import './globals.css';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.musicspotfest.com';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: 'Music Spot — 8마디로 밴드를 만든다',
  description:
    '음악인을 위한 연습실 검색 플랫폼. 위치 기반으로 가까운 연습실을 찾고, 바로 문의하세요.',
  openGraph: {
    title: 'Music Spot — 8마디로 밴드를 만든다',
    description: '음악인을 위한 연습실 검색 플랫폼',
    url: SITE_URL,
    siteName: 'Music Spot',
    type: 'website',
    locale: 'ko_KR',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Music Spot — 8마디로 밴드를 만든다',
    description: '음악인을 위한 연습실 검색 플랫폼',
  },
  alternates: {
    canonical: SITE_URL,
    // 현재 한국어 단일 언어. ko-KR + x-default 만 명시(일본어 페이지 생기면 'ja-JP' 한 줄 추가).
    languages: {
      'ko-KR': SITE_URL,
      'x-default': SITE_URL,
    },
  },
  verification: {
    google: 'vNBz8abwMAI7rha-at3lGL10sJDZxFVS6-dIbg2vgME',
  },
};

const GA_ID = process.env.NEXT_PUBLIC_GA_ID;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // middleware가 주입한 로케일 (쿠키 > IP 국가 > Accept-Language)
  const headerLocale = headers().get('x-locale');
  const locale = isLocale(headerLocale) ? headerLocale : DEFAULT_LOCALE;

  return (
    <html lang={locale}>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Music Spot" />
        <meta name="theme-color" content="#FF3D77" />
      </head>
      <body className="min-h-screen bg-comic-cream text-comic-black font-pretendard">
        <AmplitudeProvider />
        <LocaleProvider locale={locale}>
          {children}
          <PWAInstallBanner />
        </LocaleProvider>

        <Script
          src="https://t1.kakaocdn.net/kakao_js_sdk/2.7.4/kakao.min.js"
          strategy="afterInteractive"
        />
        <Script id="kakao-init" strategy="afterInteractive">
          {`
            (function checkKakao() {
              if (window.Kakao && !window.Kakao.isInitialized()) {
                window.Kakao.init('ccad65d2509199874591b68d6cd8ca6b');
              } else if (!window.Kakao) {
                setTimeout(checkKakao, 100);
              }
            })();
          `}
        </Script>

        {GA_ID && (
          <>
            <Script
              src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
              strategy="afterInteractive"
            />
            <Script id="ga-init" strategy="afterInteractive">
              {`
                window.dataLayer = window.dataLayer || [];
                function gtag(){dataLayer.push(arguments);}
                gtag('js', new Date());
                gtag('config', '${GA_ID}');
              `}
            </Script>
          </>
        )}
      </body>
    </html>
  );
}
