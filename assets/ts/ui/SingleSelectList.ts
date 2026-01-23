/**
 * 指定された親要素の直下にある子要素を、ターゲット要素から遡って検索します。
 * イベント委譲（Event Delegation）などで、クリックされた深い階層の要素から
 * リストアイテムとなる親の直下要素を特定する場合などに使用します。
 *
 * @param parent - コンテナとなる親HTMLElement。
 * @param target - 検索の起点となるHTMLElement（またはnull）。
 * @returns 親要素の直下にある子要素。ターゲットが親要素外にある場合や見つからない場合は `null` を返します。
 */
export function findDirectChild(
  parent: HTMLElement,
  target: Element | null,
): HTMLElement | null {
  if (!target || !parent.contains(target)) {
    return null;
  }

  let curr: Element | null = target;
  while (curr && curr.parentElement !== parent) {
    curr = curr.parentElement;
  }

  if (curr instanceof HTMLElement) {
    return curr;
  }
  return null;
}

/**
 * SingleSelectListのコンストラクタオプション
 */
export interface SingleSelectListOptions {
  /**
   * 選択状態を表すCSSクラス名。
   * 省略時は `'selected'` が使用されます。
   */
  selectedClassName?: string;

  /**
   * アクセシビリティのためのrole属性を自動設定するかどうか。
   * 省略時は `true` が使用されます。
   */
  setAriaRoles?: boolean;
}

/**
 * 子要素の中から1つだけを選択可能なリストを管理するクラス。
 * コンテナ要素に対するマウス操作を監視し、
 * 選択状態のクラスの切り替えや、変更通知のコールバックを提供します。
 *
 * @template T - コンテナとなる親要素の型 (HTMLElementのサブクラス)
 * @template U - リストアイテムとなる子要素の型 (HTMLElementのサブクラス)
 */
export class SingleSelectList<T extends HTMLElement, U extends HTMLElement> {
  /** リストのコンテナとなる親要素 */
  readonly element: T;

  /** 選択されたアイテムに付与されるCSSクラス名 */
  readonly selectedClassName: string;

  /** アクセシビリティのためのrole属性を自動設定するかどうか */
  readonly setAriaRoles: boolean;

  /**
   * クリックイベントによってアイテムが選択された際に呼び出されるコールバック関数。
   * コールバック内で選択状態を変更する必要があります。
   *
   * @param newItem - 新しく選択されたアイテム（またはnull）
   * @param oldItem - 直前に選択されていたアイテム（またはnull）
   */
  onChangeItem: (newItem: U | null, oldItem: U | null) => unknown = (item) => {
    this.selected = item;
  };

  /** 内部で保持する現在選択されているアイテム */
  #selected: U | null = null;

  /**
   * インスタンスを生成し、イベントリスナーを設定します。
   *
   * @param parent - リストの親となるコンテナ要素
   * @param options - オプション設定オブジェクト（省略可）
   */
  constructor(parent: T, options?: SingleSelectListOptions) {
    this.element = parent;
    this.selectedClassName = options?.selectedClassName ?? 'selected';
    this.setAriaRoles = options?.setAriaRoles ?? true;

    if (this.setAriaRoles) {
      this.element.setAttribute('role', 'listbox');
    }

    this.element.addEventListener('click', this.handleClick);
  }

  /**
   * 設定されたイベントリスナーを削除し、リソースを解放します。
   * コンポーネントの破棄時に呼び出してください。
   */
  destroy() {
    this.element.removeEventListener('click', this.handleClick);
  }

  /**
   * 現在選択されているアイテムを取得します。
   */
  get selected(): U | null {
    return this.#selected;
  }

  /**
   * 選択するアイテムを設定します。
   *
   * @param item - 選択するアイテム、または選択解除の場合は `null`
   * @throws {Error} 指定されたアイテムがこのコンポーネントの直接の子要素でない場合にエラーをスローします。
   */
  set selected(item: U | null) {
    if (item && item.parentElement !== this.element) {
      throw new Error('The item is not a child element of this component.');
    }
    if (this.#selected === item) return;

    const oldItem = this.#selected;
    if (oldItem) {
      oldItem.classList.remove(this.selectedClassName);
      oldItem.removeAttribute('aria-selected');
    }
    if (item) {
      item.classList.add(this.selectedClassName);
      item.setAttribute('aria-selected', 'true');
    }

    this.#selected = item;
  }

  /**
   * 新しいアイテムを親要素（DOM）に追加します。
   *
   * @param item - 追加するアイテム要素
   * @returns 追加されたアイテム要素
   */
  addItem(item: U): U {
    if (this.setAriaRoles) {
      item.setAttribute('role', 'option');
    }
    this.element.appendChild(item);
    return item;
  }

  /**
   * クリックイベントを処理し、変更があれば `onChangeItem` を発火します。
   *
   * @param event - マウスイベント
   */
  private handleClick = (event: MouseEvent): void => {
    if (event.target === this.element || !(event.target instanceof Element)) {
      return;
    }

    const targetItem = findDirectChild(this.element, event.target);
    this.onChangeItem(targetItem as U | null, this.selected);
  };
}

export default SingleSelectList;
