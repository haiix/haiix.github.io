/**
 * 疑似乱数を生成する関数の型定義。
 * 呼び出すたびに新しい乱数 (0から1未満の浮動小数点数) を返します。
 */
export type RandomGenerator = () => number;

/**
 * 文字列からSHA-256ハッシュのArrayBufferを非同期で生成します。
 * @param text ハッシュ化する文字列
 * @returns SHA-256ハッシュのArrayBuffer
 */
export async function getSha256Hash(text: string): Promise<ArrayBuffer> {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return hashBuffer;
}

/**
 * ArrayBufferから32ビットのシード値を生成します。
 * @param hashBuffer ハッシュ値のArrayBuffer
 * @returns 32ビット整数のシード値
 */
function createSeedFromHash(hashBuffer: ArrayBuffer): number {
  const view = new DataView(hashBuffer);
  // 先頭4バイトを符号なし32ビット整数としてビッグエンディアンで読み込む
  return view.getUint32(0);
}

/**
 * xorshiftアルゴリズムに基づく疑似乱数生成関数を作成して返します。
 * @param seed シード値となる32ビット整数
 * @returns 0から1未満の浮動小数点数を返す `RandomGenerator` 関数
 */
function createXorshiftGenerator(seed: number): RandomGenerator {
  let x = seed;

  /* eslint-disable no-bitwise */
  return (): number => {
    x ^= x << 13;
    x ^= x >> 17;
    x ^= x << 5;
    // 符号なし32ビット整数に変換し、最大値+1で割ることで[0, 1)の範囲の浮動小数点数にする
    return (x >>> 0) / 4294967296; // 2^32
  };
  /* eslint-enable no-bitwise */
}

/**
 * 入力文字列からSHA-256ハッシュをシードとした疑似乱数生成器を非同期で作成します。
 * @param text シードとなる文字列
 * @returns 疑似乱数を生成する `RandomGenerator` 関数を解決するPromise
 */
export async function createSeededRandomGenerator(
  text: string,
): Promise<RandomGenerator> {
  const hashBuffer = await getSha256Hash(text);
  const seed = createSeedFromHash(hashBuffer);
  const randomGenerator = createXorshiftGenerator(seed || 1);
  return randomGenerator;
}

/**
 * (ユーティリティ) ArrayBufferを16進数文字列に変換します。
 * @param buffer 変換するArrayBuffer
 * @returns 16進数文字列
 */
export function bufferToHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export default createSeededRandomGenerator;
