import TComponent from '@haiix/TComponent'
import seq from '@haiix/seq'
import * as customEventPolyfill from 'custom-event-polyfill'
import style from '../../assets/style.mjs'

const UL_CLASS_NAME = 't-component-ui-ul'

style(`
  ul.${UL_CLASS_NAME} {
    margin: 0;
    padding: 0;
    list-style-type: none;
    user-select: none;
    cursor: default;
    width: 100%;
    height: 100%;
  }
  ul.${UL_CLASS_NAME}.vertical {
    display: inline-flex;
    flex-flow: column nowrap;
  }
  ul.${UL_CLASS_NAME}.horizontal {
    display: inline-flex;
    flex-flow: row nowrap;
  }
  ul.${UL_CLASS_NAME}.vertical > *, ul.${UL_CLASS_NAME}.horizontal > * {
    flex: 0 0 auto;
  }
  ul.${UL_CLASS_NAME}.vertical > .stretch, ul.${UL_CLASS_NAME}.horizontal > .stretch {
    flex: 1 1 auto;
  }
  ul.${UL_CLASS_NAME}.overlap > * {
    display: none;
    width: 100%;
    height: 100%;
  }
  ul.${UL_CLASS_NAME}.overlap > .current {
    display: inline-block;
  }
`)

export class TUl extends TComponent {
  template () {
    return '<ul></ul>'
  }
  constructor (attr = {}, nodes = []) {
    super()
    this.disabled = attr.disabled === 'disabled' || attr.disabled === true
    this._parentClass = attr['parent-class'] || ''
    for (const [key, value] of Object.entries(attr)) {
      if (key === 'disabled' || key === 'parent-class') continue
      if (typeof value === 'function') {
        this.element[key] = value
      } else {
        this.element.setAttribute(key, value)
      }
    }
    for (const node of nodes) {
      if (TComponent.from(node) instanceof TLi) {
        this.element.appendChild(node)
      } else {
        this.element.appendChild(new TLi({}, [node]).element)
      }
    }
    this._current = this.items.find(item => item.current)
    this.element.classList.add(UL_CLASS_NAME)
    this.element.addEventListener('mousedown', this._handleMouseDown.bind(this))
  }
  set items (items) {
    this.element.innerHTML = ''
    for (const item of items) {
      if (!(item instanceof TLi)) throw new Error('Invalid')
      this.element.appendChild(item.element)
    }
  }
  get items () {
    return seq(this.element.childNodes).map(node => TComponent.from(node))
  }
  set current (item) {
    if (item != null) {
      if (this.items.indexOf(item) < 0 || this.current === item) return
      item.current = true
    }
    if (this.current) this.current.current = false
    this._current = item
  }
  get current () {
    return this._current
  }
  set value (v) {
    this.current = this.items.find(item => item.value === v)
  }
  get value () {
    return this.current == null ? '' : this.current.value
  }
  set disabled (v) {
    if (v) {
      this.element.classList.add('disabled')
    } else {
      this.element.classList.remove('disabled')
    }
  }
  get disabled () {
    return this.element.classList.contains('disabled')
  }
  _handleMouseDown (event) {
    if (this.disabled || event.button !== 0) return
    const item = this.items.find(item => item.element.contains(event.target))
    if (!item) return
    event.stopPropagation()
    if (this.current === item || item.disabled) return
    this.current = item
    this.element.dispatchEvent(new CustomEvent('change', { detail: item }))
  }
}

export class TLi extends TComponent {
  template () {
    return '<li></li>'
  }
  constructor (attr = {}, nodes = []) {
    super()
    this.value = (attr.value || '') + ''
    for (const [key, value] of Object.entries(attr)) {
      if (key === 'value') {
      } else if (key === 'current' || key === 'selected' || key === 'disabled') {
        this[key] = attr[key] === value || attr[key] === true
      } else if (typeof value === 'function') {
        this.element[key] = value
      } else {
        this.element.setAttribute(key, value)
      }
    }
    for (const node of nodes) {
      this.element.appendChild(node)
      const tUl = TComponent.from(node)
      if (!(tUl instanceof TUl) || !tUl._parentClass) continue
      for (const className of tUl._parentClass.split(' ')) {
        this.element.classList.add(className)
      }
    }
  }
  set current (v) {
    if (v) {
      this.element.classList.add('current')
    } else {
      this.element.classList.remove('current')
    }
  }
  get current () {
    return this.element.classList.contains('current')
  }
  set selected (v) {
    if (v) {
      this.element.classList.add('selected')
    } else {
      this.element.classList.remove('selected')
    }
  }
  get selected () {
    return this.element.classList.contains('selected')
  }
  set disabled (v) {
    if (v) {
      this.element.classList.add('disabled')
    } else {
      this.element.classList.remove('disabled')
    }
  }
  get disabled () {
    return this.element.classList.contains('disabled')
  }
}
