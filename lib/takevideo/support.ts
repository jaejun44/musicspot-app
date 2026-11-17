/**
 * 테이크 영상을 만들 수 있는 기기인지 (2026-11-17 사용자 승인: mp4(H.264+AAC)가 안 되면 버튼을 숨기고 기존 링크 공유만).
 * 인스타 릴스가 webm을 받지 않아 mp4만 쓴다. Chrome 126+ · Safari 14.1+가 mp4 녹화를 지원한다.
 */

/** 앞에서부터 처음 되는 형식을 쓴다. 코덱을 꼭 적는다 — 코덱 없이 "video/mp4"만 주면 브라우저가 다른 오디오 코덱을 고를 수 있다 */
export const MP4_TYPES = [
  'video/mp4;codecs=avc1.640028,mp4a.40.2',
  'video/mp4;codecs=avc1.4D401F,mp4a.40.2',
  'video/mp4;codecs=avc1.42E01E,mp4a.40.2',
  'video/mp4;codecs=avc1,mp4a',
] as const;

/** 브라우저 전용: 쓸 mimeType, 못 만드는 기기면 null */
export function pickTakeVideoMime(): string | null {
  if (typeof window === 'undefined') return null;
  if (typeof MediaRecorder === 'undefined' || typeof MediaRecorder.isTypeSupported !== 'function') return null;
  if (typeof HTMLCanvasElement === 'undefined' || typeof HTMLCanvasElement.prototype.captureStream !== 'function') return null;
  const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AC || typeof AC.prototype.createMediaStreamDestination !== 'function') return null;
  for (const type of MP4_TYPES) {
    if (MediaRecorder.isTypeSupported(type)) return type;
  }
  return null;
}

/** 파일 이름: musicspot-<프로젝트 앞 8자>.mp4 */
export function takeVideoFileName(projectId: string): string {
  return `musicspot-${projectId.replace(/[^a-zA-Z0-9]/g, '').slice(0, 8)}.mp4`;
}
