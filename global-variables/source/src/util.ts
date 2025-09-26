import * as el from './assets/el';

export function escapeHTML(html: string) {
  const div = el.container();
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
