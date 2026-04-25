import type { Metadata } from 'next';
import Script from 'next/script';
import './globals.css';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://musicspotapp.vercel.app';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: 'Music Spot — 내 밴드에 맞는 연습실 찾기',
  description:
    '음악인을 위한 연습실 검색 플랫폼. 위치 기반으로 가까운 연습실을 찾고, 바로 문의하세요.',
  openGraph: {
    title: 'Music Spot — 내 밴드에 맞는 연습실 찾기',
    description: '음악인을 위한 연습실 검색 플랫폼',
    url: SITE_URL,
    siteName: 'Music Spot',
    type: 'website',
    locale: 'ko_KR',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Music Spot — 내 밴드에 맞는 연습실 찾기',
    description: '음악인을 위한 연습실 검색 플랫폼',
  },
  alternates: {
    canonical: SITE_URL,
  },
};

const GA_ID = process.env.NEXT_PUBLIC_GA_ID;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body className="min-h-screen bg-comic-cream text-comic-black font-pretendard">
        {children}

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
