// 업로드 파일에서 8마디 구간만 잘라내기 위한 오디오 유틸.
// 디코드 → 파형 피크 계산 → 구간 슬라이스 → WAV 인코딩.

// 트리머 전용 AudioContext를 앱 전역에서 하나만 쓴다.
// 파일을 바꿀 때마다 새로 만들면(그리고 안 닫으면) 브라우저의 컨텍스트 개수
// 한도(~6개)에 걸려 new AudioContext()가 던지고 파형이 안 뜬다.
let sharedCtx: AudioContext | null = null;

/**
 * 트리머용 공유 AudioContext. 최초 1회만 생성·재사용한다.
 * 브라우저 한도 초과 등으로 생성이 실패하면 던진다(호출부에서 폴백 처리).
 */
export function getTrimAudioContext(): AudioContext {
  if (sharedCtx && sharedCtx.state !== 'closed') return sharedCtx;
  const Ctx: typeof AudioContext =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  sharedCtx = new Ctx();
  return sharedCtx;
}

/** 파일을 AudioBuffer로 디코드. Safari 대응으로 콜백형 decodeAudioData 사용. */
export async function decodeAudioFile(file: File, ctx: AudioContext): Promise<AudioBuffer> {
  const arrayBuffer = await file.arrayBuffer();
  return await new Promise<AudioBuffer>((resolve, reject) => {
    ctx.decodeAudioData(
      arrayBuffer,
      (buffer) => resolve(buffer),
      (err) => reject(err ?? new Error('decodeAudioData failed'))
    );
  });
}

export interface WaveformPeaks {
  min: Float32Array;
  max: Float32Array;
}

/**
 * 파형 그리기용 버킷별 min/max 피크.
 * 채널을 평균내 모노로 합친 뒤 buckets 개 구간으로 나눈다.
 */
export function computePeaks(buffer: AudioBuffer, buckets: number): WaveformPeaks {
  const count = Math.max(1, Math.floor(buckets));
  const min = new Float32Array(count);
  const max = new Float32Array(count);

  const channels: Float32Array[] = [];
  for (let c = 0; c < buffer.numberOfChannels; c++) channels.push(buffer.getChannelData(c));

  const framesPerBucket = buffer.length / count;

  for (let b = 0; b < count; b++) {
    const start = Math.floor(b * framesPerBucket);
    const end = Math.min(buffer.length, Math.floor((b + 1) * framesPerBucket));

    let lo = 0;
    let hi = 0;
    for (let i = start; i < end; i++) {
      let sum = 0;
      for (let c = 0; c < channels.length; c++) sum += channels[c][i];
      const v = sum / channels.length;
      if (v < lo) lo = v;
      if (v > hi) hi = v;
    }
    min[b] = lo;
    max[b] = hi;
  }

  return { min, max };
}

/** 클릭 노이즈 방지용 페이드 길이(초). */
const FADE_SEC = 0.005;

/** [startSec, endSec) 구간을 잘라 새 AudioBuffer로 반환. 양 끝에 짧은 페이드를 건다. */
export function sliceAudioBuffer(
  source: AudioBuffer,
  startSec: number,
  endSec: number,
  ctx: AudioContext
): AudioBuffer {
  const sampleRate = source.sampleRate;
  const startFrame = Math.max(0, Math.floor(startSec * sampleRate));
  const endFrame = Math.min(source.length, Math.ceil(endSec * sampleRate));
  const length = Math.max(1, endFrame - startFrame);

  const out = ctx.createBuffer(source.numberOfChannels, length, sampleRate);
  const fadeFrames = Math.min(Math.floor(FADE_SEC * sampleRate), Math.floor(length / 2));

  for (let c = 0; c < source.numberOfChannels; c++) {
    const src = source.getChannelData(c);
    const dst = out.getChannelData(c);
    for (let i = 0; i < length; i++) dst[i] = src[startFrame + i];

    for (let i = 0; i < fadeFrames; i++) {
      const g = i / fadeFrames;
      dst[i] *= g;
      dst[length - 1 - i] *= g;
    }
  }

  return out;
}

function writeString(view: DataView, offset: number, text: string) {
  for (let i = 0; i < text.length; i++) view.setUint8(offset + i, text.charCodeAt(i));
}

/** AudioBuffer → 16bit PCM WAV Blob. */
export function encodeWav(buffer: AudioBuffer): Blob {
  const numChannels = buffer.numberOfChannels;
  const { length, sampleRate } = buffer;
  const bytesPerSample = 2;
  const blockAlign = numChannels * bytesPerSample;
  const dataSize = length * blockAlign;

  const arrayBuffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(arrayBuffer);

  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  writeString(view, 8, 'WAVE');
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true); // PCM 포맷 청크 길이
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * blockAlign, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, 8 * bytesPerSample, true);
  writeString(view, 36, 'data');
  view.setUint32(40, dataSize, true);

  const channels: Float32Array[] = [];
  for (let c = 0; c < numChannels; c++) channels.push(buffer.getChannelData(c));

  let offset = 44;
  for (let i = 0; i < length; i++) {
    for (let c = 0; c < numChannels; c++) {
      const s = Math.max(-1, Math.min(1, channels[c][i]));
      view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
      offset += 2;
    }
  }

  return new Blob([arrayBuffer], { type: 'audio/wav' });
}

/** 초 → "0:12.3" 표기. */
export function formatSeconds(seconds: number): string {
  const safe = Math.max(0, seconds);
  const m = Math.floor(safe / 60);
  const s = safe - m * 60;
  return `${m}:${s.toFixed(1).padStart(4, '0')}`;
}
