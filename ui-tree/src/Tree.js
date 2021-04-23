import TComponent from '@haiix/TComponent'
import seq from '@haiix/seq'
import style from '../../assets/style.mjs'
import * as customEventPolyfill from 'custom-event-polyfill'

const CLASS_NAME = 't-component-ui-tree'

style(`
  .${CLASS_NAME} {
    line-height: 24px;
    cursor: default;
    outline: none;
    overflow: auto;
    background: #FFF;
    color: #000;
    user-select: none;
  }
  .${CLASS_NAME} ul {
    margin: 0;
    padding: 0;
    list-style-type: none;
  }
  .${CLASS_NAME} li > div > * {
    vertical-align: middle;
  }
  .${CLASS_NAME} li > div:hover {
    background: #DEF;
  }
  .${CLASS_NAME} li.current > div {
    background: #DDD;
  }
  .${CLASS_NAME}:focus li.current > div {
    background: #BDF;
  }
  .${CLASS_NAME} .expand-icon {
    display: inline-block;
    margin-right: 4px;
    font-size: 20px;
    color: transparent;
    transition: color .5s;
  }
  .${CLASS_NAME}:focus .expand-icon,
  .${CLASS_NAME}:hover .expand-icon {
    color: #666;
  }
  .${CLASS_NAME} .icon {
    display: inline-block;
    margin-right: 4px;
    font-size: 18px;
  }
`)

class TreeItem extends TComponent {
  template () {
    return `
      <li id="_item">
        <div id="_container" style="padding-left: 0em;">
          <i id="_expandIcon" class="material-icons expand-icon">chevron_right</i>
          <i id="_icon" class="material-icons icon" style="color: #FC9;">folder</i>
          <span id="_text"></span>
        </div>
        <ul id="_list" style="display: none;"></ul>
      </li>
    `
  }

  constructor (attr, nodes) {
    super()
    this.key = ''
  }

  set text (v) {
    this._text.textContent = v
  }

  get text () {
    return this._text.textContent
  }

  set icon (v) {
    this._icon.textContent = v
  }

  set iconColor (v) {
    this._icon.style.color = v
  }

  appendChild (item) {
    if (!(item instanceof TreeItem)) throw new Error()
    this._list.appendChild(item._item)
  }

  get parentNode () {
    return TComponent.from(this._item.parentNode.parentNode)
  }

  getRootNode () {
    let curr = this
    while (curr instanceof TreeItem) {
      curr = curr.parentNode
    }
    return curr instanceof Tree ? curr : null
  }

  async expand () {
    const root = this.getRootNode()
    if (root.onexpand) {
      this._expandIcon.textContent = 'autorenew'
      const event = new CustomEvent('expand', { detail: this })
      await root.onexpand(event)
    }
    this._expandIcon.textContent = 'expand_more'
    this._list.style.display = ''
  }

  async collapse () {
    this._expandIcon.textContent = 'chevron_right'
    this._list.style.display = 'none'
    const tree = this.getRootNode()
    if (tree.current && this._item.contains(tree.current._item)) {
      tree.current = this
    }
  }

  get isExpanded () {
    return this._list.style.display !== 'none'
  }

  set isExpandable (b) {
    if (b) {
      this._expandIcon.textContent = 'chevron_right'
    } else {
      this._expandIcon.textContent = '_'
      this._list.style.display = 'none'
    }
  }

  get isExpandable () {
    return this._expandIcon.textContent !== '_'
  }

  _setIndent (v) {
    this._container.style.paddingLeft = v + 'em'
    for (const item of seq(this._list.childNodes).map(elem => TComponent.from(elem))) {
      item._setIndent(v + 1)
    }
  }

  //_getIndent () {
  //  return this._container.style.paddingLeft.slice(0, -2) >> 0
  //}
}

export default class Tree extends TComponent {
  template () {
    return `
      <div id="_tree" tabindex="0" class="${CLASS_NAME}"
        onmousedown="this._handleTreeMousedown(event)"
        onmousemove="event.preventDefault()"
        onkeydown="this._handleTreeKeydown(event)"
      >
        <ul id="_list"></ul>
      </div>
    `
  }

  constructor (attr, nodes) {
    super()

    //this.current = this.first
    this.current = null
    this.onchange = null
    this.onexpand = null

    for (const [key, value] of Object.entries(attr)) {
      if (typeof value === 'string') {
        this._tree.setAttribute(key, value)
      } else {
        this[key] = value
      }
    }
  }

  appendChild (item) {
    if (!(item instanceof TreeItem)) throw new Error()
    this._list.appendChild(item._item)
    item._setIndent(0)
  }

  set current (item) {
    if (!(item instanceof TreeItem) && item != null) throw new Error()
    if (this._lastCurrent === item) return
    if (this._lastCurrent != null) this._lastCurrent._item.classList.remove('current')
    this._lastCurrent = item
    if (item) item._item.classList.add('current')
    if (this.onchange) this.onchange(new CustomEvent('change', { detail: item }))
  }

  get current () {
    if (this._lastCurrent == null || !this._lastCurrent._item.classList.contains('current')) {
      this._lastCurrent = TComponent.from(this._tree.querySelector('.current'))
    }
    return this._lastCurrent
  }

  //get first () {
  //  return this._tree.firstChild && this._tree.firstChild.firstChild
  //}

  focus () {
    this._tree.focus()
  }

  async _handleTreeMousedown (event) {
    let elem = event.target
    while (elem.tagName !== 'LI') {
      if (elem === this._tree) return
      elem = elem.parentNode
    }
    const item = TComponent.from(elem)

    if (event.target === item._expandIcon && item.isExpandable) {
      const ul = item._list
      if (item.isExpanded) {
        await item.collapse()
      } else {
        await item.expand()
      }
    } else {
      this.current = item
    }
  }

  async _handleTreeKeydown (event) {
    if (!this.current) return
    switch (event.keyCode) {
      case 8:  // Back Space
      {
        if (this.current.parentNode !== this) {
          this.current = this.current.parentNode
        }
      }
      break
      case 37: // Left
      {
        if (this.current.isExpanded) {
          await this.current.collapse()
        } else {
          if (this.current.parentNode !== this) {
            this.current = this.current.parentNode
          }
        }
      }
      break
      case 38: // Up
      {
        if (this.current._item.previousSibling) {
          let item = TComponent.from(this.current._item.previousSibling)
          while (item.isExpanded && item._list.lastChild) {
            item = TComponent.from(item._list.lastChild)
          }
          this.current = item
        } else {
          if (this.current.parentNode !== this) {
            this.current = this.current.parentNode
          }
        }
      }
      break
      case 39: // Right
      {
        if (this.current.isExpandable && !this.current.isExpanded) {
          await this.current.expand()
        } else {
          if (this.current._list.firstChild) {
            this.current = TComponent.from(this.current._list.firstChild)
          }
        }
      }
      break
      case 40: // Down
      {
        if (this.current.isExpanded && this.current._list.firstChild) {
          this.current = TComponent.from(this.current._list.firstChild)
        } else {
          let item = this.current
          while (item !== this && !item._item.nextSibling) {
            item = item.parentNode
          }
          if (item !== this) {
            this.current = TComponent.from(item._item.nextSibling)
          }
        }
      }
      break
    }
  }
}
Tree.Item = TreeItem
