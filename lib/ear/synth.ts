// 오늘의 음감 소리 합성 (Web Audio). 샘플 파일·외부 라이브러리 없이 오실레이터 + 짧은 엔벨로프.
// AudioContext 생성·iOS unlock은 lib/ensemble-audio.ts를 그대로 쓴다. 첫 재생은 반드시 사용자 탭 안에서.
import { createAudioContext, resumeContext } from '@/lib/ensemble-audio';
import type { Sound } from '@/lib/ear/daily';

const NOTE_SEC = 0.75; // 차례로 듣는 음 하나
const NOTE_GAP = 0.15;
const CHORD_SEC = 1.6;
const BAR_SEC = 1.1; // 진행 한 마디
/** 화음 한 음의 세기. 베이스 포함 최대 5음이 겹쳐도 마스터 앞에서 1을 넘지 않게 */
const VOICE_GAIN = 0.16;

let ctx: AudioContext | null = null;
let current: { stop: () => void } | null = null;

/** 탭 핸들러 안에서 호출. 한 번 만든 컨텍스트를 다시 쓴다 */
export async function unlockEarAudio(): Promise<AudioContext> {
  if (!ctx) ctx = createAudioContext();
  await resumeContext(ctx);
  return ctx;
}

function midiToHz(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

/** 클리핑 방지: 마스터 게인 → 리미터 → 출력 */
function masterChain(audio: AudioContext): { input: GainNode; dispose: () => void } {
  const input = audio.createGain();
  input.gain.value = 0.8;
  const limiter = audio.createDynamicsCompressor();
  limiter.threshold.value = -6;
  limiter.knee.value = 0;
  limiter.ratio.value = 20;
  limiter.attack.value = 0.003;
  limiter.release.value = 0.2;
  input.connect(limiter);
  limiter.connect(audio.destination);
  return {
    input,
    dispose: () => {
      input.disconnect();
      limiter.disconnect();
    },
  };
}

/** 피아노 비슷한 한 음: 삼각파 + 한 옥타브 위 사인(약하게), 빠른 어택·자연 감쇠 */
function scheduleNote(audio: AudioContext, out: AudioNode, midi: number, when: number, dur: number, level: number): OscillatorNode[] {
  const env = audio.createGain();
  env.gain.setValueAtTime(0.0001, when);
  env.gain.exponentialRampToValueAtTime(level, when + 0.012);
  env.gain.exponentialRampToValueAtTime(level * 0.45, when + 0.25);
  env.gain.setValueAtTime(level * 0.45, when + dur - 0.12);
  env.gain.exponentialRampToValueAtTime(0.0001, when + dur);
  env.connect(out);

  const hz = midiToHz(midi);
  const body = audio.createOscillator();
  body.type = 'triangle';
  body.frequency.value = hz;
  body.connect(env);

  const shimmer = audio.createOscillator();
  shimmer.type = 'sine';
  shimmer.frequency.value = hz * 2;
  const shimmerGain = audio.createGain();
  shimmerGain.gain.value = 0.25;
  shimmer.connect(shimmerGain);
  shimmerGain.connect(env);

  for (const osc of [body, shimmer]) {
    osc.start(when);
    osc.stop(when + dur + 0.05);
  }
  return [body, shimmer];
}

/** 소리 길이(초) — 재생 중 표시용 */
export function soundDuration(sound: Sound): number {
  if (sound.kind === 'notes') return sound.notes.length * (NOTE_SEC + NOTE_GAP);
  if (sound.kind === 'chord') return CHORD_SEC;
  return sound.chords.length * BAR_SEC;
}

/** 재생. 이전 소리는 끊고 새로 튼다(다시 듣기 연타 대비). 반환값은 길이(초) */
export function playSound(audio: AudioContext, sound: Sound): number {
  current?.stop();
  const { input, dispose } = masterChain(audio);
  const oscs: OscillatorNode[] = [];
  let when = audio.currentTime + 0.05;

  if (sound.kind === 'notes') {
    for (const n of sound.notes) {
      oscs.push(...scheduleNote(audio, input, n, when, NOTE_SEC, 0.5));
      when += NOTE_SEC + NOTE_GAP;
    }
  } else if (sound.kind === 'chord') {
    for (const n of sound.notes) oscs.push(...scheduleNote(audio, input, n, when, CHORD_SEC, VOICE_GAIN));
  } else {
    for (const chord of sound.chords) {
      for (const n of chord) oscs.push(...scheduleNote(audio, input, n, when, BAR_SEC - 0.05, VOICE_GAIN));
      when += BAR_SEC;
    }
  }

  const duration = soundDuration(sound);
  const timer = setTimeout(() => stop(), (duration + 0.3) * 1000);
  function stop() {
    clearTimeout(timer);
    for (const osc of oscs) {
      try {
        osc.stop();
      } catch {
        /* 이미 끝난 음 */
      }
      osc.disconnect();
    }
    dispose();
    if (current === handle) current = null;
  }
  const handle = { stop };
  current = handle;
  return duration;
}

export function stopSound(): void {
  current?.stop();
}
