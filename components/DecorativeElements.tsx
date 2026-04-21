'use client';

interface DecorativeElementsProps {
  scrollY: number;
}

export default function DecorativeElements({ scrollY }: DecorativeElementsProps) {
  return (
    <>
      {/* Floating stars with parallax */}
      <div
        className="fixed top-[15%] left-[10%] text-4xl pointer-events-none z-10"
        style={{
          transform: `translateY(${scrollY * 0.1}px) rotate(${scrollY * 0.2}deg)`,
          color: '#FF3D77',
        }}
      >
        ★
      </div>
      <div
        className="fixed top-[60%] right-[15%] text-5xl pointer-events-none z-10"
        style={{
          transform: `translateY(${scrollY * 0.15}px) rotate(-${scrollY * 0.3}deg)`,
          color: '#4FC3F7',
        }}
      >
        ★
      </div>
      <div
        className="fixed top-[40%] left-[85%] text-3xl pointer-events-none z-10"
        style={{
          transform: `translateY(${scrollY * 0.08}px)`,
          color: '#FFD600',
        }}
      >
        ⚡
      </div>
      <div
        className="fixed top-[80%] left-[20%] text-4xl pointer-events-none z-10"
        style={{
          transform: `translateY(${scrollY * 0.12}px)`,
          color: '#00D26A',
        }}
      >
        ♪
      </div>
    </>
  );
}
