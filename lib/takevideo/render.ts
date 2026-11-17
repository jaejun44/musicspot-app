/**
 * 테이크 영상 녹화 (브라우저 전용, 의존성 없음 — 2026-11-17 사용자 승인).
 * 미리 믹스한 버퍼 1개를 재생하면서 Canvas(drawFrame)를 captureStream으로 같이 MediaRecorder에 넣는다.
 * 실시간 녹화라 영상 길이만큼 걸린다. 화면이 가려지면(탭 전환·잠금) 프레임이 멈추므로 바로 취소한다.
 * 장면 시각은 오디오 시계(ctx.currentTime) 기준 → 코드 표시가 소리와 맞는다.
 * 만든 파일은 기기에만 있다(서버 업로드 없음). 끝·취소·오류 모두 오디오 노드·스트림·컨텍스트를 정리한다.
 */
import { drawFrame, VIDEO_H, VIDEO_W, type Levels, type TakeVideoLabels, type TakeVideoMeta } from './draw';

export type TakeVideoStage = 'support' | 'load' | 'mix' | 'record';
export type TakeVideoFailReason = 'cancel' | 'hidden' | 'error';

export class TakeVideoError extends Error {
  constructor(
    readonly stage: TakeVideoStage,
    readonly reason: TakeVideoFailReason,
    message: string,
  ) {
    super(message);
    this.name = 'TakeVideoError';
  }
}

export interface RecordOptions {
  /** 사용자가 누른 순간 만든·resume한 컨텍스트(아이폰은 터치 안에서 resume해야 소리가 난다). 끝나면 여기서 닫는다 */
  ctx: AudioContext;
  canvas: HTMLCanvasElement;
  mixed: AudioBuffer;
  meta: TakeVideoMeta;
  levels: Levels;
  labels: TakeVideoLabels;
  mimeType: string;
  signal: AbortSignal;
  /** 0~1 */
  onProgress?: (p: number) => void;
  /** 만드는 동안 스피커로도 들려줄지 */
  monitor?: boolean;
}

export interface RecordResult {
  blob: Blob;
  mimeType: string;
  seconds: number;
}

const FPS = 30;
/** 녹화를 켠 뒤 소리를 시작하기까지(녹화기 준비 시간). 이만큼 영상 앞에 첫 장면이 붙는다 */
const START_DELAY = 0.2;

/**
 * 영상 글꼴을 직접 등록한다. 사이트 CSS의 @import(globals.css)는 @tailwind 뒤에 있어 브라우저가 무시하고 있다(2026-11-17 확인 —
 * 운영 페이지에 등록된 글꼴 0개). 캔버스는 등록된 글꼴만 쓰므로 여기서 FontFace로 불러온다. 실패하면 기본 글꼴로 계속.
 * Pretendard 가변 글꼴 약 2MB(영상 만들 때만, 한 번 받으면 캐시) · Bungee 라틴 14KB.
 */
const FONT_FILES: { family: string; url: string; descriptors?: FontFaceDescriptors }[] = [
  { family: 'Bungee', url: 'https://fonts.gstatic.com/s/bungee/v17/N0bU2SZBIuF2PU_0DXR1C9zfmQ.woff2' },
  {
    family: 'Pretendard Variable',
    url: 'https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/packages/pretendard/dist/web/variable/woff2/PretendardVariable.woff2',
    descriptors: { weight: '45 920' },
  },
];
let fontsJob: Promise<void> | null = null;

export function loadVideoFonts(): Promise<void> {
  if (typeof document === 'undefined' || typeof FontFace === 'undefined') return Promise.resolve();
  if (!fontsJob) {
    fontsJob = Promise.all(
      FONT_FILES.map(async ({ family, url, descriptors }) => {
        if (document.fonts.check(`16px "${family}"`) && [...document.fonts].some((f) => f.family.replace(/"/g, '') === family)) return;
        try {
          const face = await new FontFace(family, `url(${url}) format('woff2')`, descriptors).load();
          document.fonts.add(face);
        } catch (e) {
          console.warn('[takevideo] 글꼴 불러오기 실패 — 기본 글꼴로 계속', family, e);
        }
      }),
    ).then(() => undefined);
  }
  return fontsJob;
}

export async function recordTakeVideo(o: RecordOptions): Promise<RecordResult> {
  const { ctx, canvas, mixed, meta, levels, labels, mimeType, signal } = o;
  canvas.width = VIDEO_W;
  canvas.height = VIDEO_H;
  const g = canvas.getContext('2d');
  if (!g) throw new TakeVideoError('record', 'error', '캔버스 2D를 쓸 수 없음');
  const total = meta.timeline.totalSec;

  let raf = 0;
  let src: AudioBufferSourceNode | null = null;
  let dest: MediaStreamAudioDestinationNode | null = null;
  let stream: MediaStream | null = null;
  let recorder: MediaRecorder | null = null;
  let onHidden: (() => void) | null = null;
  let onAbort: (() => void) | null = null;

  try {
    if (signal.aborted) throw new TakeVideoError('record', 'cancel', '취소됨');
    await loadVideoFonts();
    drawFrame(g, 0, meta, levels, labels);

    dest = ctx.createMediaStreamDestination();
    src = ctx.createBufferSource();
    src.buffer = mixed;
    src.connect(dest);
    if (o.monitor) src.connect(ctx.destination);

    const video = canvas.captureStream(FPS);
    stream = new MediaStream([...video.getVideoTracks(), ...dest.stream.getAudioTracks()]);
    const rec = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 8_000_000, audioBitsPerSecond: 160_000 });
    recorder = rec;
    const chunks: Blob[] = [];
    rec.ondataavailable = (e) => {
      if (e.data.size > 0) chunks.push(e.data);
    };

    const startAt = ctx.currentTime + START_DELAY;
    const finished = new Promise<void>((resolve, reject) => {
      const fail = (err: TakeVideoError) => {
        cancelAnimationFrame(raf);
        if (rec.state !== 'inactive') {
          rec.onstop = () => reject(err);
          rec.stop();
        } else reject(err);
      };
      rec.onerror = (e) => fail(new TakeVideoError('record', 'error', `MediaRecorder 오류: ${(e as unknown as { error?: Error }).error?.message ?? 'unknown'}`));
      onHidden = () => {
        if (document.visibilityState === 'hidden') fail(new TakeVideoError('record', 'hidden', '화면이 가려져 녹화를 멈춤'));
      };
      onAbort = () => fail(new TakeVideoError('record', 'cancel', '취소됨'));
      document.addEventListener('visibilitychange', onHidden);
      signal.addEventListener('abort', onAbort);

      const tick = () => {
        const t = ctx.currentTime - startAt;
        drawFrame(g, Math.max(0, Math.min(t, total)), meta, levels, labels);
        o.onProgress?.(Math.max(0, Math.min(1, t / total)));
        // 앞에 붙은 START_DELAY만큼 일찍 멈춰 파일 길이를 total(45초 이하)에 맞춘다 — 엔드 카드가 그만큼 짧아짐
        if (t >= total - START_DELAY) {
          rec.onstop = () => resolve();
          rec.stop();
          return;
        }
        raf = requestAnimationFrame(tick);
      };
      rec.start(1000);
      src!.start(startAt);
      raf = requestAnimationFrame(tick);
    });

    await finished;
    const type = rec.mimeType || mimeType;
    const blob = new Blob(chunks, { type: type.split(';')[0] });
    if (blob.size === 0) throw new TakeVideoError('record', 'error', '녹화 결과가 비어 있음');
    return { blob, mimeType: type, seconds: total };
  } catch (e) {
    if (e instanceof TakeVideoError) throw e;
    throw new TakeVideoError('record', 'error', e instanceof Error ? e.message : String(e));
  } finally {
    cancelAnimationFrame(raf);
    if (onHidden) document.removeEventListener('visibilitychange', onHidden);
    if (onAbort) signal.removeEventListener('abort', onAbort);
    if (recorder && recorder.state !== 'inactive') {
      try {
        recorder.stop();
      } catch {
        /* 이미 멈춤 */
      }
    }
    if (src) {
      try {
        src.stop();
      } catch {
        /* 시작 전이거나 이미 끝남 */
      }
      src.disconnect();
    }
    dest?.disconnect();
    stream?.getTracks().forEach((tr) => tr.stop());
    await ctx.close().catch((err) => console.warn('[takevideo] AudioContext 닫기 실패', err));
  }
}
