/**
 * 영상용 소리: 섹션 1(반주가 있으면 반주 포함)을 상세 화면 "전체 곡 듣기"와 같은 구성으로 한 버퍼에 미리 믹스한다.
 * 상세 화면 경로 = 모든 버퍼를 같은 시각에 시작 → createMasterChain(게인 0.85 + 리미터) → 스피커(lib/ensemble-audio.ts playSequence).
 * 여기서는 같은 createMasterChain을 OfflineAudioContext에 만들어 쓴다 → 음량 균형이 같다. ensemble-audio.ts는 고치지 않는다.
 * 반주 없는 프로젝트가 43.5초를 넘으면 자르기 직전 짧게 페이드(timeline.ts).
 */
import { createMasterChain } from '@/lib/ensemble-audio';
import type { Levels } from './draw';
import type { Timeline } from './timeline';

/** MediaRecorder 오디오가 48kHz라 같은 값으로 믹스(다르면 브라우저가 한 번 더 변환한다) */
export const MIX_SAMPLE_RATE = 48000;
/** 진폭 막대 해상도(개/초) */
export const LEVEL_RATE = 30;

export interface MixInput {
  /** 반주(이미 저장된 반주 음량 반영 — renderProjectBacking). 반주 없는 프로젝트 null */
  backing: AudioBuffer | null;
  /** 섹션 1에 쌓인 테이크들 */
  takes: AudioBuffer[];
  timeline: Timeline;
}

export async function mixSection(input: MixInput): Promise<AudioBuffer> {
  const { backing, takes, timeline } = input;
  if (takes.length === 0) throw new Error('[takevideo] 섹션 1에 재생할 트랙이 없음');
  const length = Math.ceil(timeline.musicSec * MIX_SAMPLE_RATE);
  const off = new OfflineAudioContext(2, length, MIX_SAMPLE_RATE);
  const { master } = createMasterChain(off);
  const pre = off.createGain();
  pre.connect(master);
  if (timeline.fadeFromSec != null) {
    pre.gain.setValueAtTime(1, timeline.fadeFromSec);
    pre.gain.linearRampToValueAtTime(0, timeline.musicSec);
  }
  for (const buf of backing ? [backing, ...takes] : takes) {
    const src = off.createBufferSource();
    src.buffer = buf;
    src.connect(pre);
    src.start(0);
  }
  return off.startRendering();
}

/** 순수: 여러 버퍼(모든 채널)의 구간별 평균 RMS → 0~1(−48dB = 0, 0dB = 1) */
export function envelope(buffers: { data: Float32Array[]; sampleRate: number }[], seconds: number, rate = LEVEL_RATE): Float32Array {
  const n = Math.max(1, Math.ceil(seconds * rate));
  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    let sum = 0;
    let count = 0;
    for (const b of buffers) {
      const from = Math.floor((i / rate) * b.sampleRate);
      const to = Math.floor(((i + 1) / rate) * b.sampleRate);
      for (const ch of b.data) {
        const end = Math.min(to, ch.length);
        for (let k = from; k < end; k += 4) {
          sum += ch[k] * ch[k];
          count++;
        }
      }
    }
    const rms = count ? Math.sqrt(sum / count) : 0;
    const db = rms > 0 ? 20 * Math.log10(rms) : -100;
    out[i] = Math.max(0, Math.min(1, (db + 48) / 48));
  }
  return out;
}

function channels(buf: AudioBuffer): { data: Float32Array[]; sampleRate: number } {
  const data: Float32Array[] = [];
  for (let c = 0; c < buf.numberOfChannels; c++) data.push(buf.getChannelData(c));
  return { data, sampleRate: buf.sampleRate };
}

/** 반주·연주를 따로 계산한 진폭(색 구분용) */
export function computeLevels(input: MixInput): Levels {
  const sec = input.timeline.musicSec;
  return {
    rate: LEVEL_RATE,
    backing: input.backing ? envelope([channels(input.backing)], sec) : null,
    take: envelope(input.takes.map(channels), sec),
  };
}
