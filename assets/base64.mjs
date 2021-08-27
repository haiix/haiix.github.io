const etbl = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'.split('').map(c => c.charCodeAt(0))
const dtbl = Array(256).fill(0).map((v, i) => Math.max(0, etbl.indexOf(i)))

/**
 * Base64 encode the array buffer.
 *
 * @param {ArrayBuffer} buf - The array buffer to encode.
 * @return {string} The encoded string.
 */
export function encode (buf) {
  const src = new Uint8Array(buf)
  const dst = new Uint8Array(Math.ceil(src.length / 3) * 4)
  for (let i = 0, j = 0; i < src.length; ) {
    const t = src[i++] << 16 | src[i++] << 8 | src[i++] << 0
    dst[j++] = etbl[(t >>> 18) & 63]
    dst[j++] = etbl[(t >>> 12) & 63]
    dst[j++] = etbl[(t >>> 6) & 63]
    dst[j++] = etbl[(t >>> 0) & 63]
  }
  const m = src.length % 3, p = dst.length
  if (m === 1) dst[p - 2] = 61
  if (m >= 1) dst[p - 1] = 61
  return new TextDecoder().decode(dst)
}

/**
 * Decode Base64 and returns the array buffer.
 *
 * @param {string} b64 - The base64 string to decode.
 * @return {ArrayBuffer} The decoded buffer.
 */
export function decode (b64) {
  const src = new TextEncoder().encode(b64)
  let l = Math.floor(src.length / 4 * 3)
  for (let p = src.length - 1; src[p] === 61; p--) l--
  const dst = new Uint8Array(l)
  for (let i = 0, j = 0; i < src.length; ) {
    const t = dtbl[src[i++]] << 18 | dtbl[src[i++]] << 12 | dtbl[src[i++]] << 6 | dtbl[src[i++]] << 0
    dst[j++] = (t >>> 16) & 255
    dst[j++] = (t >>> 8) & 255
    dst[j++] = (t >>> 0) & 255
  }
  return dst.buffer
}
