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
        box-shadow: 2px 2px 4px rgba(0, 0, 0, 0.5);
      }
      .${ukey} > * {
        display: block;
        line-height: 22px;
        padding: 0 10px;
        border: 1px solid transparent;
        white-space: nowrap;
      }
      .${ukey} > .current {
        border: 1px solid #BDF;
        background: #DEF;
      }
    `)
    return `
      <div class="${ukey}" id="contextMenu" onmousedown="return this.handleMouseDown(event)" onmouseup="return this.handleMouseUp(event)" onmouseleave="return this.handleMouseLeave(event)">
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
              const prev = curr.previousElementSibling
              curr.classList.remove('current')
              if (prev) {
                prev.classList.add('current')
              } else {
                last.classList.add('current')
              }
            } else {
              last.classList.add('current')
            }
          }
          break
        case 40: // Down
          {
            const first = this.contextMenu.firstElementChild
            if (curr) {
              const next = curr.nextElementSibling
              curr.classList.remove('current')
              if (next) {
                next.classList.add('current')
              } else {
                first.classList.add('current')
              }
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
    this.resolve(event.target.dataset.value)
  }

  handleMouseLeave (event) {
    const curr = this.current
    if (curr) curr.classList.remove('current')
  }
}

export function createContextMenu(template) {
  return createDialog(class extends ContextMenu {
    menuTemplate () {
      return template
    }
  })
}

