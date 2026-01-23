/* eslint-disable no-bitwise, no-plusplus, @typescript-eslint/no-non-null-assertion */
const etbl = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'
  .split('')
  .map((char) => char.charCodeAt(0));
const dtbl = Array.from({ length: 256 }, (__, index) =>
  Math.max(0, etbl.indexOf(index)),
);

/**
 * Base64 encode the array buffer.
 *
 * @params buf - The array buffer to encode.
 * @return The encoded string.
 */
export function encode(buf: ArrayBuffer, addNewlines = true): string {
  const src = new Uint8Array(buf);
  let len = Math.ceil(src.length / 3) * 4;
  if (addNewlines) len += Math.floor(Math.max(0, len - 1) / 76) * 2;
  const dst = new Uint8Array(len);
  for (let si = 0, di = 0, col = 0; si < src.length; col++) {
    if (addNewlines && col === 19) {
      dst[di++] = 13;
      dst[di++] = 10;
      col = 0;
    }
    const chunk = (src[si++]! << 16) | (src[si++]! << 8) | (src[si++]! << 0);
    dst[di++] = etbl[(chunk >>> 18) & 63]!;
    dst[di++] = etbl[(chunk >>> 12) & 63]!;
    dst[di++] = etbl[(chunk >>> 6) & 63]!;
    dst[di++] = etbl[(chunk >>> 0) & 63]!;
  }
  const rem = src.length % 3;
  if (rem === 1) dst[dst.length - 2] = 61;
  if (rem !== 0) dst[dst.length - 1] = 61;
  return new TextDecoder().decode(dst);
}

/**
 * Decode Base64 and returns the array buffer.
 *
 * @params b64 - The base64 string to decode.
 * @return The decoded buffer.
 */
export function decode(b64: string): ArrayBuffer {
  const src = new TextEncoder().encode(b64);
  const dst = new Uint8Array(Math.ceil((src.length / 4) * 3));
  let di = 0;
  for (let si = 0; si < src.length; ) {
    if (src[si] === 13) si++;
    if (src[si] === 10) si++;
    const chunk =
      (dtbl[src[si++]!]! << 18) |
      (dtbl[src[si++]!]! << 12) |
      (dtbl[src[si++]!]! << 6) |
      (dtbl[src[si++]!]! << 0);
    dst[di++] = (chunk >>> 16) & 255;
    dst[di++] = (chunk >>> 8) & 255;
    dst[di++] = (chunk >>> 0) & 255;
  }
  for (let pos = src.length - 1; src[pos] === 61; pos--) di--;
  return dst.buffer.slice(0, di);
}
