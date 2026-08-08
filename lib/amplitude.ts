// Amplitude 설정 단일 소스. 프로바이더(초기화)·analytics(이벤트)·채팅 UI(마스킹)가 공유한다.

/** 클라이언트 write key. 브라우저 번들에 노출되는 게 정상(공개 키). */
export const AMPLITUDE_API_KEY = process.env.NEXT_PUBLIC_AMPLITUDE_API_KEY ?? '';

/** 키가 없으면 트래킹 자체를 끈다 (init 안 된 상태로 track하면 이벤트가 큐에 무한 적립됨). */
export const AMPLITUDE_ENABLED = AMPLITUDE_API_KEY.length > 0;

/**
 * Session Replay 녹화에서 내용을 가릴 영역에 붙이는 클래스.
 * `<input>` 값은 기본 마스킹 레벨(medium)이 이미 가리지만, div로 렌더되는
 * 텍스트(1:1 DM 말풍선 등)는 가려지지 않으므로 명시적으로 지정해야 한다.
 */
export const SR_MASK_CLASS = 'ms-sr-mask';
