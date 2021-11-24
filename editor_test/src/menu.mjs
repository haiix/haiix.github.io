import TComponent from '/assets/TComponent.mjs'
import style from '/assets/style.mjs'
import { createDialog } from '/assets/ui/dialog.mjs'

class ContextMenu extends TComponent {
  template () {
    const ukey = 'my-flie-list-context-menu'
    style(`
      .${ukey} {
        display: inline-block;
        position: absolute;
        background: #FFF;
        border: 1px solid #999;
        padding: 2px 0;
        box-shadow: 2px 2px 4px rgba(0, 0, 0, 0.5);
      }
      .${ukey} > * {
        display: block;
        line-height: 20px;
        padding: 0 10px;
        border: 1px solid transparent;
        white-space: nowrap;
      }
      .${ukey} > * > * {
        vertical-align: middle;
      }
      .${ukey} > * > .material-icons {
        font-size: 16px;
        position: relative;
        left: -6px;
      }
      .${ukey} > hr {
        border-top: 1px solid #CCC;
        margin: 4px;
      }
      .${ukey} > .current:not(.disabled) {
        border: 1px solid #BDF;
        background: #DEF;
      }
    `)
    return `
      <div class="${ukey}" id="contextMenu"
        onmousedown="return this.handleMouseDown(event)"
        onmouseup="return this.handleMouseUp(event)"
        onmouseleave="return this.handleMouseLeave(event)">
        ${this.menuTemplate()}
      </div>
    `
  }

  constructor (attr = {}, nodes = []) {
    super()
    this._resolve = attr.resolve
    const [event] = attr.arguments
    this.element.style.top = event.pageY + 'px'
    this.element.style.left = event.pageX + 'px'

    const handleMouseDown = event => {
      if (this.element.contains(event.target)) return
      handleBlur(event)
    }

    const handleBlur = event => {
      this.resolve(null)
    }

    const handleMouseMove = event => {
      if (event.target.parentNode !== this.contextMenu) return
      const curr = this.current
      if (curr === event.target) return
      if (curr) curr.classList.remove('current')
      event.target.classList.add('current')
    }

    const handleKeyDown = event => {
      event.stopPropagation()
      const curr = this.current
      switch (event.keyCode) {
        case 13: // Enter
          this.resolve(curr.dataset.value)
          break
        case 27: // Esc
          this.resolve(null)
          break
        case 38: // Up
          {
            const last = this.contextMenu.lastElementChild
            if (curr) {
              curr.classList.remove('current')
              let prev = curr
              do {
                prev = prev.previousElementSibling || last
                if (!prev.classList.contains('disabled')) break
              } while (prev !== curr)
              prev.classList.add('current')
            } else {
              last.classList.add('current')
            }
          }
          break
        case 40: // Down
          {
            const first = this.contextMenu.firstElementChild
            if (curr) {
              curr.classList.remove('current')
              let next = curr
              do {
                next = next.nextElementSibling || first
                if (!next.classList.contains('disabled')) break
              } while (next !== curr)
              next.classList.add('current')
            } else {
              first.classList.add('current')
            }
          }
          break
      }
    }

    this.resolve = value => {
      window.removeEventListener('mousedown', handleMouseDown, true)
      window.removeEventListener('mousemove', handleMouseMove, true)
      window.removeEventListener('blur', handleBlur, true)
      window.removeEventListener('keydown', handleKeyDown, true)
      this._resolve(value)
    }

    window.addEventListener('mousedown', handleMouseDown, true)
    window.addEventListener('mousemove', handleMouseMove, true)
    window.addEventListener('blur', handleBlur, true)
    window.addEventListener('keydown', handleKeyDown, true)
  }

  get current () {
    return Array.from(this.contextMenu.children).find(item => item.classList.contains('current'))
  }

  handleMouseDown (event) {
    event.preventDefault() // フォーカスが外れるのを防ぐ
  }

  handleMouseUp (event) {
    let target = event.target
    while (target && target.parentNode !== this.element) {
      target = target.parentNode
    }
    if (target && !target.classList.contains('disabled')) {
      this.resolve(target.dataset.value)
    }
  }

  handleMouseLeave (event) {
    const curr = this.current
    if (curr) curr.classList.remove('current')
  }
}

export function createContextMenu (template) {
  return createDialog(class extends ContextMenu {
    menuTemplate () {
      return template
    }
  })
}
