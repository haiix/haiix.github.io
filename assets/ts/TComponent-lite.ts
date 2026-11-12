export type ConstructorOf<T> = new (...args: any[]) => T;

type PromiseTry = <T, A extends unknown[]>(
  cb: (...args: A) => T | PromiseLike<T>,
  ...args: A
) => Promise<T>;

/**
 * Promise.tryのPonyfill
 */
const promiseTry: PromiseTry =
  (Promise as unknown as { try?: PromiseTry }).try?.bind(Promise) ??
  ((cb, ...args) => new Promise((resolve) => resolve(cb(...args))));

const idPrefix = Math.random().toString(36).slice(2, 10).padEnd(8, '0');
let idCounter = 0;

/**
 * 同一画面内でほぼ確実に重複しないDOM用のIDを生成する
 * 同一バンドル内ではカウンタにより重複しない。
 * 複数バンドルが同居する場合のみ、ランダムなプレフィックスにより衝突確率を下げている。
 * 用途: <label for="...">、aria-labelledby、aria-describedby などの紐付け
 */
const generateDOMId = () => `u-${idPrefix}-${idCounter++}`;

export interface IdBinding {
  index: number;
  id: string;
  referenced: boolean;
}
export interface AttrBinding {
  index: number;
  name: string;
  namespace: string | null;
  parts: string[];
}
export interface EventBinding {
  index: number;
  type: string;
  handler: string;
}

export interface ParsedTemplate {
  rootElement: Element;
  idBindings: IdBinding[];
  attrBindings: AttrBinding[];
  eventBindings: EventBinding[];
}

const ID_REF_ATTRIBUTES = new Set([
  'for',
  'aria-labelledby',
  'aria-describedby',
  'aria-controls',
  'aria-owns',
  'aria-activedescendant',
  'aria-details',
  'aria-errormessage',
  'aria-flowto',
  'list',
  'form',
  'headers',
  'popovertarget',
  'commandfor',
  'itemref',
]);

const EVENT_ATTR_REGEX = /^on[a-z]+$/;
const WHITESPACE_REGEX = /\s+/;

const templateCache = new WeakMap<typeof TComponent, ParsedTemplate>();

/**
 * テンプレートのキャッシュを生成・取得する
 */
function getTemplate(ComponentClass: typeof TComponent): ParsedTemplate {
  const cached = templateCache.get(ComponentClass);
  if (cached) {
    return cached;
  }

  const rootElement = createAndValidateRootElement(ComponentClass);
  const elements = [rootElement, ...rootElement.querySelectorAll('*')];

  const { idBindings, bindingById } = extractIdBindings(
    elements,
    ComponentClass.name,
  );
  const { attrBindings, eventBindings } = extractAttrAndEventBindings(
    elements,
    bindingById,
  );

  const parsedTemplate: ParsedTemplate = {
    rootElement,
    idBindings,
    attrBindings,
    eventBindings,
  };

  templateCache.set(ComponentClass, parsedTemplate);
  return parsedTemplate;
}

/**
 * テンプレートを生成し、ルート要素が1つであるかを検証する
 */
function createAndValidateRootElement(
  ComponentClass: typeof TComponent,
): Element {
  const template = document.createElement('template');
  template.innerHTML = ComponentClass.template;

  if (template.content.childElementCount !== 1) {
    throw new Error(
      `${ComponentClass.name}: template must have exactly one root element`,
    );
  }

  return template.content.firstElementChild!;
}

/**
 * IDバインディングを抽出し、重複チェックや要素からの属性削除を行う
 */
function extractIdBindings(elements: Element[], componentName: string) {
  const bindingById = new Map<string, IdBinding>();

  for (const [index, element] of elements.entries()) {
    const id = element.getAttribute('id');
    if (!id) continue;

    if (bindingById.has(id)) {
      throw new Error(`${componentName}: duplicate id "${id}" in template`);
    }

    bindingById.set(id, { index, id, referenced: false });
    element.removeAttribute('id');
  }

  return { idBindings: [...bindingById.values()], bindingById };
}

/**
 * 属性参照およびイベントハンドラバインディングを抽出する
 */
function extractAttrAndEventBindings(
  elements: Element[],
  bindingById: Map<string, IdBinding>,
) {
  const attrBindings: AttrBinding[] = [];
  const eventBindings: EventBinding[] = [];

  for (const [index, element] of elements.entries()) {
    for (const { name, value, namespaceURI } of [...element.attributes]) {
      // ID参照の処理
      if (ID_REF_ATTRIBUTES.has(name)) {
        const parts = value.trim().split(WHITESPACE_REGEX);

        let hasReferencedId = false;
        for (const part of parts) {
          const binding = bindingById.get(part);
          if (binding) {
            binding.referenced = true;
            hasReferencedId = true;
          }
        }

        if (hasReferencedId) {
          attrBindings.push({ index, name, namespace: namespaceURI, parts });
          element.removeAttribute(name);
        }
      }

      // イベントバインディングの処理
      if (EVENT_ATTR_REGEX.test(name)) {
        eventBindings.push({
          index,
          type: name.slice(2),
          handler: value.trim(),
        });
        element.removeAttribute(name);
      }
    }
  }

  return { attrBindings, eventBindings };
}

/**
 * コンポーネントインスタンスの初期化とDOMツリーの構築を行う
 */
function initializeComponentInstance(
  instance: TComponent<any, any>,
  template: ParsedTemplate,
  componentName: string,
): Element {
  const rootElement = document.importNode(template.rootElement, true);
  const elements = [rootElement, ...rootElement.querySelectorAll('*')];

  const uidById = applyIdBindings(
    template.idBindings,
    elements,
    instance,
    componentName,
  );
  applyAttrBindings(template.attrBindings, elements, uidById);
  applyEventBindings(template.eventBindings, elements, instance, componentName);

  return rootElement;
}

/**
 * IDバインディングを適用する
 */
function applyIdBindings(
  idBindings: IdBinding[],
  elements: Element[],
  instance: TComponent,
  componentName: string,
) {
  const uidById = new Map<string, string>();

  for (const { index, id, referenced } of idBindings) {
    if (id in instance) {
      throw new Error(
        `${componentName}: template id "${id}" conflicts with an instance property`,
      );
    }

    const element = elements[index]!;

    // declare忘れによる undefined での暗黙の上書きを、TypeError にして早期検出する
    Object.defineProperty(instance, id, {
      value: element,
      enumerable: true,
      writable: false,
      configurable: false,
    });

    if (referenced) {
      const uid = generateDOMId();
      element.setAttribute('id', uid);
      uidById.set(id, uid);
    }
  }

  return uidById;
}

/**
 * 属性バインディング（ID参照の書き換え）を適用する
 */
function applyAttrBindings(
  attrBindings: AttrBinding[],
  elements: Element[],
  uidById: Map<string, string>,
) {
  for (const { index, name, namespace, parts } of attrBindings) {
    const element = elements[index]!;

    const newValue = parts.map((part) => uidById.get(part) ?? part).join(' ');

    if (namespace) {
      element.setAttributeNS(namespace, name, newValue);
    } else {
      element.setAttribute(name, newValue);
    }
  }
}

/**
 * イベントバインディングを適用する
 */
function applyEventBindings(
  eventBindings: EventBinding[],
  elements: Element[],
  instance: TComponent,
  componentName: string,
) {
  for (const { index, type, handler } of eventBindings) {
    const element = elements[index]!;

    element.addEventListener(
      type,
      (event) => {
        promiseTry(() => {
          const fn = (instance as any)[handler];
          if (typeof fn !== 'function') {
            throw new Error(
              `${componentName}: handler "${handler}" is not a function`,
            );
          }
          return fn.call(instance, event);
        }).catch((error) => {
          instance.onerror(error);
        });
      },
      { signal: instance.signal },
    );
  }
}

const componentMap = new WeakMap<Element, TComponent>();

export type ConstructorArgs<Parent> = null extends Parent
  ? [params?: { parent?: Parent }]
  : [params: { parent: Parent }];

/**
 * 使い方の注意:
 * - テンプレートの id に対応するプロパティは、サブクラスで必ず `declare` を付けて宣言すること。
 *   `declare` なしのフィールド宣言（`private foo!: HTMLElement;` など）は、
 *   useDefineForClassFields が有効な場合、基底クラスのコンストラクタで代入した要素を
 *   undefined で上書きしてしまう。
 * - イベントハンドラは、プロトタイプ上のメソッドとして定義すること。
 */
export class TComponent<
  Parent extends TComponent | null = TComponent<any> | null,
  RootElement extends Element = HTMLElement,
> {
  static template = '<div></div>';

  static from<T extends TComponent<any, any>>(
    this: ConstructorOf<T>,
    target?: EventTarget | null,
  ): T | null {
    let element: Element | null =
      target instanceof Element
        ? target
        : target instanceof Node
          ? target.parentElement
          : null;
    for (; element; element = element.parentElement) {
      const component = componentMap.get(element);
      if (component instanceof this) {
        // 破棄済み（親の破棄による場合を含む）なら、外側の同種コンポーネントへ
        // 探索を続けず null を返す。DOMに残った要素のイベントが、
        // 別のインスタンスに誤って対応づけられるのを防ぐ。
        return component.destroyed ? null : component;
      }
    }
    return null;
  }

  parent: Parent;
  element: RootElement;

  #controller?: AbortController;
  #signal?: AbortSignal;
  #destroyed = false;

  constructor(...args: ConstructorArgs<Parent>) {
    const ComponentClass = this.constructor as typeof TComponent;
    const params = args[0] as { parent?: Parent } | undefined;

    this.parent = (params?.parent ?? null) as Parent;
    this.element = initializeComponentInstance(
      this,
      getTemplate(ComponentClass),
      ComponentClass.name,
    ) as RootElement;

    componentMap.set(this.element, this as any);
  }

  get signal(): AbortSignal {
    if (!this.#signal) {
      this.#controller = new AbortController();
      const parentSignal = this.parent?.signal;
      this.#signal = parentSignal
        ? AbortSignal.any([this.#controller.signal, parentSignal])
        : this.#controller.signal;
      if (this.#destroyed) this.#controller.abort();
    }
    return this.#signal!;
  }

  /**
   * 自身、または祖先のいずれかが破棄されていれば true。
   * signal.aborted と整合する。
   */
  get destroyed(): boolean {
    return this.#destroyed || (this.parent?.destroyed ?? false);
  }

  /**
   * コンポーネントを破棄します。
   *
   * 内部のsignalをabortし、ルート要素をDOMから取り除きます。
   * 破棄済みの場合は何もしません。
   *
   * このメソッドはオーバーライドしないでください。
   * クリーンアップ処理を登録するときは、signalにリスナーを追加してください。
   */
  destroy(): void {
    if (this.#destroyed) return;
    this.#destroyed = true;
    this.#controller?.abort();
    this.element.remove();
  }

  onerror(error: unknown): void {
    if (this.parent) {
      this.parent.onerror(error);
    } else {
      reportError(error);
    }
  }
}
