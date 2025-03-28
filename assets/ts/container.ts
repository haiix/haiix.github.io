export interface ContainerLike {
  element: Element;
  parent?: ListContainer | null;
}

export function isContainerLike(node: unknown): node is ContainerLike {
  return (
    typeof node === 'object' &&
    node != null &&
    'element' in node &&
    node.element instanceof Element
  );
}

/* eslint-disable-next-line @typescript-eslint/no-unnecessary-type-parameters */
export function createElement<T extends keyof HTMLElementTagNameMap>(tagName: T): HTMLElementTagNameMap[T] {
  return document.createElement(tagName);
}

export class Container implements ContainerLike {
  readonly element: Element;
  parent: ListContainer<this> | null = null;

  constructor(element: keyof HTMLElementTagNameMap | Element = 'div') {
    this.element =
      typeof element === 'string' ? createElement(element) : element;
  }

  remove(): void {
    this.parent?.removeChild(this);
  }

  onerror(error: unknown): void {
    if (this.parent) {
      this.parent.onerror(error);
    } else {
      throw error;
    }
  }
}

const nodeMap = new WeakMap<Node, ContainerLike>();

export class ListContainer<
  T extends Node | ContainerLike = Node | ContainerLike,
> extends Container {
  get children(): readonly T[] {
    return [...this.element.children].map(
      (node) => (nodeMap.get(node) ?? node) as T,
    );
  }

  append(...nodes: T[]): void {
    this.element.append(
      ...nodes.map((node): Node => {
        if (!isContainerLike(node)) {
          return node;
        }
        nodeMap.set(node.element, node);
        node.parent = this;
        return node.element;
      }),
    );
  }

  insertBefore(node: T, child: T | null): void {
    let tmpNode: Node;
    if (isContainerLike(node)) {
      nodeMap.set(node.element, node);
      node.parent = this;
      tmpNode = node.element;
    } else {
      tmpNode = node;
    }
    const tmpChild: Node | null = isContainerLike(child)
      ? child.element
      : child;
    this.element.insertBefore(tmpNode, tmpChild);
  }

  removeChild(child: T): void {
    let childElement: Node;
    if (isContainerLike(child)) {
      child.parent = null;
      childElement = child.element;
    } else {
      childElement = child;
    }
    nodeMap.delete(childElement);
    this.element.removeChild(childElement);
  }
}

export class TextContainer extends Container {
  get value(): string {
    return this.element.textContent ?? '';
  }

  set value(text: string) {
    this.element.textContent = text;
  }
}

export const body = new ListContainer(document.body);
