import { TAttributes, TComponent } from '@haiix/tcomponent';

export class List extends TComponent {
  static template = '<ul id="ul"></ul>';

  protected ul = this.id('ul', HTMLUListElement);

  constructor(attrs?: TAttributes, nodes?: Node[], parent?: TComponent) {
    super(attrs, [], parent);
    if (nodes) {
      this.append(...nodes);
    }
  }

  append(...nodes: (Node | TComponent)[]): void {
    this.ul.append(
      ...nodes.map((node) => {
        let cnode = node;
        if (cnode instanceof TComponent) {
          cnode.parentComponent = this;
          cnode = cnode.element;
        }

        if (cnode instanceof HTMLLIElement) return cnode;
        const container = document.createElement('li');

        container.append(cnode);
        return container;
      }),
    );
  }

  insertBefore(node: Node | TComponent, child: Node | TComponent | null): void {
    let cnode = node;
    let cchild = child;
    if (cnode instanceof TComponent) {
      cnode.parentComponent = this;
      cnode = cnode.element;
    }
    if (cchild instanceof TComponent) {
      cchild = cchild.element;
    }
    this.element.insertBefore(cnode, cchild);
  }

  remove() {
    this.parentComponent = null;
    this.element.remove();
  }

  get children(): (TComponent | HTMLLIElement)[] {
    const items: (TComponent | HTMLLIElement)[] = [];
    for (const elem of this.ul.children) {
      if (elem instanceof HTMLLIElement) {
        const item = TComponent.from(elem);
        items.push(item ?? elem);
      }
    }
    return items;
  }

  static fromEventTarget<T extends typeof TComponent>(
    this: T,
    target: EventTarget | null,
  ): InstanceType<T> | null {
    if (!(target instanceof HTMLElement)) return null;
    for (
      let curr: HTMLElement | null = target;
      curr;
      curr = curr.parentElement
    ) {
      const item = this.from(curr);
      if (item) return item;
    }
    return null;
  }
}

export default List;
