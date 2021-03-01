import TComponent from '@haiix/TComponent'
import seq from '@haiix/seq'

export default class Tree extends TComponent {
  template () {
    return `
      <div id="_tree" tabindex="0" class="tree"
        onmousedown="this._handleTreeMousedown(event)"
        onmousemove="event.preventDefault()"
        onkeydown="this._handleTreeKeydown(event)"
      >
      </div>
    `
  }

  constructor (attr, nodes) {
    super()

    for (const [key, value] of Object.entries(attr)) {
      this._tree.setAttribute(key, value)
    }

    this._tree.innerHTML = '<ul>' + seq((nodes[0] || { data: '' }).data.split('\n'))
      .map(line => [line.search(/\S/), line])
      .filter(([indent]) => indent >= 0)
      .map(([indent, line]) => [indent, line.slice(indent)])
      .map(function ([indent, line]) {
        if (this.indent < 0) this.indent = indent
        return [indent - this.indent, line]
      }, { indent: -1 })
      .map(([indent, line]) => [Math.ceil(indent / 2), line])
      .concat([[-1, '']])
      .map(function ([indent, line]) {
        const prevIndent = this.prevIndent
        const delta = indent - prevIndent
        const prevLine = this.prevLine
        this.prevIndent = indent
        this.prevLine = line
        return [prevIndent, prevLine, delta]
      }, { prevIndent: -1, prevLine: '' })
      .slice(1)
      .map(([indent, line, delta]) => [indent, line, delta, delta > 0 ? 'expand_more' : '_'])
      .map(([indent, line, delta, icon]) => [`<li><div style="padding-left: ${indent}em;"><i class="material-icons">${icon}</i><span>${line}</span></div>`, delta])
      .map(([line, delta]) => line + (delta > 0 ? '<ul>' : '</ul>').repeat(Math.abs(delta)))
      .join('')
    this.current = this.first
  }

  set current (item) {
    if (this._lastCurrent === item) return
    if (this._lastCurrent != null) this._lastCurrent.classList.remove('current')
    this._lastCurrent = item
    if (item) item.classList.add('current')
  }

  get current () {
    if (this._lastCurrent == null || !this._lastCurrent.classList.contains('current')) {
      this._lastCurrent = this._tree.querySelector('.current')
    }
    return this._lastCurrent
  }

  get first () {
    return this._tree.firstChild && this._tree.firstChild.firstChild.firstChild
  }

  focus () {
    this._tree.focus()
  }

  expand (item) {
    item.firstChild.textContent = 'expand_more'
    item.nextSibling.style.display = ''
  }

  collapse (item) {
    item.firstChild.textContent = 'chevron_right'
    item.nextSibling.style.display = 'none'
    if (item.nextSibling.contains(this.current)) {
      this.current = item
    }
  }

  _handleTreeMousedown (event) {
    let item = event.target
    while (item.tagName !== 'LI') {
      if (item === this._tree) return
      item = item.parentNode
    }
    item = item.firstChild

    if (item.firstChild === event.target && item.nextSibling) {
      const ul = item.nextSibling
      if (ul) {
        if (ul.style.display !== 'none') {
          this.collapse(item)
        } else {
          this.expand(item)
        }
      }
    } else {
      this.current = item
    }
  }

  _handleTreeKeydown (event) {
    if (!this.current) return
    switch (event.keyCode) {
      case 8:  // Back Space
      {
        if (this.current.parentNode.parentNode.parentNode !== this._tree) {
          this.current = this.current.parentNode.parentNode.previousSibling
        }
      }
      break
      case 37: // Left
      {
        if (this.current.nextSibling && this.current.nextSibling.style.display !== 'none') {
          this.collapse(this.current)
        } else {
          if (this.current.parentNode.parentNode.parentNode !== this._tree) {
            this.current = this.current.parentNode.parentNode.previousSibling
          }
        }
      }
      break
      case 38: // Up
      {
        if (this.current.parentNode.previousSibling) {
          let li = this.current.parentNode.previousSibling
          while (li.firstChild.nextSibling && li.firstChild.nextSibling.style.display !== 'none') {
            li = li.firstChild.nextSibling.lastChild
          }
          this.current = li.firstChild
        } else {
          if (this.current.parentNode.parentNode.parentNode !== this._tree) {
            this.current = this.current.parentNode.parentNode.previousSibling
          }
        }
      }
      break
      case 39: // Right
      {
        if (this.current.nextSibling) {
          if (this.current.nextSibling.style.display === 'none') {
            this.expand(this.current)
          } else {
            this.current = this.current.nextSibling.firstChild.firstChild
          }
        }
      }
      break
      case 40: // Down
      {
        if (this.current.nextSibling && this.current.nextSibling.style.display !== 'none') {
          this.current = this.current.nextSibling.firstChild.firstChild
        } else {
          let li = this.current.parentNode
          while (!li.nextSibling && li !== this._tree) {
            li = li.parentNode.parentNode
          }
          if (li !== this._tree) {
            this.current = li.nextSibling.firstChild
          }
        }
      }
      break
    }
  }
}
