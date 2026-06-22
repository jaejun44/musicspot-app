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
export async function loadTracks(urls: string[], ctx: AudioContext): Promise<AudioBuffer[]> {
  const results = await Promise.all(
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
  return results.filter((b): b is AudioBuffer => b !== null);
}

export interface EnsembleHandle {
  /** 모든 소스를 즉시 정지하고 정리. */
  stop: () => void;
}

/**
 * 모든 버퍼를 같은 startTime(ctx 시간 기준)에 동시 재생.
 * @param startTime ctx.currentTime 기준 절대 시각. 과거면 즉시 재생.
 */
export function playEnsemble(buffers: AudioBuffer[], ctx: AudioContext, startTime: number): EnsembleHandle {
  const sources: AudioBufferSourceNode[] = [];
  const when = Math.max(startTime, ctx.currentTime);

  for (const buf of buffers) {
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.connect(ctx.destination);
    src.start(when);
    sources.push(src);
  }

  return {
    stop: () => {
      for (const src of sources) {
        try {
          src.stop();
        } catch {
          /* 이미 정지/종료된 소스 무시 */
        }
        src.disconnect();
      }
    },
  };
}
