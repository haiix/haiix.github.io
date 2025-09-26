import * as util from './util';

export interface LineMeta {
  offset: number;
  length: number;
}

export interface LineColumn {
  line: number;
  column: number;
}

/**
 * 行ごとの開始位置と長さを計算
 * @param lines 複数行テキストの行ごとの配列
 * @returns 計算したデータ
 */
function calculateLineOffsets(lines: string[]): LineMeta[] {
  const result: LineMeta[] = [];
  let offset = 0;
  for (const line of lines) {
    result.push({ offset, length: line.length });
    offset += line.length + 1; // 改行込み
  }
  return result;
}

/**
 * 文字列とその中での位置を相互に変換するクラス
 * 行の開始位置と長さを事前に計算しておくことで、変換処理を効率化します。
 */
export class PositionConverter {
  private lineMeta: LineMeta[];
  private totalLines: number;

  /**
   * コンストラクター
   * @param text 対象の複数行文字列
   */
  constructor(text: string) {
    const lines = text.split('\n');
    this.lineMeta = calculateLineOffsets(lines);
    this.totalLines = lines.length;
  }

  /**
   * 二分探索で行を特定
   * @param index 絶対位置(index)
   * @returns 行・列番号
   */
  private binarySearch(index: number): LineColumn {
    let low = 0;
    let high = this.totalLines - 1;
    while (low <= high) {
      const mid = Math.floor((low + high) / 2);
      const { offset, length } = this.lineMeta[mid]!;
      if (offset <= index && index < offset + length) {
        return { line: mid + 1, column: index - offset };
      }
      if (index < offset) {
        high = mid - 1;
      } else {
        low = mid + 1;
      }
    }
    // フェールセーフ
    const last = this.lineMeta[this.totalLines - 1]!;
    return { line: this.totalLines, column: last.length };
  }

  /**
   * 0ベースの絶対位置(index)を、1ベースの行・0ベースの列に変換します。
   * @param index コード全体の先頭からの0ベースの文字位置
   * @returns 変換後の { line, column } オブジェクト
   */
  toLineColumn(index: number): LineColumn {
    const last = this.lineMeta[this.totalLines - 1]!;
    const safeIndex = util.clamp(index, 0, last.offset + last.length);
    return this.binarySearch(safeIndex);
  }

  /**
   * 1ベースの行・0ベースの列を、0ベースの絶対位置(index)に変換します。
   * @param location { line, column } オブジェクト
   * @returns 変換後の0ベースの絶対位置
   */
  toIndex({ line, column }: LineColumn): number {
    const lineIndex = util.clamp(line - 1, 0, this.totalLines - 1);
    const { offset, length } = this.lineMeta[lineIndex]!;
    const safeColumn = util.clamp(column, 0, length);
    return offset + safeColumn;
  }
}

export default PositionConverter;
