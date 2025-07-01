export function create<T extends keyof HTMLElementTagNameMap>(
  tagName: T,
): HTMLElementTagNameMap[T] {
  return document.createElement(tagName);
}

export function removeAllChildren(...nodes: Node[]) {
  for (const node of nodes) {
    node.textContent = '';
  }
}

export type RecursiveNode = Node | string | RecursiveNode[];

export function append<T extends Element>(
  parent: T,
  children: RecursiveNode[],
): T {
  let prevNode: Element;
  parent.append(
    ...children.map((node) => {
      if (node instanceof Element) prevNode = node;
      return Array.isArray(node) ? append(prevNode, node) : node;
    }),
  );
  return parent;
}

export function build<T extends Element>(
  parent: T,
  children: RecursiveNode[],
): T {
  removeAllChildren(parent);
  return append(parent, children);
}

/**
 * イベントハンドラーを安全に実行するためのラッパーを作成します。
 */
export function createSafeErrorHandler(
  errorCallback: (error: unknown) => void,
) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return <T extends any[]>(fn: (...args: T) => void | Promise<void>) =>
    (...args: T) => {
      try {
        const result = fn(...args);
        if (typeof result?.catch === 'function') result.catch(errorCallback);
      } catch (error) {
        errorCallback(error);
      }
    };
}

export function container<K extends keyof HTMLElementTagNameMap>(
  classList?: string | null,
  tagName?: K,
): HTMLElementTagNameMap[K];
export function container<T extends HTMLElement>(
  classList?: string | null,
  tagName?: T,
): T;
export function container(
  classList?: string | null,
  tagName?: keyof HTMLElementTagNameMap | HTMLElement,
): HTMLElement;
export function container(
  classList?: string | null,
  tagName: keyof HTMLElementTagNameMap | HTMLElement = 'div',
) {
  const element = typeof tagName === 'string' ? create(tagName) : tagName;
  if (classList) element.setAttribute('class', classList);
  return element;
}

export function text(
  value: string,
  classList?: string | null,
  tagName: keyof HTMLElementTagNameMap | HTMLElement = 'div',
) {
  const element = container(classList, tagName);
  element.textContent = value;
  return element;
}

export function h1(
  labelText: string,
  classList?: string,
  ref?: HTMLHeadingElement,
) {
  return text(labelText, classList, ref ?? 'h1') as HTMLHeadingElement;
}

export function h2(
  labelText: string,
  classList?: string,
  ref?: HTMLHeadingElement,
) {
  return text(labelText, classList, ref ?? 'h2') as HTMLHeadingElement;
}

export function h3(
  labelText: string,
  classList?: string,
  ref?: HTMLHeadingElement,
) {
  return text(labelText, classList, ref ?? 'h3') as HTMLHeadingElement;
}

export function p(
  labelText: string,
  classList?: string,
  ref?: HTMLParagraphElement,
) {
  return text(labelText, classList, ref ?? 'p') as HTMLParagraphElement;
}

function setAttrs(
  element: Element,
  attrs?: Record<
    string,
    // eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
    string | number | boolean | null | undefined | Function
  > | null,
) {
  if (!attrs) return;
  for (const [key, value] of Object.entries(attrs)) {
    const lowerCaseKey = key.toLowerCase();
    if (value instanceof Function) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
      (element as unknown as Record<string, Function>)[lowerCaseKey] = value;
    } else if (value != null) {
      element.setAttribute(lowerCaseKey, String(value));
    }
  }
}

export function form(
  props?: { onSubmit?: (event: SubmitEvent) => unknown } | null,
  classList?: string | null,
  ref?: HTMLFormElement,
) {
  const element = container(classList, ref ?? 'form') as HTMLFormElement;
  setAttrs(element, props);
  return element;
}

export function button(
  labelText: string,
  props?: {
    // ボタンの有効・無効は通常動的に切り替える。そのようなものはビルド時ではなく、リセット処理で行う
    //disabled: boolean,
    onClick?: (event: MouseEvent) => unknown;
  } | null,
  classList?: string | null,
  ref?: HTMLButtonElement,
) {
  const element = container(classList, ref ?? 'button') as HTMLButtonElement;
  setAttrs(element, { type: 'button', ...props });
  element.textContent = labelText;
  return element;
}

export function submit(labelText: string, ref?: HTMLButtonElement) {
  const element = container(null, ref ?? 'button') as HTMLButtonElement;
  setAttrs(element, { type: 'submit' });
  element.textContent = labelText;
  return element;
}

export interface InputProps {
  value?: string | number | boolean;
  placeholder?: string | number | boolean;
  onKeyDown?: (event: KeyboardEvent) => unknown;
  onInput?: (event: Event) => unknown;
  onChange?: (event: Event) => unknown;
}

export interface NumberInputProps extends InputProps {
  value?: string | number;
  min?: string | number;
  max?: string | number;
  step?: string | number;
}

export function input(
  name: string,
  type: string | null = 'text',
  props?: NumberInputProps | null,
  ref?: HTMLInputElement,
) {
  const element = container(null, ref ?? 'input') as HTMLInputElement;
  setAttrs(element, { name, type, ...props });
  return element;
}

export interface TextAreaProps extends InputProps {
  rows?: string | number;
}

export function textarea(
  name: string,
  props?: TextAreaProps | null,
  ref?: HTMLTextAreaElement,
) {
  const element = container(null, ref ?? 'textarea') as HTMLTextAreaElement;
  setAttrs(element, { name, ...props });
  return element;
}

let globalLabelIdCount = 0;
export function label(
  labelText: string,
  props?: { for?: string | Element } | null,
  classList?: string | null,
  ref?: HTMLLabelElement,
): HTMLLabelElement {
  const element = text(
    labelText,
    classList,
    ref ?? 'label',
  ) as HTMLLabelElement;
  const forElem = props?.for;
  if (typeof forElem === 'string') {
    element.setAttribute('for', forElem);
  } else if (forElem) {
    forElem.id ||= `el-global-label-id-${(globalLabelIdCount += 1)}`;
    element.setAttribute('for', forElem.id);
  }
  return element;
}

export function image(alt: string, ref?: HTMLImageElement) {
  const element = container(null, ref ?? 'img') as HTMLImageElement;
  element.alt = alt;
  return element;
}

export function createSwitcher() {
  let current: Node | undefined;
  return (newChild: Node) => {
    current?.parentNode?.replaceChild(newChild, current);
    current = newChild;
    return current;
  };
}

export function hide(...elements: Element[]) {
  for (const element of elements) {
    element.classList.add('hidden');
  }
}

export function show(...elements: Element[]) {
  for (const element of elements) {
    element.classList.remove('hidden');
  }
}
