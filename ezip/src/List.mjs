import TComponent from '@haiix/TComponent'

export default class List extends TComponent {
  template () {
    return `
      <ul
        onmousedown="this._handleMouseDown(event)"
        onkeydown="this._handleKeyDown(event)"
        tabindex="0"
      ></ul>
    `
  }

  constructor (attr = {}, nodes = []) {
    super()
    for (const node of nodes) {
      this.appendChild(node.element || node)
    }
    this.onchange = attr.onchange || null
    if (attr.class) this.element.setAttribute('class', attr.class)
    if (attr.style) this.element.setAttribute('style', attr.style)
    this._shiftStart = null
  }

  get current () {
    return this._current
  }

  set current (li) {
    let prev = this.current
    if (li === prev) return
    if (prev) prev.classList.remove('current')
    if (li) li.classList.add('current')
    this._current = li
    if (typeof this.onchange === 'function') this.onchange()
  }

  getSelected () {
    return Array.from(this.children)
      .filter(li => li.classList.contains('selected'))
  }

  select (...items) {
    for (const li of items) {
      li.classList.add('selected')
    }
  }

  unselect (...items) {
    for (const li of items) {
      li.classList.remove('selected')
    }
  }

  unselectAll () {
    this.unselect(...this.children)
  }

  get children () {
    return this.element.children
  }

  appendChild (node) {
    this.element.appendChild(node)
    if (!this.current) this.current = node
  }

  insertBefore (node, child) {
    this.element.insertBefore(node, child)
    if (!this.current) this.current = node
  }

  removeChild (child) {
    if (this.current === child) {
      this.current = child.nextElementSibling || child.previousElementSibling || null
    }
    this.element.removeChild(child)
  }

  _handleMouseDown (event) {
    if (event.button !== 0 && event.button !== 2) return
    let li = event.target
    while (li && li.parentElement !== this.element) {
      li = li.parentElement
    }
    if (!event.ctrlKey && !event.shiftKey && (!li || event.button === 0 || !li.classList.contains('selected'))) {
      this.unselectAll()
    }
    if (!li || li.classList.contains('disabled')) return
    if (!this._shiftSelect(event, li)) {
      if (!event.ctrlKey || event.button === 2 || !li.classList.contains('selected')) {
        this.select(li)
      } else {
        this.unselect(li)
      }
    }
    if (!li.classList.contains('current')) {
      this.current = li
    }
  }

  _handleKeyDown (event) {
    switch (event.keyCode) {
      case 32: // Space
        {
          const li = this.current
          if (event.ctrlKey && li.classList.contains('selected')) {
            this.unselect(li)
          } else {
            this.select(li)
          }
        }
        return
      case 35: // End
      case 36: // Home
      case 38: // Up
      case 40: // Down
        {
          let li = this.current
          if (event.keyCode === 35 || event.keyCode === 38) {
            li = (li && event.keyCode === 38) ? li.previousSibling : this.element.lastElementChild
            while (li && li.classList.contains('disabled')) {
              li = li.previousSibling
            }
          } else {
            li = (li && event.keyCode === 40) ? li.nextSibling : this.element.firstElementChild
            while (li && li.classList.contains('disabled')) {
              li = li.nextSibling
            }
          }
          if (!li) return
          if (!this._shiftSelect(event, li) && !event.ctrlKey) {
            this.unselectAll()
            this.select(li)
          }
          if (!li.classList.contains('current')) {
            this.current = li
          }
        }
        return
      case 65: // a
        if (event.ctrlKey) {
          for (const li of this.children) {
            if (!li.classList.contains('disabled')) {
              li.classList.add('selected')
            }
          }
        }
        return
    }
  }

  _shiftSelect (event, li) {
    this._shiftStart = event.shiftKey ? this._shiftStart || this.current : null
    if (this._shiftStart) {
      let f = false
      for (const curr of this.children) {
        if ((curr === li || curr === this._shiftStart) && li !== this._shiftStart) f = !f
        if ((f || curr === li || curr === this._shiftStart) && !curr.classList.contains('disabled')) {
          this.select(curr)
        } else {
          this.unselect(curr)
        }
      }
    }
    return !!this._shiftStart
  }
}
