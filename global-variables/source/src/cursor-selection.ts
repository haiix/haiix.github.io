import * as util from './util';

/**
 * コンテナ内の全テキストノードを前順でたどる TreeWalker を返す
 */
function createTextWalker(container: Node): TreeWalker {
  return document.createTreeWalker(container, NodeFilter.SHOW_TEXT, {
    acceptNode(node: Node) {
      // 0長のテキストノードはスキップ（復元の安定性向上）
      return node.nodeValue && node.nodeValue.length > 0
        ? NodeFilter.FILTER_ACCEPT
        : NodeFilter.FILTER_REJECT;
    },
  });
}

/**
 * コンテナ内総文字数
 */
function getTextLength(container: Node): number {
  const walker = createTextWalker(container);
  let acc = 0;
  while (walker.nextNode()) {
    acc += (walker.currentNode as Text).nodeValue!.length;
  }
  return acc;
}

function lastTextNode(container: Node): Text | null {
  const walker = createTextWalker(container);
  let last: Text | null = null;
  while (walker.nextNode()) {
    last = walker.currentNode as Text;
  }
  return last;
}

/**
 * 累積 offset からテキストノードとそのノード内オフセットを見つける
 * 例: offset=15 → 先頭から15文字目が含まれるテキストノードを返す
 */
function locate(
  container: Node,
  absoluteOffset: number,
): { node: Text; offset: number } | null {
  const walker = createTextWalker(container);
  let acc = 0;

  while (walker.nextNode()) {
    const node = walker.currentNode as Text;
    const len = node.nodeValue!.length;

    if (absoluteOffset <= acc + len) {
      return { node, offset: absoluteOffset - acc };
    }
    acc += len;
  }

  // 末尾（キャレットが末尾）のとき
  const tail = lastTextNode(container);
  if (tail) return { node: tail, offset: tail.nodeValue!.length };

  return null;
}

function getRange(container: HTMLElement) {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) return null;

  const range = sel.getRangeAt(0);

  // 選択範囲がコンテナ外なら無効
  if (
    !container.contains(range.startContainer) ||
    !container.contains(range.endContainer)
  ) {
    return null;
  }

  return range;
}

/**
 * 選択範囲を「コンテナ先頭からの文字オフセット」で保存
 */
export function saveSelection(container: HTMLElement) {
  const range = getRange(container);
  if (!range) return null;

  const walker = createTextWalker(container);

  let start = -1;
  let end = -1;
  let acc = 0; // 累積文字数

  // テキストノードを順に見ながら start/end の絶対オフセットを求める
  while (walker.nextNode()) {
    const node = walker.currentNode as Text;
    const len = node.nodeValue!.length;

    if (node === range.startContainer) {
      start = acc + range.startOffset;
    }
    if (node === range.endContainer) {
      end = acc + range.endOffset;
    }

    acc += len;
  }

  // start/end がテキストノード以外（例: 要素ノード）を指していた場合のフォールバック
  if (start < 0 || end < 0) {
    const tmp = range.cloneRange();
    const pre = document.createRange();
    pre.selectNodeContents(container);
    pre.setEnd(tmp.startContainer, tmp.startOffset);
    start = pre.toString().length;

    const pre2 = document.createRange();
    pre2.selectNodeContents(container);
    pre2.setEnd(tmp.endContainer, tmp.endOffset);
    end = pre2.toString().length;
  }

  // 正規化
  if (start > end) [start, end] = [end, start];

  return { start, end, isCollapsed: start === end };
}

/**
 * 保存したオフセットから選択範囲を復元
 */
export function restoreSelection(
  container: HTMLElement,
  saved: { start: number; end: number },
) {
  let { start, end } = saved;

  const totalLen = getTextLength(container);
  start = util.clamp(start, 0, totalLen);
  end = util.clamp(end, 0, totalLen);

  const startPos = locate(container, start);
  const endPos = locate(container, end);

  if (!startPos || !endPos) return false;

  const range = document.createRange();
  range.setStart(startPos.node, startPos.offset);
  range.setEnd(endPos.node, endPos.offset);

  const sel = window.getSelection();
  if (!sel) return false;
  sel.removeAllRanges();
  sel.addRange(range);
  return true;
}
