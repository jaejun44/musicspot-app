// 8마디 놀이형 동시 재생 유틸 (Web Audio API)
// 레벨 A: 레이턴시 보정 없음. 여러 트랙을 같은 시점에 동시 start만 맞춘다.
// 합주 합성/믹스다운은 하지 않음 — 재생 시점에 여러 버퍼를 동시에 트는 것으로 "합주처럼" 들리게 한다.

/** AudioContext 생성 (iOS Safari webkit 폴백). 반드시 사용자 제스처 안에서 호출. */
export function createAudioContext(): AudioContext {
  const Ctx: typeof AudioContext =
    window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  return new Ctx();
}

/** autoplay 정책 대응: suspended 상태면 resume. */
export async function resumeContext(ctx: AudioContext): Promise<void> {
  if (ctx.state === 'suspended') {
    try {
      await ctx.resume();
    } catch {
      /* iOS 일부 환경에서 throw 가능 — 무음 버퍼 트릭으로 보완 */
    }
  }
  // iOS Safari unlock: 무음 버퍼를 한 번 흘려 컨텍스트를 깨운다.
  try {
    const buffer = ctx.createBuffer(1, 1, 22050);
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    src.connect(ctx.destination);
    src.start(0);
  } catch {
    /* 무시 */
  }
}

/**
 * 여러 오디오 URL을 fetch → decodeAudioData 로 AudioBuffer 배열 로드.
 * 디코드 실패한 트랙은 건너뛴다(놀이용이므로 부분 실패 허용).
 */
/** 각 url을 디코드하되 인덱스를 보존(실패 시 null). 섹션 그룹핑용. */
export async function loadTracksAligned(urls: string[], ctx: AudioContext): Promise<(AudioBuffer | null)[]> {
  return Promise.all(
    urls.map(async (url) => {
      try {
        const res = await fetch(url);
        if (!res.ok) return null;
        const arr = await res.arrayBuffer();
        // decodeAudioData 는 일부 브라우저에서 콜백형 — Promise 래핑
        return await new Promise<AudioBuffer | null>((resolve) => {
          ctx.decodeAudioData(
            arr,
            (buf) => resolve(buf),
            () => resolve(null)
          );
        });
      } catch {
        return null;
      }
    })
  );
}

/** 실패한 트랙은 건너뛴 AudioBuffer 배열 (동시재생용). */
export async function loadTracks(urls: string[], ctx: AudioContext): Promise<AudioBuffer[]> {
  const results = await loadTracksAligned(urls, ctx);
  return results.filter((b): b is AudioBuffer => b !== null);
}

export interface EnsembleHandle {
  /** 모든 소스를 즉시 정지하고 정리. */
  stop: () => void;
}

/** 클리핑 방지용 마스터 게인 + 리미터 체인 생성. 백킹 잼(lib/jam/engine.ts)도 같이 쓴다(오프라인 렌더 때문에 BaseAudioContext). */
export function createMasterChain(ctx: BaseAudioContext): { master: GainNode; limiter: DynamicsCompressorNode } {
  const master = ctx.createGain();
  master.gain.value = 0.85;
  const limiter = ctx.createDynamicsCompressor();
  limiter.threshold.value = -3;
  limiter.knee.value = 0;
  limiter.ratio.value = 20;
  limiter.attack.value = 0.003;
  limiter.release.value = 0.25;
  master.connect(limiter);
  limiter.connect(ctx.destination);
  return { master, limiter };
}

/**
 * 모든 버퍼를 같은 startTime(ctx 시간 기준)에 동시 재생.
 * @param startTime ctx.currentTime 기준 절대 시각. 과거면 즉시 재생.
 */
export function playEnsemble(buffers: AudioBuffer[], ctx: AudioContext, startTime: number): EnsembleHandle {
  return playSequence([buffers], ctx, startTime);
}

/**
 * 섹션별 순차 재생 + 섹션 내 동시 재생.
 * sections[i] = 같은 8마디 블록에 쌓인(레이어) 버퍼들 → 동시 재생.
 * 섹션끼리는 이어붙임 → 앞 섹션 길이만큼 뒤로 밀어 순차 재생(곡이 길어짐).
 * @param startTime ctx.currentTime 기준 절대 시각.
 * @param mix 있으면 "기존"·"내 연주" 두 음량 버스로 나눠 재생(백킹 잼 프로젝트 함께 녹음 미리듣기). 없으면 기존과 똑같다
 */
export function playSequence(sections: AudioBuffer[][], ctx: AudioContext, startTime: number): EnsembleHandle;
export function playSequence(sections: AudioBuffer[][], ctx: AudioContext, startTime: number, mix: MixOptions): MixHandle;
export function playSequence(sections: AudioBuffer[][], ctx: AudioContext, startTime: number, mix?: MixOptions): EnsembleHandle | MixHandle {
  const sources: AudioBufferSourceNode[] = [];
  const { master, limiter } = createMasterChain(ctx);
  let base: GainNode | null = null;
  let mine: GainNode | null = null;
  if (mix) {
    base = ctx.createGain();
    base.gain.value = mix.baseGain;
    base.connect(master);
    mine = ctx.createGain();
    mine.gain.value = mix.mineGain;
    mine.connect(master);
  }

  let when = Math.max(startTime, ctx.currentTime);
  for (const section of sections) {
    let sectionDur = 0;
    for (const buf of section) {
      const src = ctx.createBufferSource();
      src.buffer = buf;
      src.connect(mix ? (buf === mix.mine ? mine! : base!) : master);
      src.start(when);
      sources.push(src);
      sectionDur = Math.max(sectionDur, buf.duration);
    }
    when += sectionDur; // 다음 섹션은 이 섹션이 끝난 뒤
  }

  const stop = () => {
    for (const src of sources) {
      try {
        src.stop();
      } catch {
        /* 이미 정지/종료된 소스 무시 */
      }
      src.disconnect();
    }
    base?.disconnect();
    mine?.disconnect();
    master.disconnect();
    limiter.disconnect();
  };
  if (!mix) return { stop };
  return {
    stop,
    setGains: (baseGain: number, mineGain: number) => {
      base!.gain.setTargetAtTime(baseGain, ctx.currentTime, 0.02);
      mine!.gain.setTargetAtTime(mineGain, ctx.currentTime, 0.02);
    },
  };
}

export interface MixOptions {
  /** "내 연주" 버스로 보낼 버퍼(나머지는 전부 "기존") */
  mine: AudioBuffer;
  baseGain: number;
  mineGain: number;
}

export interface MixHandle extends EnsembleHandle {
  /** 재생 중 두 버스 음량을 바로 바꾼다 */
  setGains: (baseGain: number, mineGain: number) => void;
}

/** 섹션 순차 재생의 총 길이(초). 진행/정지 타이머용. */
export function sequenceDuration(sections: AudioBuffer[][]): number {
  return sections.reduce((sum, sec) => sum + Math.max(0, ...sec.map((b) => b.duration)), 0);
}
