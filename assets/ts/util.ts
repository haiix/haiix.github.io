import * as el from './assets/el';

/**
 * 渡されたオブジェクトがレコード型かどうかをチェックします。
 * @param obj チェックするオブジェクト
 * @returns オブジェクトがレコード型であればtrue、そうでなければfalse
 */
export function isRecord(obj: unknown): obj is Record<string, unknown> {
  return typeof obj === 'object' && obj !== null && !Array.isArray(obj);
}

/**
 * 配列からnullとundefinedを除去します。
 * @param array nullまたはundefinedが含まれる配列
 * @returns nullとundefinedを取り除いた配列
 */
export function filterNotNull<T>(
  array: readonly (T | null | undefined)[],
): T[] {
  return array.filter((value): value is T => value != null);
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
 * オブジェクトの各プロパティを `await` し、解決済みの値を同じキー構造で返します。
 * 各プロパティの値が Promise の場合は解決され、Promise でない場合はそのまま返されます。
 *
 * @param obj - 各プロパティを `await` する対象のオブジェクト
 * @returns 各プロパティが `Awaited<T[K]>` に変換されたオブジェクトを返す Promise
 */
/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-return */
export async function resolveAll<T extends Record<string, any>>(
  obj: T,
): Promise<{ [K in keyof T]: Awaited<T[K]> }> {
  const entries = Object.entries(obj);

  const resolvedEntries = await Promise.all(
    entries.map(async ([key, value]) => [key, await value] as const),
  );

  return Object.fromEntries(resolvedEntries) as any;
}
/* eslint-enable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-return */

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
export function escapeHTML(str: string): string {
  return str
    .replace(/&/gu, '&amp;')
    .replace(/</gu, '&lt;')
    .replace(/>/gu, '&gt;')
    .replace(/"/gu, '&quot;')
    .replace(/'/gu, '&#39;');
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

/**
 * content-editable作成
 * @param className 追加するCSSクラス名
 * @returns
 */
export function createContentEditable(className?: string): HTMLElement {
  const element = el.container(
    `content-editable${className ? ` ${className}` : ''}`,
  );
  element.contentEditable = 'plaintext-only';
  element.spellcheck = false;
  return element;
}

/**
 * 画像をキャンバスに変換
 * @params image 元画像
 * @return 作成したキャンバス
 */
export function imageToCanvas(image: HTMLImageElement): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = image.naturalWidth;
  canvas.height = image.naturalWidth;
  const ctx =
    canvas.getContext('2d') ??
    (() => {
      throw new Error('Failed to get 2d context');
    })();
  ctx.drawImage(image, 0, 0);
  return canvas;
}

/**
 * 画像をオフスクリーンキャンバスに変換
 * @params image 元画像
 * @params width リサイズ幅
 * @params height リサイズ高
 * @return 作成したオフスクリーンキャンバス
 */
export function imageToOffscreenCanvas(
  image: HTMLImageElement,
  width = image.width,
  height = image.height,
): OffscreenCanvas {
  const canvas = new OffscreenCanvas(width, height);
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Failed to get 2d context');
  }
  ctx.drawImage(image, 0, 0, width, height);
  return canvas;
}

/**
 * キャンバスをBlobに変換
 * @params image 元キャンバス
 * @return 作成したBlob
 */
export function canvasToBlob(
  canvas: HTMLCanvasElement,
  type?: string,
  quality?: number,
): Promise<Blob> {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error('Failed to create blob'));
        }
      },
      type,
      quality,
    );
  });
}

/**
 * Blob から Object URL を生成し、指定された AbortSignal が中断された時点で
 * 自動的に `URL.revokeObjectURL` により解放します。
 *
 * @param blob - Object URL を生成する元の Blob。
 * @param cleanupSignal - このシグナルが `abort` されたタイミングで、
 * 生成した Object URL が自動的に破棄されます。
 *
 * @returns 生成された Object URL。
 * すでに `cleanupSignal` が `aborted` 状態の場合は空文字列を返します。
 */
export function createObjectURL(
  blob: Blob,
  cleanupSignal: AbortSignal,
): string {
  if (cleanupSignal.aborted) {
    return '';
  }

  const url = URL.createObjectURL(blob);

  const handleAbort = () => {
    URL.revokeObjectURL(url);
  };

  cleanupSignal.addEventListener('abort', handleAbort, { once: true });

  return url;
}

/**
 * 指定のディレクトリー内のファイルまたはディレクトリーの一覧を取得する
 * @param dir 対象ディレクトリ
 * @param kind 'file' または 'directory'。省略時は両方
 * @returns ファイル一覧
 */
export async function getFileList(
  dir: FileSystemDirectoryHandle,
  kind?: 'file',
): Promise<{ name: string; handle: FileSystemFileHandle }[]>;
export async function getFileList(
  dir: FileSystemDirectoryHandle,
  kind?: 'directory',
): Promise<{ name: string; handle: FileSystemDirectoryHandle }[]>;
export async function getFileList(
  dir: FileSystemDirectoryHandle,
  kind?: FileSystemHandleKind,
): Promise<{ name: string; handle: FileSystemHandle }[]> {
  const list = [];
  for await (const [name, handle] of dir.entries()) {
    if (!kind || handle.kind === kind) {
      list.push({ name, handle });
    }
  }
  return list.sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * ファイルが存在するかどうかを判定する
 * @param dir 対象ディレクトリ
 * @param fileName ファイル名
 * @returns 存在する場合はtrue
 */
export async function existsFile(
  dir: FileSystemDirectoryHandle,
  fileName: string,
): Promise<boolean> {
  try {
    await dir.getFileHandle(fileName);
    return true;
  } catch {
    return false;
  }
}

/**
 * ファイルを読み込む
 * @param dir 対象ディレクトリ
 * @param fileName ファイル名
 * @returns 読み込んだファイルオブジェクト
 */
export async function loadFile(
  dir: FileSystemDirectoryHandle,
  fileName: string,
): Promise<File> {
  const fileHandle = await dir.getFileHandle(fileName);
  const file = await fileHandle.getFile();
  return file;
}

/**
 * ファイルが存在する場合は読み込む。存在しない場合はnullを返す
 * @param dir 対象ディレクトリ
 * @param fileName ファイル名
 * @returns 読み込んだファイルオブジェクトまたはnull
 */
export async function loadFileIfExists(
  dir: FileSystemDirectoryHandle,
  fileName: string,
): Promise<File | null> {
  try {
    const fileHandle = await dir.getFileHandle(fileName);
    const file = await fileHandle.getFile();
    return file;
  } catch {
    return null;
  }
}

/**
 * ファイル保存
 * @params dir 保存先
 * @params fileName ファイル名
 * @params data 保存対象
 */
export async function saveFile(
  dir: FileSystemDirectoryHandle,
  fileName: string,
  data: FileSystemWriteChunkType,
): Promise<void> {
  const fileHandle = await dir.getFileHandle(fileName, { create: true });
  const stream = await fileHandle.createWritable();
  await stream.write(data);
  await stream.close();
}

/**
 * 配列の要素をランダムな順序に並び替えます（Fisher–Yates シャッフル）。
 * この関数は **元の配列を直接変更（破壊的）** します。
 * 乱数には `Math.random()` を使用するため、暗号学的に安全な用途には適しません。
 *
 * @typeParam T - 配列要素の型
 * @param array - シャッフル対象の配列（この配列自体が並び替えられます）
 * @returns シャッフル後の配列（`array` と同一インスタンス）
 */
export function shuffle<T>(array: T[]): T[] {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j]!, array[i]!];
  }
  return array;
}

export function pickRandom<T>(array: T[]): T | undefined {
  if (array.length === 0) return undefined;
  return array[Math.floor(Math.random() * array.length)];
}

/**
 * 背景色の輝度に基づいて、最適なコントラストの文字色を返す
 * 計算式: 0.299*R + 0.587*G + 0.114*B (CCIR601)
 */
export function getContrastColor(hexColor: string): '#000000' | '#ffffff' {
  // 1. HEXから各色成分（0-255）を取得
  const r = parseInt(hexColor.slice(1, 3), 16);
  const g = parseInt(hexColor.slice(3, 5), 16);
  const b = parseInt(hexColor.slice(5, 7), 16);

  // 2. 輝度の計算
  // 人間が明るく感じる順に重み付け（G > R > B）
  const luminance = 0.299 * r + 0.587 * g + 0.114 * b;

  // 3. 輝度の中間値（128）をしきい値として判定
  // 128以上なら明るい背景（黒文字）、未満なら暗い背景（白文字）
  return luminance >= 128 ? '#000000' : '#ffffff';
}

export function uuidv7(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  const ts = BigInt(Date.now());

  bytes[0] = Number((ts >> 40n) & 0xffn);
  bytes[1] = Number((ts >> 32n) & 0xffn);
  bytes[2] = Number((ts >> 24n) & 0xffn);
  bytes[3] = Number((ts >> 16n) & 0xffn);
  bytes[4] = Number((ts >> 8n) & 0xffn);
  bytes[5] = Number(ts & 0xffn);

  bytes[6] = (bytes[6]! & 0x0f) | 0x70; // version
  bytes[8] = (bytes[8]! & 0x3f) | 0x80; // variant

  return [...bytes]
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
    .replace(/^(.{8})(.{4})(.{4})(.{4})(.{12})$/u, '$1-$2-$3-$4-$5');
}
