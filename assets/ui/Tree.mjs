import TComponent from '../../TComponent/TComponent.mjs'
import seq from '../../seq/seq.mjs'
import style from '../style.mjs'
//import * as customEventPolyfill from 'custom-event-polyfill'

const CLASS_NAME = 't-component-ui-tree'

style(`
  .${CLASS_NAME} {
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
    min-width: max-content;
  }
  .${CLASS_NAME} li > div {
    white-space: nowrap;
    height: 24px;
    line-height: 0;
  }
  .${CLASS_NAME} li > div > * {
    vertical-align: middle;
  }
  .${CLASS_NAME} li > div:first-child::before {
    content: "";
    display: inline-block;
    height: 100%;
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
    color: #666;
    opacity: 0;
    transition: opacity .5s;
  }
  .${CLASS_NAME}:focus .expand-icon,
  .${CLASS_NAME}:hover .expand-icon {
    opacity: 1;
  }
  .${CLASS_NAME} .expand-icon:hover {
    color: #3CF;
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
        <div id="_container">
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
  }

  set text (v) {
    this._text.textContent = v
  }

  get text () {
    return this._text.textContent
  }

  set html (v) {
    this._text.innerHTML = v
  }

  get html () {
    return this._text.innerHTML
  }

  set icon (v) {
    this._icon.textContent = v
  }

  get icon () {
    return this._icon.textContent
  }

  set iconColor (v) {
    this._icon.style.color = v
  }

  get iconColor () {
    return this._icon.style.color
  }

  appendChild (item) {
    this.insertBefore(item, null)
  }

  insertBefore (item, ref = null) {
    if (!(item instanceof TreeItem)) throw new Error()
    this._list.insertBefore(item._item, ref ? ref._item : null)
    const indent = this._getIndent()
    if (indent >= 0) item._setIndent(indent + 1)
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
    this._item.classList.add('expanded')
  }

  async collapse () {
    this._expandIcon.textContent = 'chevron_right'
    this._list.style.display = 'none'
    this._item.classList.remove('expanded')
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

  _getIndent () {
    const paddingLeft = this._container.style.paddingLeft
    if (paddingLeft === '') return -1
    return paddingLeft.slice(0, -2) >> 0
  }

  [Symbol.iterator]() {
    return seq(this._list.childNodes).map(elem => TComponent.from(elem))[Symbol.iterator]()
  }
}

export default class Tree extends TComponent {
  template () {
    return `
      <div id="_tree" tabindex="0"
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

    // this.current = this.first
    this.current = null
    this.onexpand = null

    for (const [key, value] of Object.entries(attr)) {
      if (typeof value === 'string') {
        this._tree.setAttribute(key, value)
      } else if (key.slice(0, 2) === 'on' && key !== 'onexpand') {
        this._tree[key] = value
      } else {
        this[key] = value
      }
    }

    this._tree.classList.add(CLASS_NAME)
  }

  set textContent (value) {
    if (value !== '') throw new Error('Only empty string can be set.')
    this._list.textContent = ''
  }

  get textContent () {
    return this.element.textContent
  }

  appendChild (item) {
    this.insertBefore(item, null)
  }

  insertBefore (item, ref = null) {
    if (!(item instanceof TreeItem)) throw new Error()
    this._list.insertBefore(item._item, ref ? ref._item : null)
    item._setIndent(0)
  }

  set current (item) {
    if (!(item instanceof TreeItem) && item != null) throw new Error()
    if (this._lastCurrent === item) return
    if (this._lastCurrent != null) this._lastCurrent._item.classList.remove('current')
    this._lastCurrent = item
    if (item) {
      item._item.classList.add('current')
      item._container.scrollIntoView({ block: 'nearest', inline: 'nearest' })
    }
    this._list.dispatchEvent(new CustomEvent('change', { detail: item }))
  }

  get current () {
    if (this._lastCurrent == null || !this._lastCurrent._item.classList.contains('current')) {
      this._lastCurrent = TComponent.from(this._tree.querySelector('.current'))
    }
    return this._lastCurrent
  }

  // get first () {
  //   return this._tree.firstChild && this._tree.firstChild.firstChild
  // }

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
      case 8: // Back Space
        {
          event.preventDefault()
          if (this.current.parentNode !== this) {
            this.current = this.current.parentNode
          }
        }
        break
      case 37: // Left
        {
          event.preventDefault()
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
          event.preventDefault()
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
          event.preventDefault()
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
          event.preventDefault()
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

  [Symbol.iterator]() {
    return seq(this._list.childNodes).map(elem => TComponent.from(elem))[Symbol.iterator]()
  }
}
Tree.Item = TreeItem
