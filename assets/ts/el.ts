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
  errorCallback: (error: unknown) => unknown,
) {
  /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
  return <T extends any[]>(fn: (...args: T) => void | Promise<void>) =>
    (...args: T) => {
      try {
        const result = fn(...args);
        if (typeof result?.catch === 'function') result.catch(errorCallback);
      } catch (error) {
        errorCallback(error);
      }
    };
  /* eslint-enable-next-line @typescript-eslint/no-explicit-any */
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

/* eslint-disable @typescript-eslint/no-unsafe-function-type */
function setProperties(
  element: Element,
  props?: Record<
    string,
    string | number | boolean | null | undefined | Function
  > | null,
) {
  if (!props) return;
  for (const [key, value] of Object.entries(props)) {
    const lowerCaseKey = key.toLowerCase();
    if (value instanceof Function) {
      (element as unknown as Record<string, unknown>)[lowerCaseKey] = value;
    } else {
      (element as unknown as Record<string, unknown>)[key] = value;
    }
  }
}
/* eslint-enable @typescript-eslint/no-unsafe-function-type */

export function form(
  props?: {
    onChange?: (event: Event) => unknown;
    onSubmit?: (event: SubmitEvent) => unknown;
  } | null,
  classList?: string | null,
  ref?: HTMLFormElement,
) {
  const element = container(classList, ref ?? 'form') as HTMLFormElement;
  setProperties(element, props);
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
  setProperties(element, { type: 'button', ...props });
  element.textContent = labelText;
  return element;
}

export function submit(labelText: string, ref?: HTMLButtonElement) {
  const element = container(null, ref ?? 'button') as HTMLButtonElement;
  setProperties(element, { type: 'submit' });
  element.textContent = labelText;
  return element;
}

export interface InputProps {
  value?: string | number | boolean;
  placeholder?: string | number | boolean;
  spellcheck?: boolean;
  readOnly?: boolean;
  onKeyDown?: (event: KeyboardEvent) => unknown;
  onInput?: (event: Event) => unknown;
  onChange?: (event: Event) => unknown;
}

export interface TextInputProps extends InputProps {
  value?: string;
}

export interface NumberInputProps extends InputProps {
  value?: number;
  min?: number;
  max?: number;
  step?: number;
}

export interface CheckBoxProps extends InputProps {
  value?: boolean;
  checked?: boolean | null;
}

export function input(
  name: string,
  type: string | null = 'text',
  props?: InputProps | NumberInputProps | null,
  ref?: HTMLInputElement,
) {
  const element = container(null, ref ?? 'input') as HTMLInputElement;
  setProperties(element, { name, type, ...props });
  return element;
}

export function textInput(
  name: string,
  props?: TextInputProps | null,
  ref?: HTMLInputElement,
) {
  return input(name, 'text', props, ref);
}

export function numberInput(
  name: string,
  props?: NumberInputProps | null,
  ref?: HTMLInputElement,
) {
  return input(name, 'number', props, ref);
}

export function checkbox(
  name: string,
  props?: CheckBoxProps | null,
  ref?: HTMLInputElement,
) {
  return input(
    name,
    'checkbox',
    {
      checked: (props?.checked ?? props?.value ?? false) ? 'checked' : null,
      ...props,
    },
    ref,
  );
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
  setProperties(element, { name, ...props });
  return element;
}

export function label(
  labelText: string,
  target: HTMLElement,
  ref?: HTMLLabelElement,
) {
  const element = container(null, ref ?? 'label') as HTMLLabelElement;
  const span = text(labelText, null, 'span');
  if (
    target instanceof HTMLInputElement &&
    (target.type === 'checkbox' || target.type === 'radio')
  ) {
    element.append(target, span);
  } else {
    element.append(span, target);
  }
  return element;
}

export function image(alt: string, ref?: HTMLImageElement) {
  const element = container(null, ref ?? 'img') as HTMLImageElement;
  element.alt = alt;
  return element;
}

export function canvas(width: number, height: number) {
  const element = create('canvas');
  setProperties(element, { width, height });
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
