/**
 * 백킹 잼 녹음 동안만 iOS 오디오 세션을 'play-and-record'로 바꾸고, 끝나면 원래 값으로 되돌린다.
 * 음감(lib/ear/synth.ts)은 무음 스위치를 무시하려고 'playback'으로 두는데, W3C Audio Session 초안상
 * 직접 정한 타입이 우선이라 'playback' 그대로 마이크를 열면 녹음이 어떻게 될지는 브라우저 구현에 달려 있다.
 * 초안의 예시처럼 녹음 전에 'play-and-record'로 바꾼다. Audio Session API가 없는 브라우저는 아무것도 안 한다.
 * /ear·/stems 코드는 건드리지 않는다(이 함수는 /jam 녹음에서만 부른다).
 */
type AudioSessionNavigator = Navigator & { audioSession?: { type: string } };

/**
 * 녹음 세션 전략. 기본 par. auto·keep은 아이폰 무음 녹음 원인 확인용(QA 주소 ?sess=auto|keep, 2026-11-16)
 * - par: 'play-and-record'로 바꾼다
 * - auto: 'auto'로 돌려 브라우저가 고르게 한다
 * - keep: 건드리지 않는다
 */
export type SessionMode = 'par' | 'auto' | 'keep';

export function sessionModeFromUrl(): SessionMode {
  if (typeof window === 'undefined') return 'par';
  const v = new URLSearchParams(window.location.search).get('sess');
  return v === 'auto' || v === 'keep' ? v : 'par';
}

/** 지금 audioSession.type (API 없으면 'none') */
export function currentSessionType(): string {
  const session = typeof navigator === 'undefined' ? undefined : (navigator as AudioSessionNavigator).audioSession;
  return session ? session.type : 'none';
}

/** 탭 핸들러 안에서(await 전에) 부른다. 돌려받은 함수로 되돌린다 */
export function enterRecordSession(mode: SessionMode = 'par'): () => void {
  const session = typeof navigator === 'undefined' ? undefined : (navigator as AudioSessionNavigator).audioSession;
  if (!session || mode === 'keep') return () => {};
  const prev = session.type;
  try {
    session.type = mode === 'auto' ? 'auto' : 'play-and-record';
  } catch (e) {
    console.warn('[jam] audioSession play-and-record 설정 실패', e);
  }
  return () => {
    try {
      session.type = prev;
    } catch (e) {
      console.warn('[jam] audioSession 되돌리기 실패', e);
    }
  };
}
