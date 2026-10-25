'use client';

interface DecorativeElementsProps {
  scrollY: number;
}

export default function DecorativeElements({ scrollY }: DecorativeElementsProps) {
  return (
    <>
      {/* Floating stars with parallax — 화면에 고정돼 글·버튼을 덮으므로 넓은 화면에서만 */}
      <div
        className="hidden lg:block fixed top-[15%] left-[10%] text-4xl pointer-events-none z-10"
        style={{
          transform: `translateY(${scrollY * 0.1}px) rotate(${scrollY * 0.2}deg)`,
          color: '#FF3D77',
        }}
      >
        ★
      </div>
      <div
        className="hidden lg:block fixed top-[60%] right-[15%] text-5xl pointer-events-none z-10"
        style={{
          transform: `translateY(${scrollY * 0.15}px) rotate(-${scrollY * 0.3}deg)`,
          color: '#4FC3F7',
        }}
      >
        ★
      </div>
      <div
        className="hidden lg:block fixed top-[40%] left-[85%] text-3xl pointer-events-none z-10"
        style={{
          transform: `translateY(${scrollY * 0.08}px)`,
          color: '#F5FF4F',
        }}
      >
        ⚡
      </div>
      <div
        className="hidden lg:block fixed top-[80%] left-[20%] text-4xl pointer-events-none z-10"
        style={{
          transform: `translateY(${scrollY * 0.12}px)`,
          color: '#41C66B',
        }}
      >
        ♪
      </div>
    </>
  );
}
