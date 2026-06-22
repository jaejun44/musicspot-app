// 카운트인 메트로놈 (Web Audio OscillatorNode 클릭음)
// bpm 기준 4박 카운트인을 ctx 시간에 정확히 스케줄하고,
// 카운트인이 끝나는 ctx 시간을 반환 → 그 시점에 합주 재생 + 녹음 동시 시작.

export interface CountInHandle {
  /** 카운트인이 끝나는(=연주 시작) ctx.currentTime 기준 절대 시각. */
  endTime: number;
  /** 박 간격(초) = 60 / bpm. */
  beatInterval: number;
  /** 예약된 클릭/콜백 취소 + 정리. */
  cancel: () => void;
}

/** 한 박의 짧은 클릭음을 ctx 시간 when 에 예약. accent=true 면 높은 음(첫 박). */
function scheduleClick(ctx: AudioContext, when: number, accent: boolean): { osc: OscillatorNode; gain: GainNode } {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.frequency.value = accent ? 1320 : 880;
  osc.connect(gain);
  gain.connect(ctx.destination);

  const dur = 0.05;
  gain.gain.setValueAtTime(0.0001, when);
  gain.gain.exponentialRampToValueAtTime(0.4, when + 0.005);
  gain.gain.exponentialRampToValueAtTime(0.0001, when + dur);

  osc.start(when);
  osc.stop(when + dur + 0.02);
  return { osc, gain };
}

/**
 * bpm 기준 beats 박(기본 4박) 카운트인을 예약.
 * @param onBeat 각 박이 울릴 때 호출(메인 스레드 setTimeout 기반, UI 카운트 표시용). 인자는 남은 박 수(beats..1).
 */
export function scheduleCountIn(
  ctx: AudioContext,
  bpm: number,
  beats = 4,
  onBeat?: (beatsRemaining: number) => void
): CountInHandle {
  const beatInterval = 60 / Math.max(bpm, 1);
  // 약간의 리드 타임으로 첫 박 스케줄 안정화.
  const startTime = ctx.currentTime + 0.12;

  const oscs: OscillatorNode[] = [];
  const timers: ReturnType<typeof setTimeout>[] = [];

  for (let i = 0; i < beats; i++) {
    const when = startTime + i * beatInterval;
    const { osc } = scheduleClick(ctx, when, i === 0);
    oscs.push(osc);

    if (onBeat) {
      const delayMs = (when - ctx.currentTime) * 1000;
      timers.push(setTimeout(() => onBeat(beats - i), Math.max(0, delayMs)));
    }
  }

  const endTime = startTime + beats * beatInterval;

  return {
    endTime,
    beatInterval,
    cancel: () => {
      for (const osc of oscs) {
        try {
          osc.stop();
        } catch {
          /* 이미 종료 */
        }
        osc.disconnect();
      }
      for (const t of timers) clearTimeout(t);
    },
  };
}

/** 8마디(4/4 가정) 연주 길이(초). bars=8, beatsPerBar=4. */
export function eightBarsDuration(bpm: number, bars = 8, beatsPerBar = 4): number {
  return (60 / Math.max(bpm, 1)) * beatsPerBar * bars;
}
