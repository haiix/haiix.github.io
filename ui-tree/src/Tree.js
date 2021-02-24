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

    const treeSrc = nodes[0].data

    this._tree.innerHTML = seq(treeSrc.split('\n'))
      .map(line => [line.search(/[^ ]/), line])
      .filter(([indent, label]) => indent >= 0)
      .map(([indent, label]) => [indent, label.slice(indent)])
      .map(function ([indent, label]) {
        if (this.reduceIndent === -1) this.reduceIndent = indent
        return [indent - this.reduceIndent, label]
      }, { reduceIndent: -1 })
      .map(([indent, label]) => [Math.floor(indent / 2), label])
      .concat([[-1, '']])
      .map(function ([indent, label]) {
        const [prevIndent, prevLabel] = this.prev
        this.prev = [indent, label]
        return [prevIndent, prevLabel, indent > prevIndent ? 'expand_more' : 'n']
      }, { prev: [-1, ''] })
      .slice(1)
      .map(([indent, label, icon]) => [indent, `<li style="padding-left: ${indent}em;"><i class="material-icons">${icon}</i><span>${label}</span></li>`])
      .concat([[-1, '']])
      .map(function ([indent, label]) {
        const sub = indent - this.prevIndent
        this.prevIndent = indent
        return (sub > 0 ? '<ul>'.repeat(sub) : '</ul>'.repeat(-sub)) + label
      }, { prevIndent: -1 })
      .join('')

    this.current = this.first
  }

  set current (li) {
    if (this._lastCurrent != null) {
      this._lastCurrent.classList.remove('current')
    }
    this._lastCurrent = li
    this._lastCurrent.classList.add('current')
  }

  get current () {
    if (this._lastCurrent == null || !this._lastCurrent.classList.contains('current')) {
      this._lastCurrent = this._tree.querySelector('.current')
    }
    return this._lastCurrent
  }

  get first () {
    let curr = this._tree.firstChild
    while (curr && curr.tagName === 'UL') curr = curr.firstChild
    return curr
  }

  focus () {
    this._tree.focus()
  }

  expand (li) {
    li.firstChild.textContent = 'expand_more'
    li.nextSibling.style.display = ''
  }

  collapse (li) {
    li.firstChild.textContent = 'chevron_right'
    li.nextSibling.style.display = 'none'
    if (li.nextSibling.contains(this.current)) {
      this.current = li
    }
  }

  _handleTreeMousedown (event) {
    if (event.target.tagName === 'I') {
      const li = event.target.parentNode
      const ul = li.nextSibling
      if (ul && ul.tagName === 'UL') {
        if (ul.style.display !== 'none') {
          this.collapse(li)
        } else {
          this.expand(li)
        }
      }
    } else {
      let target = event.target
      while (target.tagName !== 'LI') {
        if (target === this._tree) return
        target = target.parentNode
      }
      this.current = target
    }
  }

  _handleTreeKeydown (event) {
    if (!this.current) return
    switch (event.keyCode) {
      case 8:  // Back Space
      {
        if (this.current.parentNode.parentNode !== this._tree) {
          this.current = this.current.parentNode.previousSibling
        }
      }
      break
      case 37: // Left
      {
        if (this.current.nextSibling && this.current.nextSibling.tagName === 'UL' && this.current.nextSibling.style.display !== 'none') {
          this.collapse(this.current)
        } else {
          if (this.current.parentNode.parentNode !== this._tree) {
            this.current = this.current.parentNode.previousSibling
          }
        }
      }
      break
      case 38: // Up
      {
        if (this.current.previousSibling) {
          let curr = this.current.previousSibling
          while (curr.tagName === 'UL' && curr.style.display !== 'none') {
            curr = curr.lastChild
          }
          if (curr.tagName === 'UL') {
            curr = curr.previousSibling
          }
          this.current = curr
        } else {
          if (this.current.parentNode.previousSibling) {
            this.current = this.current.parentNode.previousSibling
          }
        }
      }
      break
      case 39: // Right
      {
        if (this.current.nextSibling && this.current.nextSibling.tagName === 'UL') {
          if (this.current.nextSibling.style.display === 'none') {
            this.expand(this.current)
          } else {
            this.current = this.current.nextSibling.firstChild
          }
        }
      }
      break
      case 40: // Down
      {
        let curr = this.current
        if (curr.nextSibling && curr.nextSibling.tagName === 'UL') {
          curr = curr.nextSibling
        }
        if (curr && curr.tagName === 'UL' && curr.style.display !== 'none') {
          this.current = curr.firstChild
        } else {
          while (!curr.nextSibling && curr !== this._tree) {
            curr = curr.parentNode
          }
          if (curr !== this._tree) {
            this.current = curr.nextSibling
          }
        }
      }
      break
    }
  }
}
