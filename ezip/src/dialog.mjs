import TComponent from '@haiix/TComponent'
import style from '/assets/style.mjs'
import { isTabbable, nextTabbable, previousTabbable } from '/assets/focus.mjs'

export class Dialog extends TComponent {
  template () {
    const ukey = 'my-dialog'
    style(`
      .${ukey} {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        display: flex;
        justify-content: center;
        align-items: center;
        outline: none;
      }
      .${ukey} > .background {
        /*
        background: #FFF;
        opacity: 50%;
        */
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        z-index: -1;
      }
      .${ukey} > .dialog {
        background: #FFF;
        border: 1px solid #999;
        box-shadow: 0 0 10px rgba(0, 0, 0, 0.25);
        display: flex;
        flex-flow: column nowrap;
        color: #000;
        background: #FFF;
      }
      .${ukey} > .dialog > .title {
        flex: none;
        padding: 4px;
        color: #000;
        background: #EEE;
      }
      .${ukey} > .dialog > .body {
        flex: auto;
        padding: 10px;
      }
      .${ukey} > .dialog > .buttons {
        flex: none;
        display: flex;
        justify-content: flex-end;
        padding: 0 5px;
      }
      .${ukey} > .dialog > .buttons > button {
        width: 75px;
        margin: 5px;
        white-space: nowrap;
      }
    `)
    return `
      <div class="${ukey}" onkeydown="this.handleKeyDown(event)" tabindex="-1">
        <div class="background"></div>
        <div class="dialog">
          <div id="title" class="title">${this.titleTemplate()}</div>
          <div id="body" class="body">${this.bodyTemplate()}</div>
          <div id="buttons" class="buttons">${this.buttonsTemplate()}</div>
        </div>
      </div>
    `
  }

  titleTemplate () {
    return ''
  }

  bodyTemplate () {
    return ''
  }

  buttonsTemplate () {
    return ''
  }

  constructor (attr = {}, nodes = []) {
    super()
    this.resolve = attr.resolve
  }

  handleOK (event) {
    this.resolve(null)
  }

  handleCancel (event) {
    this.resolve(null)
  }

  handleKeyDown (event) {
    event.stopPropagation()
    let elem = document.activeElement
    switch (event.keyCode) {
      case 13: // Enter
        if (event.target.tagName !== 'BUTTON' && typeof this.handleOK === 'function') {
          this.handleOK(event)
        }
        break
      case 27: // Esc
        if (typeof this.handleCancel === 'function') {
          this.handleCancel(event)
        }
        break
      case 37: // Left
      case 38: // Up
        if (elem.tagName === 'BUTTON' && this.buttons.contains(elem)) {
          elem = previousTabbable(elem, this.buttons)
          if (!elem) elem = previousTabbable(elem, this.buttons)
          if (elem) elem.focus()
        }
        break
      case 39: // Right
      case 40: // Bottom
        if (elem.tagName === 'BUTTON' && this.buttons.contains(elem)) {
          elem = nextTabbable(elem, this.buttons)
          if (!elem) elem = nextTabbable(elem, this.buttons)
          if (elem) elem.focus()
        }
        break
    }
  }
}

export function createDialog (DialogClass) {
  return async function (...args) {
    const lastFocused = document.activeElement
    let dialog
    let tabHandler = null
    const result = await new Promise(resolve => {
      dialog = new DialogClass(Object.assign({ resolve }, { arguments: args }))
      document.body.appendChild(dialog.element)
      const firstElem = nextTabbable(null, dialog.element)
      if (firstElem) {
        const lastElem = previousTabbable(null, dialog.element)
        tabHandler = TComponent.createElement('<div style="position: absolute; overflow: hidden; width: 0;"><input onfocus="this.handleFocus(event)" tabindex="1" /></div>', {
          handleFocus (event) {
            firstElem.focus()
          }
        })
        document.body.insertBefore(tabHandler, document.body.firstChild)
        dialog.element.addEventListener('keydown', event => {
          if (event.keyCode === 9 && event.ctrlKey === false && event.altKey === false) {
            const f = isTabbable(event.target)
            if (event.shiftKey && (!f || event.target === firstElem)) {
              event.preventDefault()
              lastElem.focus()
            } else if (!event.shiftKey && (!f || event.target === lastElem)) {
              event.preventDefault()
              firstElem.focus()
            }
          }
        })
        firstElem.focus()
      }
      if (dialog.main) dialog.main()
    })
    document.body.removeChild(dialog.element)
    if (tabHandler) document.body.removeChild(tabHandler)
    lastFocused.focus()
    await new Promise(resolve => requestAnimationFrame(resolve)) // keydownイベントが連続実行されるのを防ぐ
    return result
  }
}

export const alert = createDialog(class extends Dialog {
  bodyTemplate () {
    return `
      <p id="text" style="white-space: pre-wrap;"></p>
    `
  }

  buttonsTemplate () {
    return `
      <button id="okButton" onclick="return this.handleOK(event)">OK</button>
    `
  }

  constructor (attr = {}, nodes = []) {
    super(attr, nodes)
    const [text = '', title = '情報'] = attr.arguments
    this.title.textContent = title
    this.text.textContent = text
  }
})

export const confirm = createDialog(class extends Dialog {
  bodyTemplate () {
    return `
      <p id="text" style="white-space: pre-wrap;"></p>
    `
  }

  buttonsTemplate () {
    return `
      <button id="okButton" onclick="return this.handleOK(event)">はい</button>
      <button onclick="return this.handleCancel(event)">いいえ</button>
    `
  }

  constructor (attr = {}, nodes = []) {
    super(attr, nodes)
    const [text = '', title = '確認'] = attr.arguments
    this.title.textContent = title
    this.text.textContent = text
  }

  handleOK (event) {
    this.resolve(true)
  }

  handleCancel (event) {
    this.resolve(false)
  }
})

export const passwordPrompt = createDialog(class extends Dialog {
  bodyTemplate () {
    return `
      <form onsubmit="event.preventDefault()">
        <p id="text" style="white-space: pre-wrap;"></p>
        <input id="passwordInput" type="password" name="password" autocomplete="none" />
      </form>
    `
  }

  buttonsTemplate () {
    return `
      <button onclick="return this.handleOK(event)">OK</button>
      <button onclick="return this.handleCancel(event)">キャンセル</button>
    `
  }

  constructor (attr = {}, nodes = []) {
    super(attr, nodes)
    const [text = '', value = '', title = '入力'] = attr.arguments
    this.title.textContent = title
    this.text.textContent = text
    this.passwordInput.value = value
  }

  handleOK (event) {
    this.resolve(this.passwordInput.value)
  }
})

export async function openFile (accept = '', multiple = false) {
  // focus()
  // await new Promise(resolve => setTimeout(resolve, 100))
  return await new Promise(resolve => {
    const input = TComponent.createElement(`<input type="file" accept="${accept}" ${multiple ? 'multiple' : ''} hidden />`)
    input.onchange = event => {
      resolve(multiple ? input.files : input.files[0])
    }
    window.addEventListener('focus', function callee (event) {
      window.removeEventListener('focus', callee)
      setTimeout(resolve, 1000, null)
    })
    document.body.appendChild(input)
    input.click()
    document.body.removeChild(input)
  })
}

export class ContextMenu extends TComponent {
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
      .${ukey} > a {
        display: block;
        line-height: 22px;
        padding: 0 10px;
        border: 1px solid transparent;
        white-space: nowrap;
      }
      .${ukey} > a.current {
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
