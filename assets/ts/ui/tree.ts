import {
  TAttributes,
  TComponent,
  mergeAttrsWithoutStyles,
  mergeStyles,
} from 'tcomponent';
import List from './list';
import style from '../style';

style(`
.t-tree {
  display: inline-block;
  overflow: auto;
  user-select: none;
  cursor: default;
  color: #000;
  background-color: #fff;
}

.t-tree ul {
  list-style: none;
  margin: 0;
  box-sizing: border-box;
  padding-left: 1em;
  width: max-content;
  min-width: 100%;
}

.t-tree details > summary {
  list-style: none;
  margin-left: -100em;
  padding-left: 99em;
  display: flex;
  align-items: stretch;
}

.t-tree details > summary:hover {
  background-color: #def;
}

.t-tree details > summary.selected {
  background-color: #ccc;
}

.t-tree:focus details > summary.selected,
.t-tree details > summary.selected:hover {
  background-color: #bdf;
}

.t-tree details > summary > a {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2em;
}

.t-tree details > summary > a::after {
  content: '';
  width: 0.5em;
  height: 0.5em;
  box-sizing: border-box;
  transform: rotate(-45deg) translate(-0.0625em, -0.0625em);
}

.t-tree details[open] > summary > a::after {
  transform: rotate(45deg) translate(-0.0625em, -0.0625em);
}

.t-tree details > summary > a:hover::after,
.t-tree details[open] > summary > a::after {
  border-right: 0.125em solid #333;
  border-bottom: 0.125em solid #333;
}

.t-tree details > summary > a::after,
.t-tree details[open] > summary > a:hover::after {
  border-right: 0.125em solid #999;
  border-bottom: 0.125em solid #999;
}

.t-tree details[data-isexpandable="false"] > summary > a::after {
  opacity: 0;
}
`);

class TreeBase extends List {
  get children(): TreeItem[] {
    const items: TreeItem[] = [];
    for (const elem of this.ul.children) {
      const item = TreeItem.from(elem);
      if (item) items.push(item);
    }
    return items;
  }
}

export class TreeItem extends TreeBase {
  static template = `
    <li>
      <details id="details" onclick="event.preventDefault()">
        <summary tabindex="-1">
          <a onmousedown="this.handleControl(event)"></a>
          <div id="summaryContent"></div>
        </summary>
        <ul id="ul">
        </ul>
      </details>
    </li>
  `;

  private details = this.id('details', HTMLDetailsElement);
  private summaryContent = this.id('summaryContent', HTMLElement);

  constructor(attrs?: TAttributes, nodes?: Node[], parent?: TComponent) {
    const summary = nodes?.[0] ?? '';
    super({}, nodes?.slice(1), parent);
    if (summary) {
      this.summaryContent.append(summary);
    }
    if (attrs) {
      if ('isExpandable' in attrs) {
        attrs['data-isexpandable'] = attrs.isExpandable;
        delete attrs.isExpandable;
      }
      mergeStyles(this.element, attrs);
      mergeAttrsWithoutStyles(this.details, attrs, parent);
    }
  }

  get isExpandable() {
    return this.details.dataset.isexpandable !== 'false';
  }

  set isExpandable(value: boolean) {
    this.details.dataset.isexpandable = value ? '' : 'false';
  }

  get isExpaned() {
    return this.details.open;
  }

  set isExpaned(value: boolean) {
    this.details.open = value;
  }

  get summary(): HTMLElement {
    return this.summaryContent;
  }

  set summary(element: HTMLElement) {
    this.summaryContent = element;
  }

  protected handleControl(event: MouseEvent): void {
    if (event.button !== 0) return;
    this.isExpaned = !this.isExpaned;
  }
}

export class Tree extends TreeBase {
  static template = `
    <div class="t-tree"
      tabindex="0"
      onmousedown="this.handleMouseDown(event)"
      onclick="this.handleClick(event)"
      onkeydown="this.handleKeyDown(event)"
    >
      <ul id="ul"></ul>
    </div>
  `;

  private selected: HTMLElement | null = null;

  handleMouseDown(event: MouseEvent) {
    event.preventDefault();
    this.element.focus();
  }

  handleClick(event: MouseEvent) {
    const target = event.target;
    const item = TreeItem.fromEventTarget(target);
    if (
      event.button !== 0 ||
      !item ||
      (target instanceof HTMLAnchorElement && item.isExpandable)
    ) {
      return;
    }

    this.selected?.classList.remove('selected');
    this.selected = item.summary.parentElement;
    this.selected?.classList.add('selected');
  }

  handleKeyDown(event: KeyboardEvent) {
    event.preventDefault();
    const selectedSummary = this.selected;
    const selectedDetails = selectedSummary?.parentElement;
    if (
      !(selectedSummary instanceof HTMLElement) ||
      !(selectedDetails instanceof HTMLDetailsElement)
    )
      return;
    const nextLi = Tree.getNextLiFromKey(selectedDetails, event.key);
    if (nextLi instanceof HTMLLIElement) {
      const nextSummary = nextLi.querySelector(':scope > details > summary');
      if (nextSummary instanceof HTMLElement) {
        this.selected = nextSummary;
        selectedSummary.classList.remove('selected');
        nextSummary.classList.add('selected');
      }
    }
  }

  private static getNextLiFromKey(
    selectedDetails: HTMLDetailsElement,
    key: string,
  ): Element | null {
    const parentLi =
      selectedDetails.parentElement?.parentElement?.parentElement
        ?.parentElement;
    let nextLi: Element | null | undefined;
    let li: Element | null | undefined;
    switch (key) {
      case 'ArrowUp':
        nextLi = parentLi;
        li = selectedDetails.parentElement?.previousElementSibling;
        while (li instanceof HTMLLIElement) {
          nextLi = li;
          li = nextLi.querySelector(
            ':scope > details[open] > ul > li:last-of-type',
          );
        }
        break;
      case 'ArrowDown':
        nextLi = selectedDetails.querySelector(
          ':scope[open] > ul > li:first-of-type',
        );
        li = selectedDetails.parentElement;
        while (!nextLi && li instanceof HTMLLIElement) {
          nextLi = li.nextElementSibling;
          li = li.parentElement?.parentElement?.parentElement;
        }
        break;
      case 'ArrowLeft':
        if (!selectedDetails.open) {
          nextLi = parentLi;
        }
        selectedDetails.open = false;
        break;
      case 'ArrowRight':
        nextLi = selectedDetails.querySelector(
          ':scope[open] > ul > li:first-of-type',
        );
        selectedDetails.open = true;
        break;
      case 'Backspace':
        nextLi = parentLi;
        break;
      // no default
    }
    return nextLi ?? null;
  }
}

export default Tree;
