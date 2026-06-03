import { NextResponse } from 'next/server';

const GIF_URL =
  'https://www.apparelmusic.com/wp-content/uploads/2022/04/wax-mixer-copia-2.gif';

export async function GET() {
  const res = await fetch(GIF_URL, { cache: 'force-cache' });
  const buffer = await res.arrayBuffer();
  return new NextResponse(buffer, {
    headers: {
      'Content-Type': 'image/gif',
      'Cache-Control': 'public, max-age=86400',
      'Access-Control-Allow-Origin': '*',
    },
  });
}
