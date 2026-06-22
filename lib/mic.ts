// 마이크 스트림 획득 + 실패 원인을 사용자가 이해할 수 있는 한국어로 변환.
// 녹음/JAM 모드 공통 사용 (중복 제거).

export type MicResult = { stream: MediaStream } | { error: string };

/** secure context(HTTPS/localhost)가 아니면 mediaDevices 자체가 없다. */
function isInsecureContext(): boolean {
  if (typeof window === 'undefined') return false;
  const { protocol, hostname } = window.location;
  return protocol !== 'https:' && hostname !== 'localhost' && hostname !== '127.0.0.1';
}

function mapMicError(e: unknown): string {
  const err = e as DOMException;
  switch (err?.name) {
    case 'NotAllowedError':
    case 'SecurityError':
      // 사이트는 허용해도 macOS 시스템 권한이 꺼져 있으면 여기로 떨어진다.
      return '마이크 접근이 거부됐어요. ① 주소창 왼쪽 자물쇠 → 마이크 → 허용, ② Mac은 시스템 설정 → 개인정보 보호 및 보안 → 마이크에서 브라우저 ON(켠 뒤 브라우저 완전 재시작) 후 다시 시도해주세요.';
    case 'NotFoundError':
    case 'OverconstrainedError':
      return '사용할 마이크 장치를 찾지 못했어요. 마이크가 연결돼 있는지 확인해주세요.';
    case 'NotReadableError':
      return '마이크를 다른 앱/탭이 쓰고 있어요. 줌·녹음기·다른 탭 등을 끄고 다시 시도해주세요.';
    case 'AbortError':
      return '마이크를 여는 중 중단됐어요. 다시 시도해주세요.';
    default:
      return `마이크를 열 수 없어요 (${err?.name || '알 수 없는 오류'}: ${err?.message || ''}).`;
  }
}

/** 실패 원인 추적용: 브라우저가 보고하는 권한 상태 + 마이크 장치 수 + 브라우저. */
async function micDiagnostics(): Promise<string> {
  let perm = 'unknown';
  try {
    const p = await navigator.permissions.query({ name: 'microphone' as PermissionName });
    perm = p.state; // granted | denied | prompt
  } catch {
    perm = 'query-미지원';
  }
  let mics = -1;
  try {
    const devs = await navigator.mediaDevices.enumerateDevices();
    mics = devs.filter((d) => d.kind === 'audioinput').length;
  } catch {
    /* 무시 */
  }
  const ua = typeof navigator !== 'undefined' ? navigator.userAgent : '';
  const browser = /Edg\//.test(ua)
    ? 'Edge'
    : /OPR\//.test(ua)
    ? 'Opera'
    : /Brave/.test(ua)
    ? 'Brave'
    : /Chrome\//.test(ua)
    ? 'Chrome'
    : /Safari\//.test(ua)
    ? 'Safari'
    : '기타';
  return `[진단] 권한=${perm} · 마이크=${mics}개 · ${browser}`;
}

/** 마이크 스트림 획득. 실패 시 원인이 담긴 한국어 메시지를 error 로 반환. */
export async function acquireMic(): Promise<MicResult> {
  if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
    return {
      error: isInsecureContext()
        ? `이 주소(${window.location.host})에선 마이크를 못 써요. 브라우저는 HTTPS 또는 localhost에서만 마이크를 허용합니다. https:// 주소나 localhost로 접속해주세요.`
        : '이 브라우저에서 마이크 기능(getUserMedia)을 지원하지 않습니다.',
    };
  }
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    return { stream };
  } catch (e) {
    const diag = await micDiagnostics();
    return { error: `${mapMicError(e)}\n\n${diag}` };
  }
}
