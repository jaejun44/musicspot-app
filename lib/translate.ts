// 클라이언트 → /api/translate 호출 래퍼. 여러 텍스트(제목·본문 등)를 한 번에 번역.
export async function translateTexts(texts: string[], target: 'ko' | 'ja'): Promise<string[]> {
  const res = await fetch('/api/translate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ texts, target }),
  });
  if (!res.ok) throw new Error('translate failed');
  const data = (await res.json()) as { translations?: string[] };
  if (!Array.isArray(data.translations)) throw new Error('translate malformed');
  return data.translations;
}
