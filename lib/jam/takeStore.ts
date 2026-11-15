/**
 * 로그인하러 갔다 오는 동안 백킹 잼 테이크를 브라우저(IndexedDB)에만 잠시 보관한다.
 * 서버로 보내지 않는다. 올리기 성공 때와 24시간이 지나면 지운다. 저장소가 막히면 조용히 실패(로그만)하고 화면은 계속 동작.
 */

const DB_NAME = 'ms_jam_take';
const STORE = 'take';
const KEY = 'pending';
export const TAKE_TTL_MS = 24 * 60 * 60 * 1000;

export interface PendingTake {
  slug: string;
  progId: string;
  bpm: number;
  mutes: number;
  offsetMs: number;
  gain: number;
  /** 반주 음량 배수(0~2). 이 필드가 생기기 전 보관분은 없음 → 1 */
  backingGain?: number;
  instrument: string;
  sampleRate: number;
  /** 가공 전 모노 샘플(싱크·음량을 돌아와서 다시 조절할 수 있게) */
  samples: Float32Array;
  savedAt: number;
}

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function run<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await open();
  try {
    return await new Promise<T>((resolve, reject) => {
      const req = fn(db.transaction(STORE, mode).objectStore(STORE));
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  } finally {
    db.close();
  }
}

export async function savePendingTake(take: PendingTake): Promise<boolean> {
  try {
    await run('readwrite', (s) => s.put(take, KEY));
    return true;
  } catch (e) {
    console.warn('[jam] 테이크 임시 보관 실패', e);
    return false;
  }
}

/** 24시간이 지났으면 지우고 null */
export async function loadPendingTake(now = Date.now()): Promise<PendingTake | null> {
  try {
    const take = (await run('readonly', (s) => s.get(KEY))) as PendingTake | undefined;
    if (!take) return null;
    if (now - take.savedAt > TAKE_TTL_MS) {
      await clearPendingTake();
      return null;
    }
    return take;
  } catch (e) {
    console.warn('[jam] 테이크 임시 보관 읽기 실패', e);
    return null;
  }
}

export async function clearPendingTake(): Promise<void> {
  try {
    await run('readwrite', (s) => s.delete(KEY));
  } catch (e) {
    console.warn('[jam] 테이크 임시 보관 삭제 실패', e);
  }
}
