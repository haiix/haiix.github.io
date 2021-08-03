import TComponent from '@haiix/TComponent'
import * as zip from '@zip.js/zip.js'
import style from './assets/style.mjs'
import hold from './assets/hold.mjs'
import { Dialog, createDialog, alert, confirm, passwordPrompt, openFile, ContextMenu } from './dialog.mjs'

const EXT = '.ezip'

function isMobile () {
  const regexp = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i
  return (window.navigator.userAgent.search(regexp) !== -1)
}

const saveDialog = createDialog(class extends Dialog {
  titleTemplate () {
    return '暗号化して保存'
  }

  bodyTemplate () {
    const ukey = 'my-save-dialog-body'
    style(`
      .${ukey} > label {
        display: block;
        white-space: nowrap;
      }
      .${ukey} > label > span {
        display: inline-block;
        width: 100px;
        height: 24px;
      }
    `)
    return `
      <form id="form" class="${ukey}" onsubmit="event.preventDefault()">
        <label>
          <span>ファイル名:</span>
          <input name="name" id="fileNameInput" />
        </label>
        <label>
          <span>パスワード:</span>
          <input type="password" name="password" autocomplete="none" />
        </label>
        <label>
          <span>パスワード(確認):</span>
          <input type="password" name="confirm-password" autocomplete="none" />
        </label>
      </form>
    `
  }

  buttonsTemplate () {
    return `
      <button onclick="return this.handleOK(event)">OK</button>
      <button onclick="return this.handleCancel(event)">キャンセル</button>
    `
  }

  handleOK (event) {
    this.resolve(Array.from(this.form.elements).reduce((obj, elem) => ((obj[elem.name] = elem.value), obj), {}))
  }
})

const fileListContextMenu = createDialog(class extends ContextMenu {
  menuTemplate () {
    return `
      <a data-value="add">ファイル追加</a>
      <a data-value="save">保存</a>
      <!-- <a data-value="rename">名前の変更</a> -->
      <a data-value="delete">削除</a>
    `
  }
})

class FileListItem extends TComponent {
  template () {
    return '<li></li>'
  }

  constructor (attr = {}, nodes = []) {
    super()
    this.file = attr.file
    this._url = null
    this.element.textContent = this.file.name
  }

  get url () {
    if (!this._url) {
      this._url = URL.createObjectURL(this.file)
    }
    return this._url
  }

  destructor () {
    if (this._url) {
      URL.revokeObjectURL(this.file)
      this._url = null
    }
  }
}

export default class App extends TComponent {
  template () {
    const ukey = 'my-app'
    style(`
      .flex.row {
        display: flex;
      }
      .flex.column {
        display: flex;
        flex-direction: column;
      }
      .flex.row > *, .flex.column > * {
        flex: none;
      }
      .flex.stretch {
        flex: auto;
      }

      body {
        font-family: "Segoe UI", "Yu Gothic UI", "Meiryo UI", "MS UI Gothic", "Yu Gothic", monospace;
        font-size: 9pt;
        color: #000;
        background: #FFF;
        user-select: none;
        cursor: default;
      }
      button {
        font-family: inherit;
        font-size: inherit;
      }
      ul {
        margin: 0;
        padding: 0;
        list-style-type: none;
      }

      .${ukey} {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
      }
      .${ukey} .menu {
        background: #EEE;
        border-bottom: 1px solid #CCC;
      }
      .${ukey} .menu > * {
        display: inline-block;
        line-height: 22px;
        padding: 0 8px;
        border: 1px solid transparent;
      }
      .${ukey} .menu > :hover {
        background: #DEF;
        border: 1px solid #BDF;
      }
      .${ukey} .file-list-container {
        outline: none;
        border-right: 1px solid #CCC;
        position: relative;
        width: 200px;
      }
      .${ukey} .file-list-placeholder {
        color: #999;
        margin: 8px;
        overflow: hidden;
      }
      .${ukey} ul.file-list {
        line-height: 22px;
        height: 0;
        min-height: 100%;
        overflow: auto;
      }
      .${ukey} ul.file-list > li {
        padding: 0 10px;
        overflow: hidden;
        white-space: nowrap;
        text-overflow: ellipsis;
        border: 1px solid transparent;
      }
      .${ukey} ul.file-list > li:hover {
        background: #DEF;
      }
      .${ukey} .file-list-container:focus ul.file-list > li.current {
        border: 1px solid #9CF;
      }
      .${ukey} .file-list-container ul.file-list > li.selected {
        background: #CCC;
      }
      .${ukey} .file-list-container:focus ul.file-list > li.selected {
        background: #BDF;
      }
      .${ukey} .file-list-resize-handle {
        position: absolute;
        top: 0;
        right: -5px;
        width: 9px;
        height: 100%;
        cursor: e-resize;
        z-index: 1;
      }
    `)
    return `
      <div class="${ukey} flex column"
        ondragover="return this.handleDragOver(event)"
        ondrop="return this.handleDrop(event)"
        onkeydown="return this.handleKeyDown(event)"
      >
        <ul class="menu"
          onmousedown="return this.handleMenuMouseDown(event)"
          onclick="return this.handleMenuClick(event)"
        >
          <li data-value="new">新規</li>
          <li data-value="open">暗号化されたファイルを開く</li>
          <li data-value="save">暗号化して保存</li>
        </ul>
        <div class="flex stretch row" style="position: relative; z-index: 0;">
          <div id="fileListContainer" class="file-list-container" tabindex="0"
            onkeydown="return this.handleFileListKeyDown(event)"
            onmousedown="return this.handleFileListMouseDown(event)"
            oncontextmenu="return this.handleFileListContextMenu(event)"
          >
            <p id="placeholder" class="file-list-placeholder">ここにファイルをドラッグ&ドロップするか、右クリックメニューよりファイルを追加してください。</p>
            <ul id="fileList" class="file-list"></ul>
            <div class="file-list-resize-handle" onmousedown="return this.handleFileListResize(event)"></div>
          </div>
          <div id="view" class="flex stretch" style="position: relative;">
            <iframe id="iframe" title="view" style="width: 0; min-width: 100%; height: 0; min-height: 100%; border: none;" ></iframe>
          </div>
        </div>
      </div>
    `
  }

  main () {
    if (isMobile()) {
      alert('モバイル端末には対応していません。')
    }
  }

  handleMenuMouseDown (event) {
    event.preventDefault() // リストからフォーカスが外れるのを防ぐ
  }

  handleMenuClick (event) {
    switch (event.target.dataset.value) {
      case 'new':
        return this.handleNew(event)
      case 'open':
        return this.handleOpen(event)
      case 'save':
        return this.handleSave(event)
    }
  }

  async handleNew (event) {
    if (this.fileList.childElementCount > 0) {
      if (!await confirm('現在のファイルを閉じますか?')) return
    }

    this.deleteFiles(this.fileList.children)
  }

  async handleOpen (event) {
    if (this.fileList.childElementCount > 0) {
      if (!await confirm('現在のファイルを閉じて、別のファイルを開きますか?')) return
    }

    this.deleteFiles(this.fileList.children)

    const zipFile = await openFile(EXT)
    if (!zipFile) return

    const password = await passwordPrompt('パスワードを入力してください。')
    if (password == null) return

    const files = await this.readEncryptedZipFile(zipFile, password)
    this.addFiles(files)
  }

  async handleSave (event) {
    const formValues = await saveDialog()
    if (!formValues) return

    if (formValues.password !== formValues['confirm-password']) {
      throw new Error('パスワードが一致しません')
    }

    const zipFileName = (formValues.name || 'untitled') + (formValues.name.slice(-4) === EXT ? '' : EXT)
    const zipFilePassword = formValues.password

    const inputFiles = Array.from(this.fileList.children).map(li => TComponent.from(li).file)
    const zipFile = await this.createEncryptedZipFile(zipFileName, zipFilePassword, inputFiles)

    this.downloadFiles([zipFile])
  }

  async readEncryptedZipFile (zipFile, password) {
    try {
      const encryptedZip = (await this.readZip(zipFile, { password }))[0]
      return await this.readZip(encryptedZip)
    } catch (error) {
      throw new Error('ファイルを開けません:\n' + error.message)
    }
  }

  async readZip (zipFile, options) {
    const reader = new zip.ZipReader(new zip.BlobReader(zipFile))
    const entries = await reader.getEntries()
    return await Promise.all(
      entries.map(async function (entry) {
        const mime = this.getMimeFromExt(entry.filename)
        const blob = await entry.getData(new zip.BlobWriter(mime), options)
        const file = new File([blob], entry.filename, { type: blob.type })
        return file
      }.bind(this))
    )
  }

  getMimeFromExt (fileName) {
    const ext = fileName.slice(fileName.lastIndexOf('.') + 1)
    const mine = {
      htm: 'text/html',
      html: 'text/html',
      jpeg: 'image/jpeg',
      jpg: 'image/jpeg',
      pdf: 'application/pdf',
      png: 'image/png',
      zip: 'application/x-zip-compressed'
    }[ext] || ''
    return mine
  }

  async createEncryptedZipFile (fileName, password, inputFiles) {
    const innerZipBlob = await this.createZip(inputFiles)
    const innerZipFile = new File([innerZipBlob], 'encrypted.zip', { type: innerZipBlob.type })
    const zipBlob = await this.createZip([innerZipFile], { password })
    return new File([zipBlob], fileName, { type: zipBlob.type })
  }

  async createZip (inputFiles, options) {
    const blobWriter = new zip.BlobWriter('application/zip')
    const writer = new zip.ZipWriter(blobWriter, options)
    for (const file of inputFiles) {
      await writer.add(file.name, new zip.BlobReader(file))
    }
    await writer.close()
    return await blobWriter.getData()
  }

  handleFileListMouseDown (event) {
    const targetIsItem = event.target !== this.fileList && this.fileList.contains(event.target)
    const targetIsSelected = event.target.classList.contains('selected')

    if (!event.ctrlKey && (!targetIsItem || !targetIsSelected)) {
      const selectedElems = this.fileList.querySelectorAll('li.selected')
      for (const elem of selectedElems) {
        elem.classList.remove('selected')
      }
    }

    if (targetIsItem) {
      // TODO mouseupで処理？
      if (event.ctrlKey && targetIsSelected) {
        event.target.classList.remove('selected')
      } else {
        event.target.classList.add('selected')
      }

      this.setCurrent(event.target)
    }
  }

  getCurrent () {
    return this.fileList.querySelector('li.current')
  }

  setCurrent (elem) {
    const curr = this.getCurrent()
    if (elem && elem === curr) return
    if (curr) curr.classList.remove('current')
    if (elem) {
      elem.classList.add('current')
      const item = TComponent.from(elem)
      if (item.file.type === '' || item.file.type === 'application/x-zip-compressed') {
        throw new Error('表示できません')
      }
      const url = item.url
      this.iframe.src = url
    } else {
      this.iframe.src = 'about:blank'
    }
  }

  async handleFileListKeyDown (event) {
    // event.stopPropagation()
    const curr = this.getCurrent()
    switch (event.keyCode) {
      case 38: // Up
        if (curr) {
          const prev = curr.previousElementSibling
          if (prev) this.setCurrent(prev)
        } else {
          this.setCurrent(this.fileList.firstElementChild)
        }
        break
      case 40: // Down
        if (curr) {
          const next = curr.nextElementSibling
          if (next) this.setCurrent(next)
        } else {
          this.setCurrent(this.fileList.lastElementChild)
        }
        break
    }
  }

  async handleFileListContextMenu (event) {
    event.preventDefault()
    const value = await fileListContextMenu(event)
    switch (value) {
      case 'add':
        this.addFiles(await openFile('', true))
        break
      case 'save':
        await this.downloadFiles(Array.from(this.fileList.querySelectorAll('.selected')).map(li => TComponent.from(li).file))
        break
      case 'rename':
        break
      case 'delete':
        {
          const selected = this.fileList.querySelectorAll('.selected')
          if (selected.length > 0 && await confirm('選択されたファイルを削除しますか?')) {
            this.deleteFiles(selected)
          }
        }
        break
    }
  }

  handleDragOver (event) {
    event.preventDefault()
  }

  handleDrop (event) {
    event.preventDefault()
    this.addFiles(event.dataTransfer.files)
  }

  handleKeyDown (event) {
    if (!event.ctrlKey) return
    switch (event.keyCode) {
      case 78: // n
        event.preventDefault()
        return this.handleNew(event)
      case 79: // o
        event.preventDefault()
        return this.handleOpen(event)
      case 83: // s
        event.preventDefault()
        return this.handleSave(event)
    }
  }

  async downloadFiles (files) {
    for (const file of files) {
      const url = URL.createObjectURL(file)
      TComponent.createElement(`<a href="${url}" download="${file.name}"></a>`).click()
      URL.revokeObjectURL(url)
    }
  }

  addFiles (files) {
    if (files == null) return
    let item = null
    for (const file of files) {
      item = new FileListItem({ file })
      this.fileList.appendChild(item.element)
    }
    if (this.fileList.childElementCount > 0) {
      this.placeholder.style.display = 'none'
    }
    if (item) this.setCurrent(item.element)
    this.fileListContainer.focus()
  }

  deleteFiles (list) {
    let curr = this.getCurrent()
    for (const li of Array.from(list)) {
      TComponent.from(li).destructor()
      if (curr === li) curr = curr.nextSibling
      li.parentNode.removeChild(li)
    }
    if (this.fileList.childElementCount === 0) {
      this.placeholder.style.display = ''
    }
    this.setCurrent(curr || this.fileList.lastChild)
    this.fileListContainer.focus()
  }

  handleFileListResize (event) {
    const target = event.target.parentElement
    const ox = event.pageX - window.getComputedStyle(target).width.slice(0, -2)
    hold({
      cursor: window.getComputedStyle(event.target).cursor,
      ondrag (px) {
        target.style.width = Math.max(0, px - ox) + 'px'
      }
    })
  }

  onerror (error) {
    alert(error.message, 'エラー')
    throw error
  }
}
