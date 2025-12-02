/**
 * 渡されたオブジェクトがレコード型かどうかをチェックします。
 * @param obj チェックするオブジェクト
 * @returns オブジェクトがレコード型であればtrue、そうでなければfalse
 */
export function isRecord(obj: unknown): obj is Record<string, unknown> {
  return typeof obj === 'object' && obj !== null;
}

/**
 * targetにsourceのプロパティをマージする型厳密な関数。
 * 以下の条件を満たさない場合、コンパイルエラーを発生させます。
 * 1. sourceのプロパティがtargetに存在すること。
 * 2. sourceのプロパティの型が、targetの対応するプロパティの型と互換性があること。
 *
 * @param target マージ先のオブジェクト
 * @param source マージ元のオブジェクト
 * @returns マージされたオブジェクト
 */
export function typedAssign<
  T extends object,
  U extends { [P in keyof U]: P extends keyof T ? T[P] : never },
>(target: T, source: U): T {
  return Object.assign(target, source);
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
 * @param headers リクエストヘッダー
 * @param signal アボートシグナル
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
 * @param headers リクエストヘッダー
 * @param signal アボートシグナル
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
    typeof source === 'string' ? encoder.encode(source) : source;
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

type RandomSelectionItem = [number, ...unknown[]];

/**
 * 重み付きランダム選択
 */
export function weightedRandomSelection<T extends RandomSelectionItem>(
  list: T[],
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

/**
 * HTMLエスケープして安全にする
 * @param  html  エスケープ対象の文字列
 * @returns  エスケープ後の文字列
 */
export function escapeHTML(html: string) {
  const div = document.createElement('div');
  div.textContent = html;
  return div.innerHTML;
}

/**
 * 値を指定範囲[min, max]に収める
 * @param value 対象となる数値
 * @param min 最小値
 * @param max 最大値
 * @returns 範囲内に収めた値
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(min, value), max);
}

/**
 * 文字列中に含まれる部分文字列の出現回数を数える
 *
 * @param  str  対象の文字列
 * @param  subStr  探す部分文字列
 * @param  allowOverlap  重なりをカウントするか（trueで重なりを含める）
 * @returns  出現回数
 */
export function countOccurrences(
  str: string,
  subStr: string,
  allowOverlap = false,
) {
  if (subStr === '') return 0;

  const step = allowOverlap ? 1 : subStr.length;
  let count = 0;
  let pos = 0;

  while ((pos = str.indexOf(subStr, pos)) >= 0) {
    count += 1;
    pos += step;
  }

  return count;
}
