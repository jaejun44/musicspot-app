import { NextRequest, NextResponse } from 'next/server';

// ─────────────────────────────────────────────────────────────
// 게시물/댓글 번역 API (한↔일). DeepL 사용.
// 필요 env: DEEPL_API_KEY (무료 키는 ':fx' 로 끝남 → 자동으로 api-free 호스트 사용).
// 프로바이더 교체 시 translateOne() 이 함수만 수정하면 됨.
// ─────────────────────────────────────────────────────────────

const ALLOWED_TARGETS = new Set(['ko', 'ja', 'en']);
const MAX_TEXTS = 5;
const MAX_LEN = 5000;

// 내부 로케일 → DeepL target_lang 코드
const DEEPL_TARGET: Record<string, string> = { ko: 'KO', ja: 'JA', en: 'EN-US' };

/** 텍스트 하나를 target 언어로 번역 (DeepL). source 는 자동 감지. */
async function translateOne(text: string, target: string): Promise<string> {
  if (!text.trim()) return text;

  const key = process.env.DEEPL_API_KEY;
  if (!key) throw new Error('DEEPL_API_KEY missing');

  // 무료 키(':fx' 접미사)는 api-free.deepl.com, 유료는 api.deepl.com
  const host = key.endsWith(':fx') ? 'https://api-free.deepl.com' : 'https://api.deepl.com';

  const res = await fetch(`${host}/v2/translate`, {
    method: 'POST',
    headers: {
      Authorization: `DeepL-Auth-Key ${key}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ text: [text], target_lang: DEEPL_TARGET[target] ?? 'EN-US' }),
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`deepl upstream ${res.status}`);

  const data = (await res.json()) as { translations?: { text?: string }[] };
  return data.translations?.[0]?.text ?? text;
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as { texts?: unknown; target?: unknown };
    const target = String(body.target ?? '');
    if (!Array.isArray(body.texts) || !ALLOWED_TARGETS.has(target)) {
      return NextResponse.json({ error: 'invalid_request' }, { status: 400 });
    }
    const texts = body.texts.slice(0, MAX_TEXTS).map((t) => String(t ?? '').slice(0, MAX_LEN));
    const translations = await Promise.all(texts.map((t) => translateOne(t, target)));
    return NextResponse.json({ translations });
  } catch {
    return NextResponse.json({ error: 'translate_failed' }, { status: 502 });
  }
}
