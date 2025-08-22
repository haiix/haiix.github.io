/**
 * 渡されたオブジェクトがレコード型かどうかをチェックします。
 * @param obj チェックするオブジェクト
 * @returns オブジェクトがレコード型であればtrue、そうでなければfalse
 */
export function isRecord(obj: unknown): obj is Record<string, unknown> {
  return typeof obj === "object" && obj !== null;
}

/**
 * 指定された時間だけ非同期で待機します。
 *
 * @param delay 待機する時間（ミリ秒単位）
 * @returns 指定された時間が経過した後に解決されるPromise
 */
export function sleep(delay: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, delay);
  });
}

/**
 * 指定された URL から非同期で取得し、レスポンスをテキスト形式で返します。
 *
 * @param url 取得先の URL
 * @returns レスポンスの JSON データを解決する Promise
 */
export async function getText(url: string): Promise<string> {
  const res = await fetch(url);

  if (!res.ok) {
    throw new Error(`Request failed with status: ${res.status}`);
  }

  return await res.text();
}

/**
 * 指定された URL から非同期で取得し、レスポンスを JSON 形式で返します。
 *
 * @param url 取得先の URL
 * @returns レスポンスの JSON データを解決する Promise
 */
export async function getJSON(url: string): Promise<unknown> {
  const res = await fetch(url);

  if (!res.ok) {
    throw new Error(`Request failed with status: ${res.status}`);
  }

  return await res.json();
}

/**
 * JSON データを指定された URL に非同期で送信し、レスポンスを取得します。
 *
 * @param url 送信先の URL
 * @param data 送信する JSON データ
 * @returns レスポンス Promise
 */
export async function postJSONRaw(
  url: string,
  data: unknown = null,
  headers: Record<string, string> | null = {},
  signal?: AbortSignal,
): Promise<Response> {
  const res = await fetch(url, {
    method: 'POST',
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
    signal,
  });

  if (!res.ok) {
    throw new Error(`Request failed with status: ${res.status}`);
  }

  return res;
}

/**
 * JSON データを指定された URL に非同期で送信し、レスポンスを JSON 形式で取得します。
 *
 * @param url 送信先の URL
 * @param data 送信する JSON データ
 * @returns レスポンスの JSON データを解決する Promise
 */
export async function postJSON(
  url: string,
  data: unknown = null,
  headers: Record<string, string> | null = {},
  signal?: AbortSignal,
): Promise<unknown> {
  const res = await postJSONRaw(url, data, headers, signal);
  return await res.json();
}

/**
 * 決定論的乱数（FNV-1aを使用）
 * @param source - 元データ（文字列またはUint8Array）
 * @returns [0, 1) の範囲の浮動小数点数
 */
export function deterministicRandom(source: string | Uint8Array): number {
  const extraSalt = new Uint8Array([11, 195, 204, 207, 6, 176, 117, 216]);

  const encoder = new TextEncoder();
  const inputBytes =
    typeof source === "string" ? encoder.encode(source) : source;
  const bytes = new Uint8Array(inputBytes.length + extraSalt.length);
  bytes.set(inputBytes);
  bytes.set(extraSalt, inputBytes.length);

  const FNV_PRIME = 0x01000193;
  const FNV_OFFSET_BASIS = 0x811c9dc5;

  let hash = FNV_OFFSET_BASIS;
  for (const byte of bytes) {
    hash ^= byte;
    hash = Math.imul(hash, FNV_PRIME);
  }

  return (hash >>> 0) / 0x100000000;
}

/**
 * 決定論的乱数(整数値)
 */
export function deterministicRandomInt(
  source: string,
  range1: number,
  range2?: number,
) {
  const [min, max] = range2 == null ? [0, range1] : [range1, range2];
  return Math.floor(deterministicRandom(source) * (max - min) + min);
}

/**
 * Xorshift
 */
export function xorshift(seed: number) {
  let buf = seed || 0x3c6ef35f;
  return (): number => {
    buf ^= buf << 13;
    buf ^= buf >>> 17;
    buf ^= buf << 5;
    return (buf >>> 0) / 0x100000000;
  };
}

type RandomSelectionItem = [number, ...unknown[]];

/**
 * 重み付きランダム選択
 */
export function weightedRandomSelection<T>(
  list: (RandomSelectionItem & T)[],
  randomSource: string,
): T | undefined {
  const weightSum = list.reduce(
    (total, item) => total + Math.max(0, item[0]),
    0,
  );
  if (weightSum === 0) {
    return list[deterministicRandomInt(randomSource, list.length)];
  }

  let randomNum = deterministicRandom(randomSource) * weightSum;
  for (const item of list) {
    randomNum -= Math.max(0, item[0]);
    if (randomNum <= 0) {
      return item;
    }
  }

  return list[list.length - 1];
}
