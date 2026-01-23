/**
 * キーと値のペアで構成される設定（.env形式や単純なプロパティファイルなど）を
 * 解析・管理するためのクラスです。
 */
export class KeyValueConfig {
  /**
   * 文字列形式の設定データを解析し、オブジェクトに変換します。
   * - 空行および `#` で始まる行は無視されます。
   * - 各行は `key=value` の形式である必要があります。
   * - キーと値の前後にある空白はトリミングされます。
   * @param source - 解析対象となる文字列ソース。
   * @returns 解析されたキーと値のペアを含むオブジェクト。
   */
  static parse(source: string): Record<string, string> {
    return source
      .split(/\r?\n/u)
      .reduce<Record<string, string>>((config, line) => {
        if (!line || line.startsWith('#')) return config;

        const index = line.indexOf('=');
        if (index === -1) return config;

        const key = line.slice(0, index).trim();
        const value = line.slice(index + 1).trim();

        config[key] = value;
        return config;
      }, {});
  }

  /**
   * 指定された URL から設定ファイルをフェッチし、解析してインスタンスを生成します。
   * @param url - 設定ファイルの取得先 URL。
   * @returns 設定内容を保持した `KeyValueConfig` インスタンス。
   * @throws ネットワークエラーやフェッチに失敗した場合にエラーが発生します。
   */
  static async load(url: string): Promise<KeyValueConfig> {
    const text = await (await fetch(url)).text();
    const config = KeyValueConfig.parse(text);
    return new KeyValueConfig(config);
  }

  /**
   * 内部で保持する設定データ（読み取り専用）。
   */
  private readonly config: Record<string, string>;

  /**
   * `KeyValueConfig` の新しいインスタンスを初期化します。
   * 渡された設定オブジェクトは凍結（shallow freeze）され、変更から保護されます。
   * @param config - キーと値のペアを含むオブジェクト。
   */
  constructor(config: Record<string, string>) {
    this.config = Object.freeze({ ...config });
  }

  /**
   * 指定されたキーが設定に含まれているかどうかを判定します。
   *
   * @param key - 確認したい設定のキー。
   * @returns キーが存在する場合は `true`、そうでない場合は `false`。
   */
  has(key: string): boolean {
    return Object.hasOwn(this.config, key);
  }

  /**
   * 指定されたキーに対応する値を取得します。
   * @param key - 取得したい設定のキー。
   * @param defaultValue - キーが存在しない場合に返されるデフォルト値（任意）。
   * @returns 対応する値、またはデフォルト値。
   * @throws キーが存在せず、かつ `defaultValue` も提供されていない場合にエラーをスローします。
   * @example
   * ```ts
   * const val = config.get('API_URL', 'http://localhost');
   * ```
   */
  get(key: string, defaultValue?: string): string {
    return (
      this.config[key] ??
      defaultValue ??
      (() => {
        throw new Error(`Missing config key: ${key}`);
      })()
    );
  }
}

export default KeyValueConfig;
