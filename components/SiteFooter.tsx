import Link from 'next/link';

const rockerImage = '/ms_character/joy.png';

export default function SiteFooter() {
  return (
    <footer className="bg-[#0A0A1F] text-white py-16 px-8">
      <div className="max-w-[1440px] mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-12 mb-12">
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
              style={{ fontFamily: 'Bungee, sans-serif', fontSize: '16px', color: '#FFD600' }}
            >
              서비스
            </h4>
            <ul className="space-y-2">
              {['연습실 예약', '합주실', '밴드 매칭', '공연'].map((item) => (
                <li key={item}>
                  <Link
                    href="/search"
                    className="text-gray-300 hover:text-[#FF3D77] transition-colors"
                    style={{ fontFamily: 'Pretendard, sans-serif', fontSize: '14px' }}
                  >
                    {item}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Company */}
          <div>
            <h4
              className="mb-4"
              style={{ fontFamily: 'Bungee, sans-serif', fontSize: '16px', color: '#FFD600' }}
            >
              회사
            </h4>
            <ul className="space-y-2">
              {['회사소개', '팀', '채용', '파트너'].map((item) => (
                <li key={item}>
                  <a
                    href="#"
                    className="text-gray-300 hover:text-[#FF3D77] transition-colors"
                    style={{ fontFamily: 'Pretendard, sans-serif', fontSize: '14px' }}
                  >
                    {item}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Support */}
          <div>
            <h4
              className="mb-4"
              style={{ fontFamily: 'Bungee, sans-serif', fontSize: '16px', color: '#FFD600' }}
            >
              고객지원
            </h4>
            <ul className="space-y-2">
              {['FAQ', '문의하기', '이용약관', '개인정보처리'].map((item) => (
                <li key={item}>
                  <a
                    href="#"
                    className="text-gray-300 hover:text-[#FF3D77] transition-colors"
                    style={{ fontFamily: 'Pretendard, sans-serif', fontSize: '14px' }}
                  >
                    {item}
                  </a>
                </li>
              ))}
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
            <div className="flex gap-6">
              {['Instagram', 'Facebook', 'YouTube', 'Twitter'].map((social) => (
                <a
                  key={social}
                  href="#"
                  className="text-gray-400 hover:text-[#4FC3F7] transition-colors"
                  style={{ fontFamily: 'Pretendard, sans-serif', fontSize: '14px' }}
                >
                  {social}
                </a>
              ))}
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
