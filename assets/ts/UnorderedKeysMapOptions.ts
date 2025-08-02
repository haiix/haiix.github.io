/**
 * UnorderedKeysMapクラスのコンストラクタに渡すオプション。
 */
export interface UnorderedKeysMapOptions {
  /**
   * 空の配列 `[]` をキーとして許可するかどうか。
   *
   * `true`に設定すると、`map.set([], value)` のような操作が許可されます。
   * `false`（デフォルト）の場合、空配列をキーとして使用しようとするとエラーがスローされます。
   *
   * @default false
   */
  allowEmptyKey?: boolean;
}

/**
 * 順序のない複数の文字列をキーとして値を格納するMapライクなクラスです。
 *
 * キーとなる文字列の配列は、内部で重複削除・ソート・連結が行われ、
 * 一意な文字列キーに正規化されます。
 * これにより、`['a', 'b']` と `['b', 'a']` は同じキーとして扱われます。
 *
 * @template V - マップに格納される値の型。
 *
 * @example
 * ```typescript
 * const map = new UnorderedKeysMap<number>();
 *
 * map.set(['apple', 'red'], 120);
 * map.set(['banana', 'yellow'], 80);
 *
 * // 順序が違っても同じキーとして認識される
 * console.log(map.get(['red', 'apple'])); // 120
 *
 * // 存在しないキー
 * console.log(map.get(['grape'])); // undefined
 *
 * // hasメソッド
 * console.log(map.has(['yellow', 'banana'])); // true
 * ```
 */
export class UnorderedKeysMap<V> {
  /**
   * 内部的に使用するJavaScriptの標準Map。
   * キーは正規化された文字列、値はジェネリック型V。
   * @private
   */
  private readonly internalMap = new Map<string, V>();

  /**
   * 空キーを許可するかの設定。
   * @private
   */
  private readonly allowEmptyKey: boolean;

  /**
   * UnorderedKeysMapの新しいインスタンスを生成します。
   * @param options - マップの挙動をカスタマイズするオプション。
   */
  constructor(options: UnorderedKeysMapOptions = {}) {
    this.allowEmptyKey = options.allowEmptyKey === true;
  }

  /**
   * @internal
   * キーの配列を正規化された単一の文字列キーに変換します。
   * 処理: 重複削除 -> ソート -> 連結
   * @param keys - 変換するキーの配列。
   * @returns 正規化されたキー文字列。
   * @throws {Error} 空キーが許可されていない場合に空配列が渡された場合にエラーをスローします。
   */
  private createCanonicalKey(keys: string[]): string {
    if (!this.allowEmptyKey && keys.length === 0) {
      throw new Error(
        'Empty key is not allowed. To allow it, construct the map with { allowEmptyKey: true }.',
      );
    }

    // Setを使って重複を削除し、配列に戻す
    const uniqueKeys = Array.from(new Set(keys));
    // ソートする
    uniqueKeys.sort();
    // 衝突しにくいnull文字(\0)で連結する
    return uniqueKeys.join('\0');
  }

  /**
   * 指定されたキーの組み合わせに値を設定します。
   * @param keys - キーとなる文字列の配列。
   * @param value - 格納する値。
   * @returns メソッドチェーンを可能にするために、このインスタンス自身を返します。
   */
  set(keys: string[], value: V): this {
    const canonicalKey = this.createCanonicalKey(keys);
    this.internalMap.set(canonicalKey, value);
    return this;
  }

  /**
   * 指定されたキーの組み合わせに対応する値を取得します。
   * @param keys - 取得したい値に対応するキーの配列。
   * @returns キーに対応する値。存在しない場合は`undefined`を返します。
   */
  get(keys: string[]): V | undefined {
    const canonicalKey = this.createCanonicalKey(keys);
    return this.internalMap.get(canonicalKey);
  }

  /**
   * 指定されたキーの組み合わせがマップに存在するかどうかを確認します。
   * @param keys - 存在を確認したいキーの配列。
   * @returns キーが存在する場合は`true`、そうでない場合は`false`。
   */
  has(keys: string[]): boolean {
    const canonicalKey = this.createCanonicalKey(keys);
    return this.internalMap.has(canonicalKey);
  }

  /**
   * 指定されたキーの組み合わせを持つ要素をマップから削除します。
   * @param keys - 削除したいキーの配列。
   * @returns 要素が存在し、正常に削除された場合は`true`。それ以外は`false`。
   */
  delete(keys: string[]): boolean {
    const canonicalKey = this.createCanonicalKey(keys);
    return this.internalMap.delete(canonicalKey);
  }

  /**
   * マップからすべての要素を削除します。
   */
  clear(): void {
    this.internalMap.clear();
  }

  /**
   * マップ内の要素数を返します。
   */
  get size(): number {
    return this.internalMap.size;
  }
}

export default UnorderedKeysMap;
