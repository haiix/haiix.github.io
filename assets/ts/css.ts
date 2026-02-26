/**
 * 動的に `<style>` 要素を生成・管理し、CSS文字列を逐次追加するクラス。
 *
 * - 追加されたCSSは `requestAnimationFrame` 単位でバッチ適用されます。
 * - `<style>` 要素は初回適用時に自動生成され、`document.head` に追加されます。
 * - サーバーサイド環境（`document` が存在しない場合）では何も行いません。
 */
export class Style {
  private queue: string[] = [];
  private rafId: number | null = null;
  private styleElement: HTMLStyleElement | null = null;

  /**
   * CSSテキストをキューに追加します。
   *
   * 追加されたCSSは即座にはDOMへ反映されず、次のアニメーションフレームでまとめて適用されます。
   * これにより、連続呼び出し時のDOM更新回数を最小化します。
   *
   * @param value 追加するCSS文字列
   *
   * @remarks
   * - このメソッドはCSS文字列の検証やサニタイズを行いません。
   * - ユーザー入力など信頼できない文字列を直接渡さないでください。
   */
  add(value: string): void {
    this.queue.push(value);
    if (this.rafId != null) return;
    this.rafId = requestAnimationFrame(() => {
      this.rafId = null;
      this.apply();
    });
  }

  /**
   * `<style>` 要素が存在しない場合に生成し、`document.head` に追加します。
   *
   * @internal
   */
  private ensureElement(): void {
    if (this.styleElement || typeof document === 'undefined') return;
    const style = document.createElement('style');
    document.head.appendChild(style);
    this.styleElement = style;
  }

  /**
   * キューに溜まったCSSを `<style>` 要素へ反映します。
   *
   * - キューが空の場合は何もしません。
   * - `<style>` 要素が未生成の場合は自動生成されます。
   *
   * @internal
   */
  private apply(): void {
    if (!this.queue.length) return;
    this.ensureElement();
    if (!this.styleElement) return;

    const chunk = `${this.queue.join('\n')}\n`;
    this.styleElement.textContent! += chunk;
    this.queue.length = 0;
  }

  /**
   * 管理している `<style>` 要素を削除し、内部状態を初期化します。
   *
   * - 予約されている `requestAnimationFrame` をキャンセルします。
   * - キューに残っているCSSは破棄されます。
   * - 既にDOMに挿入された `<style>` 要素は削除されます。
   */
  destroy(): void {
    if (this.rafId != null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    this.queue.length = 0;
    this.styleElement?.remove();
    this.styleElement = null;
  }
}

const instance = new Style();

/**
 * テンプレートリテラル形式でCSSを登録します。
 *
 * 指定されたCSS文字列は内部の `<style>` 要素に追記されます。
 *
 * @param template テンプレート文字列
 * @param substitutions テンプレート内の埋め込み値
 * @returns 登録されたCSS文字列（展開後）
 *
 * @example
 * ```ts
 * css`
 *   body {
 *     background: red;
 *   }
 * `;
 * ```
 */
export function css(
  template: TemplateStringsArray,
  ...substitutions: (string | number)[]
): string {
  const value = String.raw(template, ...substitutions);
  instance.add(value);
  return value;
}

/**
 * 生成済みの `<style>` 要素を破棄し、状態をリセットします。
 *
 * 通常はテスト時や、スタイルを完全に再構築したい場合に使用します。
 */
export function resetStyle(): void {
  instance.destroy();
}

export default css;
