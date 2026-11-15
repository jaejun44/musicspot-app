/**
 * 백킹 잼 테이크 가공 (순수 함수 — 테스트 tests/jam-take.cjs).
 * 녹음(webm)을 디코딩한 샘플 → 싱크 값만큼 앞을 자르거나 무음을 채움 → 음량 → 정확히 8마디 길이 → 모노 16bit WAV.
 * 싱크 +값 = 테이크를 늦춘다(앞에 무음), −값 = 당긴다(앞을 자름). 범위 ±300ms, 10ms 단위.
 */

export const OFFSET_MIN_MS = -300;
export const OFFSET_MAX_MS = 300;
export const OFFSET_STEP_MS = 10;
export const GAIN_MIN = 0;
export const GAIN_MAX = 2;

export function clampOffset(ms: number): number {
  const stepped = Math.round(ms / OFFSET_STEP_MS) * OFFSET_STEP_MS;
  return Math.max(OFFSET_MIN_MS, Math.min(OFFSET_MAX_MS, stepped));
}

/** 여러 채널 → 모노(평균) */
export function mixToMono(channels: Float32Array[]): Float32Array {
  if (channels.length === 0) return new Float32Array(0);
  if (channels.length === 1) return channels[0].slice();
  const len = Math.min(...channels.map((c) => c.length));
  const out = new Float32Array(len);
  for (const c of channels) for (let i = 0; i < len; i++) out[i] += c[i] / channels.length;
  return out;
}

/**
 * @param samples 모노 샘플
 * @param offsetMs 싱크(+늦춤 / −당김)
 * @param targetSec 결과 길이(8마디)
 * @param gain 음량 배수(0~2). 결과는 −1~1로 자른다
 */
export function processTake(samples: Float32Array, sampleRate: number, offsetMs: number, targetSec: number, gain = 1): Float32Array {
  const target = Math.round(targetSec * sampleRate);
  const shift = Math.round((clampOffset(offsetMs) / 1000) * sampleRate);
  const g = Math.max(GAIN_MIN, Math.min(GAIN_MAX, gain));
  const out = new Float32Array(target);
  for (let i = 0; i < target; i++) {
    const src = i - shift;
    if (src < 0 || src >= samples.length) continue;
    const v = samples[src] * g;
    out[i] = v > 1 ? 1 : v < -1 ? -1 : v;
  }
  return out;
}

/** 모노 Float32 → 16bit PCM WAV */
export function encodeWavMono16(samples: Float32Array, sampleRate: number): ArrayBuffer {
  const bytes = 44 + samples.length * 2;
  const buf = new ArrayBuffer(bytes);
  const v = new DataView(buf);
  const str = (o: number, s: string) => {
    for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i));
  };
  str(0, 'RIFF');
  v.setUint32(4, bytes - 8, true);
  str(8, 'WAVE');
  str(12, 'fmt ');
  v.setUint32(16, 16, true);
  v.setUint16(20, 1, true); // PCM
  v.setUint16(22, 1, true); // 모노
  v.setUint32(24, sampleRate, true);
  v.setUint32(28, sampleRate * 2, true);
  v.setUint16(32, 2, true);
  v.setUint16(34, 16, true);
  str(36, 'data');
  v.setUint32(40, samples.length * 2, true);
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    v.setInt16(44 + i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }
  return buf;
}

/** 테스트·검증용: WAV 헤더에서 샘플레이트·샘플 수 */
export function readWavInfo(buf: ArrayBuffer): { sampleRate: number; channels: number; samples: number } {
  const v = new DataView(buf);
  const channels = v.getUint16(22, true);
  return { sampleRate: v.getUint32(24, true), channels, samples: v.getUint32(40, true) / 2 / channels };
}
