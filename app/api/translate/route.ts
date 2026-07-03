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

// ─── 음악 용어 고정 용어집(DeepL Glossary) ───
// DeepL 계정에 미리 생성해 둔 용어집 ID(마디→小節 등). ID는 비밀값 아님(계정 스코프).
// 무료 티어는 용어집 1개 제한 → 주 방향 KO→JA만 적용. JA→KO는 Pro 전환 시 env로 추가.
const GLOSSARY_KO_JA = process.env.DEEPL_GLOSSARY_KO_JA || '4dfff537-9b45-49a6-99f7-1f695bedd215';
const GLOSSARY_JA_KO = process.env.DEEPL_GLOSSARY_JA_KO || '';

/** target 언어에 맞는 용어집 설정(있으면). 용어집 사용 시 source_lang 필수. */
function glossaryFor(target: string): { source: string; glossary: string } | null {
  if (target === 'ja' && GLOSSARY_KO_JA) return { source: 'KO', glossary: GLOSSARY_KO_JA };
  if (target === 'ko' && GLOSSARY_JA_KO) return { source: 'JA', glossary: GLOSSARY_JA_KO };
  return null;
}

/** 텍스트 하나를 target 언어로 번역 (DeepL + 음악 용어집). */
async function translateOne(text: string, target: string): Promise<string> {
  if (!text.trim()) return text;

  const key = process.env.DEEPL_API_KEY;
  if (!key) throw new Error('DEEPL_API_KEY missing');

  // 무료 키(':fx' 접미사)는 api-free.deepl.com, 유료는 api.deepl.com
  const host = key.endsWith(':fx') ? 'https://api-free.deepl.com' : 'https://api.deepl.com';

  const base: Record<string, unknown> = { text: [text], target_lang: DEEPL_TARGET[target] ?? 'EN-US' };
  const g = glossaryFor(target);
  const withGlossary = g ? { ...base, source_lang: g.source, glossary_id: g.glossary } : base;

  const call = (payload: Record<string, unknown>) =>
    fetch(`${host}/v2/translate`, {
      method: 'POST',
      headers: { Authorization: `DeepL-Auth-Key ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      cache: 'no-store',
    });

  let res = await call(withGlossary);
  // 용어집 ID가 무효/삭제됐거나 오류면 용어집 없이 재시도(번역 자체는 계속 동작)
  if (!res.ok && g) res = await call(base);
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
