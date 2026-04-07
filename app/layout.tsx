import type { Metadata } from 'next';
import Script from 'next/script';
import './globals.css';

export const metadata: Metadata = {
  title: 'Music Spot — 내 밴드에 맞는 연습실 찾기',
  description:
    '음악인을 위한 연습실 검색 플랫폼. 위치 기반으로 가까운 연습실을 찾고, 바로 문의하세요.',
  openGraph: {
    title: 'Music Spot — 내 밴드에 맞는 연습실 찾기',
    description: '음악인을 위한 연습실 검색 플랫폼',
    type: 'website',
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
      <body className="min-h-screen bg-brand-bg text-brand-text font-pretendard">
        {children}

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
