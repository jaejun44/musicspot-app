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
let silentPrimed = false;

/** iPhone·iPad(iPadOS는 Mac으로 보이므로 터치로 구분). iOS는 브라우저 상관없이 WebKit */
export function isIOS(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

type AudioSessionNavigator = Navigator & { audioSession?: { type: string } };

/**
 * iOS 무음 스위치 대응. Web Audio 기본 세션(auto→ambient)은 무음 모드에서 소리가 안 난다.
 * ① Audio Session API(iOS 17+ Safari, W3C 초안)가 있으면 'playback'으로 → 무음 스위치를 따르지 않음
 * ② 없으면(구형 iOS) 탭 안에서 무음 <audio>를 한 번 재생해 미디어 재생 세션으로 바꾼다 — 비공식 우회, 동작은 실기기로만 확인 가능
 * 다른 브라우저(데스크톱·안드로이드)는 아무것도 하지 않는다. lib/ensemble-audio.ts(8마디)는 건드리지 않는다
 */
function preferPlaybackSession(): void {
  const session = (navigator as AudioSessionNavigator).audioSession;
  if (session) {
    try {
      if (session.type !== 'playback') session.type = 'playback';
    } catch (e) {
      console.warn('[ear] audioSession 설정 실패', e);
    }
    return;
  }
  if (silentPrimed || !isIOS()) return;
  silentPrimed = true;
  try {
    const url = silentWavUrl();
    const el = new Audio(url);
    el.setAttribute('playsinline', '');
    el.onended = () => URL.revokeObjectURL(url);
    // play()는 탭과 같은 동기 흐름에서 불러야 한다(await 전에). 결과는 기다리지 않는다
    el.play().catch((e) => {
      silentPrimed = false; // 다음 탭에서 다시 시도
      console.warn('[ear] 무음 오디오 재생 실패', e);
    });
  } catch (e) {
    silentPrimed = false;
    console.warn('[ear] 무음 오디오 준비 실패', e);
  }
}

/** 0.1초 무음 WAV(8kHz·8bit·모노). 파일을 두지 않고 그 자리에서 만든다 */
function silentWavUrl(): string {
  const samples = 800;
  const buf = new ArrayBuffer(44 + samples);
  const v = new DataView(buf);
  const str = (o: number, s: string) => s.split('').forEach((c, i) => v.setUint8(o + i, c.charCodeAt(0)));
  str(0, 'RIFF');
  v.setUint32(4, 36 + samples, true);
  str(8, 'WAVE');
  str(12, 'fmt ');
  v.setUint32(16, 16, true);
  v.setUint16(20, 1, true); // PCM
  v.setUint16(22, 1, true); // 모노
  v.setUint32(24, 8000, true);
  v.setUint32(28, 8000, true);
  v.setUint16(32, 1, true);
  v.setUint16(34, 8, true);
  str(36, 'data');
  v.setUint32(40, samples, true);
  for (let i = 0; i < samples; i++) v.setUint8(44 + i, 128); // 8bit 무음 = 128
  return URL.createObjectURL(new Blob([buf], { type: 'audio/wav' }));
}

/** 탭 핸들러 안에서 호출. 한 번 만든 컨텍스트를 다시 쓴다 */
export async function unlockEarAudio(): Promise<AudioContext> {
  preferPlaybackSession(); // await 전에 — 사용자 탭 안이어야 한다
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
