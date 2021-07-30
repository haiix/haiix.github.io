import TComponent from '@haiix/TComponent'
import style from '/assets/style.mjs'

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
    return ``
  }

  bodyTemplate () {
    return ``
  }

  buttonsTemplate () {
    return ``
  }

  constructor (attr = {}, nodes = []) {
    super()
    this.resolve = attr.resolve
  }

  handleKeyDown (event) {
    event.stopPropagation()
    switch (event.keyCode) {
      case 13: // Enter
        if (event.target.tagName !== 'BUTTON' && typeof this.handleOK === 'function') {
          // イベントの連続実行を防ぐため requestAnimationFrame を挟む
          requestAnimationFrame(t => this.handleOK(event))
        }
        break
      case 27: // Esc
        if (typeof this.handleCancel === 'function') {
          // イベントの連続実行を防ぐため requestAnimationFrame を挟む
          requestAnimationFrame(t => this.handleCancel(event))
        }
        break
      // TODO Up, Left, Right, Bottom でもボタンフォーカス移動
      // TODO Buttonにフォーカスがあたっているときの Space は Enter と同じ(?)
    }
  }
}

export function createDialog (DialogClass) {
  return (...args) => {
    const lastFocused = document.activeElement
    let dialog
    return new Promise(resolve => {
      dialog = new DialogClass(Object.assign({ resolve }, { arguments: args }))
      document.body.appendChild(dialog.element)
      if (dialog.main) dialog.main()
    }).then(result => {
      document.body.removeChild(dialog.element)
      lastFocused.focus()
      return result
    })
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

  main () {
    this.okButton.focus()
  }

  handleOK (event) {
    this.resolve()
  }

  handleCancel (event) {
    this.resolve()
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

  main () {
    this.okButton.focus()
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

  main () {
    this.passwordInput.focus()
  }

  handleOK (event) {
    this.resolve(this.passwordInput.value)
  }

  handleCancel (event) {
    this.resolve(null)
  }
})

export async function openFile (accept = '', multiple = false) {
  //focus()
  //await new Promise(resolve => setTimeout(resolve, 100))
  return await new Promise(resolve => {
    const input = TComponent.createElement(`<input type="file" accept="${accept}" ${multiple ? 'multiple' : ''} hidden />`)
    input.onchange = event => {
      resolve(multiple ? input.files : input.files[0])
    }
    addEventListener('focus', function callee (event) {
      removeEventListener('focus', callee)
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
          break
        case 40: // Down
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
          break
      }
    }

    this.resolve = value => {
      removeEventListener('mousedown', handleMouseDown, true)
      removeEventListener('mousemove', handleMouseMove, true)
      removeEventListener('blur', handleBlur, true)
      removeEventListener('keydown', handleKeyDown, true)
      // イベントの連続実行を防ぐため requestAnimationFrame を挟む
      requestAnimationFrame(t => this._resolve(value))
    }

    addEventListener('mousedown', handleMouseDown, true)
    addEventListener('mousemove', handleMouseMove, true)
    addEventListener('blur', handleBlur, true)
    addEventListener('keydown', handleKeyDown, true)
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
