import TComponent from '/assets/TComponent.mjs'
import seq from '/assets/seq.mjs'
import style from '/assets/style.mjs'
//import * as idb from '/assets/idb.mjs'
import hold from '/assets/hold.mjs'
import Tree from '/assets/ui/Tree.mjs'
import { TUl, TLi } from './List.mjs'
import { alert, confirm, prompt } from '/assets/ui/dialog.mjs'
import { createContextMenu } from './menu.mjs'
import EZip from './EZip.mjs'

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
  .flex.fit {
    flex: auto;
  }

  html, body {
    font-family: "Segoe UI", "Yu Gothic UI", "Meiryo UI", "MS UI Gothic", monospace;
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
`)

function *ancestorNodes (node) {
  while (node) {
    yield node
    node = node.parentNode
  }
}

const fileTreeContextMenu = createContextMenu(`
  <div data-value="newFile">新規ファイル</div>
  <div data-value="newFolder">新規フォルダー</div>
  <div data-value="rename">名前の変更</div>
  <div data-value="delete">削除</div>
`)

class EditorTab extends TLi {
  template () {
    return `
      <li>
        <span id="label" class="label"></span>
        <span id="closeButton" class="material-icons close-button">close</span>
      </li>
    `
  }

  constructor (attr = {}, nodes = []) {
    const sattr = Object.assign({}, attr)
    delete sattr.view
    delete sattr.path
    delete sattr.file
    super(sattr, nodes)
    this.view = attr.view
    this.path = attr.path
    this.file = attr.file
    this.editor = null
  }

  get isModified () {
    return this.element.classList.contains('modified')
  }

  set isModified (value) {
    const classList = this.element.classList
    if (value) {
      classList.add('modified')
    } else {
      classList.remove('modified')
    }
  }

  get path () {
    return this.value
  }

  set path (path) {
    this.value = path
    this.label.textContent = this.name
    this.view.value = path
  }

  get name () {
    return this.path.slice(('/' + this.path).lastIndexOf('/'))
  }
}

export default class App extends TComponent {
  template () {
    const ukey = 'my-app'
    style(`
      .${ukey} {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        overflow: auto;
        outline: none;
      }
      .${ukey} .menubar {
        margin: 0;
        padding: 0;
        list-style-type: none;
        background: #EEE;
        border-bottom: 1px solid #CCC;
      }
      .${ukey} .menubar > * {
        padding: 2px 8px;
        border: 1px solid transparent;
      }
      .${ukey} .menubar > :hover {
        border: 1px solid #9CF;
        background: #DEF;
      }
      .${ukey} .file-tree {
        height: 0;
        min-height: 100%;
      }
      .${ukey} .file-tree .drop-target {
        background: #BDF;
      }
      .${ukey} .splitter {
        z-index: 4;
        background: #CCC;
        cursor: w-resize;
        width: 1px;
      }
      .${ukey} .splitter::after {
        content: "";
        display: block;
        /*background: yellow;*/
        width: 9px;
        height: 100%;
        position: relative;
        left: -4px;
      }
      .${ukey} .main-aria {
        overflow: hidden;
      }
      .${ukey} .tabs, .${ukey} .views {
        margin: 0;
        padding: 0;
        list-style-type: none;
      }
      .${ukey} .tabs {
        background: #EEE;
        border-bottom: 1px solid #999;
      }
      .${ukey} .tabs > li {
        display: inline-block;
        padding: 1px 5px 2px;
        border: 1px solid #999;
        border-bottom: none;
        background: #EEE;
        margin-right: -1px;
        position: relative;
        bottom: -1px;
        white-space: pre;
        vertical-align: bottom;
      }
      .${ukey} .tabs > li:hover {
        background: #DEF;
      }
      .${ukey} .tabs > li.current {
        padding: 1px 5px 4px;
        background: #FFF;
      }
      .${ukey} .tabs > li > * {
        vertical-align: middle;
      }
      .${ukey} .tabs > li.modified > .label::before {
        content: '*'
      }
      .${ukey} .tabs > li .close-button {
        border: 1px solid transparent;
        font-size: 12px;
        padding: 1px;
        margin-left: 4px;
      }
      .${ukey} .tabs > li .close-button:hover {
        border: 1px solid #CCC;
      }
      .${ukey} .views > li {
        width: 0;
        height: 0;
        min-width: 100%;
        min-height: 100%;
        display: none;
        position: relative;
        z-index: 0;
        overflow: auto;
      }
      .${ukey} .views > li.current {
        display: inline-block;
      }

      .${ukey} .CodeMirror {
        font-size: 14px;
        height: 100%;
      }
      .${ukey} .CodeMirror-code > :not(:last-child) .CodeMirror-line::after {
        content: "↓";
        color: #999;
        font-size: 9px;
      }
      .${ukey} .CodeMirror-code > :last-child .CodeMirror-line::after {
        content: "[EOF]";
        color: #999;
      }
      .${ukey} .cm-tab::before {
        content: '>';
        color: #999;
        font-size: 9px;
      }
      .CodeMirror-hints {
        font-size: 14px;
      }
    `)
    this.uses(Tree, TUl)
    return `
      <div class="${ukey} flex column"
        ondragover="return this.handleDragOver(event)"
        ondrop="return this.handleDrop(event)"
        onkeydown="return this.handleKeyDown(event)"
        tabindex="-1"
      >
        <!-- メニュー -->
        <ul class="menubar flex row" onclick="return this.handleClickMenu(event)">
          <li data-key="load">開く</li>
          <li data-key="save">保存</li>
          <li data-key="run">実行 (F5)</li>
        </ul>

        <div class="flex row fit">
          <!-- ファイルリスト -->
          <Tree id="fileTree" class="file-tree" style="width: 160px;"
            ondblclick="return this.handleFileTreeDoubleClick(event)"
            oncontextmenu="return this.handleFileTreeContextMenu(event)"
            onmousedown="return this.handleFileTreeMouseDown(event)"
            onkeydown="return this.handleFileTreeKeyDown(event)"
          />

          <!-- ファイルリスト可変幅 -->
          <div class="splitter" onmousedown="return this.handleSplitter(event)"></div>

          <!-- タブとエディタ -->
          <div id="tabViews" class="flex column fit main-aria">
            <t-ul id="tabs" class="tabs"
              onchange="return this.handleTabChange(event)"
              onmousedown="return this.handleTabMouseDown(event)"
            ></t-ul>
            <t-ul id="views" class="views flex fit"></t-ul>
          </div>
        </div>
      </div>
    `
  }

  constructor (attr = {}, nodes = []) {
    super()
    this.name = document.title
    this.version = '0.1.0'
    this.namespace = location.pathname.slice(1, location.pathname.lastIndexOf('/'))
    this.base = location.protocol + '//' + location.host + '/' + this.namespace + '/'
    this.firstTime = false
    this.dbSchema = {
      name: this.namespace,
      version: 1,
      onupgradeneeded: (db, tx, version) => {
        if (version < 1) {
          this.firstTime = true
          const store = db.createObjectStore('files', { keyPath: 'id', autoIncrement: true })
          store.createIndex('path', 'path', { unique: true })
        }
      }
    }
    this.debugWindow = null

    window.addEventListener('beforeunload', this.handleClose.bind(this))
  }

  handleClose (event) {
    if (this.debugWindow && !this.debugWindow.closed) {
      this.debugWindow.close()
    }
  }

  async main () {
    //await idb.tx(this.dbSchema, ['settings'], 'readwrite', tx => {
    //  const store = tx.objectStore('settings')
    //  idb.put(store, { key: 'namespace', value: this.namespace })
    //  idb.put(store, { key: 'base', value: this.base })
    //})

    await window.navigator.serviceWorker.register('./sw.js')

    await this.updateFileTree()
    if (this.firstTime) {
      await this.addFile({
        path: 'index.html',
        file: new Blob([`<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <title>My App</title>
  </head>
  <body>
    <p>Hello, World!</p>
  </body>
</html>`], { type: 'text/html' })
      })
    }

    return this.openTab('index.html')
  }

  /**
   * ファイルツリー全体をIDBから読み込んで更新する
   */
  async updateFileTree () {
    const folders = []
    const files = []

    // IDB
    await idb.tx(this.dbSchema, ['files'], 'readonly', tx => {
      idb.cursor({
        index: tx.objectStore('files').index('path'),
        forEach: fileData => {
          if (fileData.file) {
            files.push(fileData)
          } else {
            folders.push(fileData)
          }
        }
      })
    })

    // ファイルツリー
    this.fileTree.textContent = ''
    for (const fileData of [...folders, ...files]) {
      const [folder, fileName] = this.getFileTreeFolderAndName(fileData.path)
      const item = this.createFileTreeItem(fileName, !fileData.file)
      folder.appendChild(item)
    }
  }

  /**
   * ファイルをIDBに追加する
   */
  async addFile (...fileDataList) {
    // IDB
    await idb.tx(this.dbSchema, ['files'], 'readwrite', tx => {
      const store = tx.objectStore('files')
      for (const fileData of fileDataList) {
        idb.put(store, fileData)
      }
    })

    // ファイルツリー
    let item = null
    for (const fileData of fileDataList) {
      const [folder, name] = this.getFileTreeFolderAndName(fileData.path)
      item = this.createFileTreeItem(name, !fileData.file)
      this.fileTreeInsert(folder, item)
    }
    if (item) this.fileTree.current = item

    //await this.updateFileTree()
  }

  createFileTreeItem (name, isFolder) {
    const item = new Tree.Item()
    item.text = name
    if (!isFolder) {
      item.isExpandable = false
      item.icon = 'insert_drive_file'
      item.iconColor = '#CCC'
    }
    return item
  }

  /**
   * ツリーで選択されているファイルまたはフォルダーを削除する
   */
  async deleteCurrentFileOrFolder () {
    const path = this.getFileTreePath()

    // IDB
    await idb.tx(this.dbSchema, ['files'], 'readwrite', tx => (
      idb.cursor({
        index: tx.objectStore('files').index('path'),
        forEach: (value, cursor) => {
          if ((value.path + '/').startsWith(path + '/')) {
            //console.log('rm ' + value.path)
            cursor.delete(value)

            // タブが開いている場合は閉じる
            const tab = this.tabs.get(value.path)
            if (tab) this.closeTab(tab)
          }
        }
      })
    ))

    // ファイルツリー
    {
      const item = this.getFileTreeItem(path)
      item.parentNode.removeChild(item)
    }

    //await this.updateFileTree()
  }

  /**
   * ファイルをIDBからロードして、タブとエディタを追加する
   */
  async openTab (path) {
    // すでにタブが開いている場合はそれを選択する
    if (seq(this.tabs).find(tab => tab.path === path)) {
      this.tabs.value = path
      return
    }

    // IDBからロード
    const { file } = await this.getFileFromIdb(path)

    const view = new TLi({ value: path })
    const tab = new EditorTab({ view, path, file })

    if (file.type.slice(0, 6) === 'image/') {
      // 画像
      const image = document.createElement('img')
      image.src = URL.createObjectURL(file) // TODO close時にrevoke
      view.element.appendChild(image)
    } else {
      // Editor
      const textarea = document.createElement('textarea')
      textarea.value = await file.text()
      view.element.appendChild(textarea)

      requestAnimationFrame(() => {
        const cm = CodeMirror.fromTextArea(textarea, {
          lineNumbers: true,
          extraKeys: { 'Ctrl-Space': 'autocomplete' },
          mode: { name: file.type, globalVars: true },
        })
        cm.on('keydown', (cm, event) => {
          switch (event.keyCode) {
            // 改行時、右側スペースをトリムする
            case 13:
              const cursor = cm.getCursor()
              const str = cm.getLine(cursor.line).slice(0, cursor.ch)
              cm.replaceRange(str.trimRight(), { line: cursor.line, ch: 0 }, cursor)
              break
          }
        })
        cm.on('change', (cm, event) => {
          this.tabs.current.isModified = true
        })
        tab.editor = cm
      })
    }

    this.tabs.element.appendChild(tab.element)
    this.views.element.appendChild(view.element)
    this.tabs.value = path
  }

  /**
   * タブを閉じる
   */
  closeTab (...tabs) {
    let elem = this.tabs.current.element
    for (const tab of tabs) {
      if (tab === this.tabs.current) {
        elem = tab.element.previousElementSibling || tab.element.nextElementSibling
      }
      this.tabs.element.removeChild(tab.element)
      this.views.element.removeChild(tab.view.element)
    }
    this.tabs.value = elem ? TComponent.from(elem).value : null
  }

  /**
   * エディターの内容をIDBに保存する
   */
  async saveTab (...tabs) {
    for (const tab of tabs) {
      if (!tab.isModified) continue
      const prevFile = tab.file
      // 保存
      const file = new Blob([tab.editor.getValue()], { type: prevFile.type })
      const path = tab.path
      await idb.tx(this.dbSchema, ['files'], 'readwrite', tx => {
        return idb.cursor({
          index: tx.objectStore('files').index('path'),
          range: IDBKeyRange.only(path),
          forEach (value, cursor) {
            value.file = file
            cursor.update(value)
          }
        })
      })
      tab.isModified = false
    }
  }

  handleDragOver (event) {
    event.preventDefault()
  }

  handleDrop (event) {
    event.preventDefault()
    return this.addFile(...seq(event.dataTransfer.files).map(file => ({ path: file.name, file: new Blob([file], { type: file.type }) })))
  }

  handleKeyDown (event) {
    //console.log('KeyCode: ' + event.keyCode)
    switch (event.keyCode) {
      case 83: // s
        if (event.ctrlKey) {
          event.preventDefault()
          return this.saveTab(this.tabs.current)
        }
        break
      case 116: // F5
        event.preventDefault()
        return this.run()
    }
  }

  handleFileTreeKeyDown (event) {
    //console.log('KeyCode: ' + event.keyCode)
    switch (event.keyCode) {
      case 13: // Enter
        return this.command('open')
      case 46: // Delete
        return this.command('delete')
      case 113: // F2
        return this.command('rename')
    }
  }

  handleFileTreeDoubleClick (event) {
    if (event.target.classList.contains('expand-icon')) return // ツリーの展開アイコン
    if (!this.fileTree.current || this.fileTree.current.isExpandable) return // フォルダー
    return this.openTab(this.getFileTreePath())
  }

  async handleFileTreeContextMenu (event) {
    event.preventDefault()
    const value = await fileTreeContextMenu(event)
    if (value) await this.command(value)
  }

  /**
   * ファイルツリーで現在選択されているファイルのパスを取得
   */
  getFileTreePath (current = this.fileTree.current) {
    const path = []
    while (current !== this.fileTree) {
      path.unshift(current.text)
      current = current.parentNode
    }
    return path.join('/')
  }

  /**
   * ファイルツリーで現在選択されているファイルの親フォルダーパスを取得
   * (選択されているのがフォルダーなら自身のパス)
   */
  getFileTreeFolderPath (item = this.fileTree.current) {
    if (!item) return ''
    if (item.isExpandable === false) item = item.parentNode
    let path = this.getFileTreePath(item)
    if (path !== '') path = path + '/'
    return path
  }

  /**
   * パスからファイルツリー項目を取得
   * @param {string} path - パス
   * @return {TreeItem} - ツリー項目
   */
  getFileTreeItem (path) {
    if (!path) return this.fileTree
    return path.split('/').reduce((item, name) =>
      seq(item).find(
        cItem => cItem.text === name) ||
        this.fileTreeInsert(item, this.createFileTreeItem(name, true)
      )
    , this.fileTree)
  }

  /**
   * パスから親フォルダー項目と名前を取得
   * @param {string} path - パス
   * @return {TreeItem} - 親フォルダー
   * @return {string} - ファイル名
   */
  getFileTreeFolderAndName (path) {
    const folderPath = path.split('/')
    const name = folderPath.pop()
    const folder = this.getFileTreeItem(folderPath.join('/')) || this.fileTree
    return [folder, name]
  }

  /**
   * ファイル名からMIMEタイプを取得
   * @param {string} name - ファイル名
   * @return {string|null} - MIMEタイプ
   * TODO: sw.jsと共通化
   */
  getFileType (name) {
    const ext = name.slice(name.lastIndexOf('.') + 1)
    return {
      js: 'text/javascript',
      mjs: 'text/javascript',
      css: 'text/css',
      html: 'text/html',
      htm: 'text/html',
      json: 'application/json',
      xml: 'application/xml',
      gif: 'image/gif',
      png: 'image/png',
      jpeg: 'image/jpeg',
      jpg: 'image/jpeg',
      svg: 'image/svg+xml',
      txt: 'text/plain',
      md: 'text/markdown',
    }[ext] || null
  }

  async command (value) {
    switch (value) {
      case 'newFile':
        {
          const name = await this.inputFileName('ファイル名', '', '新規ファイル')
          if (!name) break

          const type = this.getFileType(name)
          return this.addFile({ path: this.getFileTreeFolderPath() + name, file: new Blob([''], { type }) })
        }
        break
      case 'newFolder':
        {
          const name = await this.inputFileName('フォルダー名', '', '新規フォルダー')
          if (!name) break

          return this.addFile({ path: this.getFileTreeFolderPath() + name, file: null })
        }
        break
      case 'rename':
        {
          const prevName = this.fileTree.current.text
          const isFolder = this.fileTree.current.isExpandable

          const newName = await this.inputFileName(isFolder ? 'フォルダー名' : 'ファイル名', prevName, '名前の変更')
          if (!newName) return

          let path = this.getFileTreePath(this.fileTree.current.parentNode)
          if (path !== '') path += '/'
          return this.fileListMove(path + prevName, path + newName)
        }
        break
      case 'delete':
        {
          const isFolder = this.fileTree.current.isExpandable
          if (!await confirm((isFolder ? 'フォルダー' : 'ファイル') + ' "' + this.fileTree.current.text +'" を削除しますか?')) break
          return this.deleteCurrentFileOrFolder()
        }
        break
      default:
        throw new Error('Undefiend command: ' + value)
    }
  }

  /**
   * ファイル名入力チェック
   */
  async inputFileName (isFile, defaultName, title) {
    do {
      const name = await prompt(isFile + 'を入力してください', defaultName, title)
      if (!name) return ''

      let msg = ''
      if (seq('\\/:*?"<>|').some(c => name.includes(c))) {
        msg = isFile + 'には次の文字は使えません:\n\\ / : * ? " < > |'
      } else if (name === '.' || name === '..') {
        msg = 'その' + isFile + 'を付けることはできません'
      }
      if (!msg) return name

      await alert(msg, '注意')
      defaultName = name
    } while (true)
  }

  getFileFromIdb (path) {
    return idb.tx(this.dbSchema, ['files'], 'readonly', tx => idb.cursor({
      index: tx.objectStore('files').index('path'),
      range: IDBKeyRange.only(path),
      forEach: value => value
    }))
  }

  /**
   * ファイル移動・リネーム
   */
  async fileListMove (prevPath, newPath) {
    if (prevPath === newPath) return

    if ((newPath + '/').startsWith(prevPath + '/')) {
      await alert('受け側のフォルダーは、送り側フォルダーのサブフォルダーです。', '中断')
      return
    }

    // 受け側のフォルダーに同名のファイルまたはフォルダーがある場合は中断
    if (await this.getFileFromIdb(newPath)) {
      await alert('受け側のフォルダーに同名のファイルまたはフォルダーがあります。', '中断')
      return
    }

    // IDB
    await idb.tx(this.dbSchema, ['files'], 'readwrite', tx => (
      idb.cursor({
        index: tx.objectStore('files').index('path'),
        forEach: (value, cursor) => {
          if ((value.path + '/').startsWith(prevPath + '/')) {
            const _prev = value.path
            const _new = newPath + value.path.slice(prevPath.length)

            console.log('mv ' + _prev + ' ' + _new)

            value.path = _new
            if (value.file) {
              const prevType = this.getFileType(_prev)
              const newType = this.getFileType(_new)
              if (prevType !== newType) {
                value.file = new Blob([value.file], { type: newType })
              }
            }
            cursor.update(value)

            // タブのパスを更新
            const tab = seq(this.tabs).find(tab => tab.path === _prev)
            if (tab) tab.path = _new
          }
        }
      })
    ))

    // ファイルツリー
    {
      const [folder, name] = this.getFileTreeFolderAndName(newPath)
      const item = this.getFileTreeItem(prevPath)
      item.text = name
      this.fileTreeInsert(folder, item)
    }

    //await this.updateFileTree()
  }

  fileTreeInsert (parentFolder, targetItem) {
    const fileName = targetItem.text
    const ref = seq(parentFolder).find(item => (
      targetItem.isExpandable
        ? (!item.isExpandable || item.text > fileName)
        : (!item.isExpandable && item.text > fileName)
    ))
    parentFolder.insertBefore(targetItem, ref)
    if (parentFolder.isExpandable) parentFolder.expand()
    return targetItem
  }

  async handleFileTreeMouseDown (event) {
    if (event.button === 1) return

    // ドラッグ対象
    const targetItem =
      seq(ancestorNodes(event.target))
      .map(elem => TComponent.from(elem))
      .find(item => item instanceof Tree.Item)
    if (!targetItem) return

    let shadowElem = null
    const dropRects = []
    let prevDropRect = null
    hold({
      ondragstart: (px, py, modal) => {
        // ドラッグ中の半透明アイコン作成
        shadowElem = TComponent.createElement(`
          <div style="position: absolute; text-align: center; opacity: .75;" class="flex column"></div>
        `)
        shadowElem.appendChild(targetItem.element.querySelector('.icon').cloneNode(true))
        shadowElem.appendChild(targetItem.element.querySelector('span').cloneNode(true))
        modal.appendChild(shadowElem)

        // ドロップエリアを求める
        ;(function recur (list) {
          for (const item of list) {
            const elem = item.element.firstElementChild
            dropRects.push({ item, elem, rect: elem.getBoundingClientRect() })
            if (item.isExpandable && item.isExpanded) recur(item)
          }
        })(this.fileTree)

        dropRects.push({ item: this.fileTree, elem: this.fileTree.element, rect: this.fileTree.element.getBoundingClientRect() })

        // エディタへのドロップ
        dropRects.push({ item: null, elem: this.tabViews, rect: this.tabViews.getBoundingClientRect() })

        this.fileTree.element.blur()
      },
      ondrag: (px, py) => {
        shadowElem.style.top = py - (shadowElem.clientWidth / 2) + 'px'
        shadowElem.style.left = px - (shadowElem.clientHeight / 2) + 'px'

        const dropRect = dropRects.find(({ item, rect }) => px >= rect.left && px < rect.left + rect.width && py >= rect.top && py < rect.top + rect.height)

        if (prevDropRect) prevDropRect.elem.classList.remove('drop-target')
        prevDropRect = dropRect
        if (dropRect) {
          dropRect.elem.classList.add('drop-target')
        }
      },
      ondragend: (px, py) => {
        if (prevDropRect) {
          prevDropRect.elem.classList.remove('drop-target')

          // エディターへのドロップ
          if (prevDropRect.elem === this.tabViews) {
            if (!this.fileTree.current || this.fileTree.current.isExpandable) return // フォルダー
            return this.openTab(this.getFileTreePath())
          }

          this.fileTree.focus()

          // ドロップ元とドロップ先が同じ場合は何もしない
          if (prevDropRect.item === targetItem) return

          // ファイル・フォルダ移動
          const prevName = this.getFileTreePath(targetItem)
          const newName = this.getFileTreeFolderPath(prevDropRect.item) + targetItem.text
          return this.fileListMove(prevName, newName)
        }
      },
      onerror: error => {
        this.onerror(error)
      }
    })
  }

  handleTabChange (event) {
    const tab = this.tabs.current
    if (!tab) return
    this.views.value = tab.path
    document.title = tab.path + ' - ' + this.name
    if (!tab.editor) return // CodeMirror以外 (画像)
    requestAnimationFrame(() => {
      tab.editor.refresh()
      tab.editor.focus()
    })
  }

  handleTabMouseDown (event) {
    if (event.button !== 0) return
    if (event.target.classList.contains('close-button')) {
      event.preventDefault()
      this.closeTab(TComponent.from(event.target.parentElement))
      return
    }

    // タブの入れ替え
    let rects, idx, prevTargetElem
    const updateRects = () => {
      rects = null
      requestAnimationFrame(() => {
        rects = [...seq(this.tabs).map((tab, idx) => ({ idx, element: tab.element, rect: tab.element.getBoundingClientRect() }))]
        idx = seq(this.tabs).indexOf(this.tabs.current)
      })
    }
    updateRects()
    hold({
      ondrag: (px, py) => {
        if (!rects) return
        const target = rects.find(r => px >= r.rect.left && px < r.rect.right && py >= r.rect.top && py < r.rect.bottom)
        if (target == null || target.element === this.tabs.current.element) {
          prevTargetElem = null
          return
        }
        if (prevTargetElem === target.element) return
        prevTargetElem = target.element
        this.tabs.element.insertBefore(this.tabs.current.element, target.idx < idx ? target.element : target.element.nextElementSibling)
        updateRects()
      },
      onerror: error => {
        this.onerror(error)
      }
    })
  }

  handleSplitter (event) {
    const target = event.target.previousElementSibling
    //const ox = event.pageX - window.getComputedStyle(target).width.slice(0, -2)
    const ox = event.pageX - target.style.width.slice(0, -2)
    hold({
      cursor: window.getComputedStyle(event.target).cursor,
      ondrag: px => {
        target.style.width = Math.max(0, px - ox) + 'px'
        if (this.tabs.current) this.tabs.current.editor.refresh()
      },
      onerror: error => {
        this.onerror(error)
      }
    })
  }

  handleClickMenu (event) {
    switch (event.target.dataset.key) {
      case 'load':
        this.loadProject()
        break
      case 'save':
        this.saveProject()
        break
      case 'run':
        this.run(event)
        break
    }
  }

  // 別ウィンドウで「index.html」を開く
  async run () {
    // 実行前に保存
    await Promise.all(seq(this.tabs).map(tab => this.saveTab(tab)))

    //await new Promise(resolve => setTimeout(resolve, 100))

    // index.htmlがnot foundになることがあるので対策
    //await window.navigator.serviceWorker.register('./sw.js', { type: 'module' })
    //for (const i of seq(4)) {
    //  const res = await fetch('./debug/index.html')
    //  if (res.status === 200) break
    //}

    //const handlePopupLoad = event => {
    //  if (event) event.target.removeEventListener(event.type, handlePopupLoad)
    //  console.log('onload')
    //  this.debugWindow.navigator.serviceWorker.register(app.base + 'sw.js', { type: 'module' })
    //}

    if (this.debugWindow && !this.debugWindow.closed) {
      //await this.debugWindow.fetch(this.base + 'debug/') // not foundになることがあるので対策
      await this.debugWindow.fetch(this.base + 'dummy.html') // not foundになることがあるので対策
      this.debugWindow.location.replace(this.base + 'debug/')
      //this.debugWindow.location.reload()
      //handlePopupLoad()
    } else {
      this.debugWindow = window.open(this.base + 'dummy.html', 'appWindow', 'width=400,height=400')
      this.debugWindow.onload = async function () {
        this.debugWindow.location.replace(this.base + 'debug/')
      }.bind(this)

      //await fetch(this.base + 'debug/') // not foundになることがあるので対策
      //this.debugWindow = window.open(this.base + 'debug/', 'appWindow', 'width=400,height=400')

      //await new Promise(resolve => setTimeout(resolve, 500))
      //await this.debugWindow.fetch(this.base + 'debug/') // not foundになることがあるので対策
      //this.debugWindow.location.href = this.base + 'debug/'
      //this.debugWindow.addEventListener('load', handlePopupLoad)

      // 親ウィンドウにフォーカスを戻す
      // https://stackoverflow.com/questions/2181464/i-need-to-open-a-new-window-in-the-background-with-javascript-and-make-sure-the
      //window.open().close()
    }
  }

  /**
   * 現在開かれているプロジェクトに名前をつけて保存する
   */
  saveProject () {
    const ezip = new EZip()
    return ezip.save(async function () {
      const inputFiles = []
      await idb.tx(this.dbSchema, ['files'], 'readonly', tx => (
        idb.cursor({
          index: tx.objectStore('files').index('path'),
          forEach: (value, cursor) => {
            inputFiles.push(value)
          }
        })
      ))
      return inputFiles
    }.bind(this))
  }

  /**
   * プロジェクトのZipファイルをローカルマシンから開く
   */
  async loadProject () {
    if (!await confirm('現在のプロジェクトを閉じて、別のプロジェクトを開きますか?\n(保存していないデータは失われます)')) {
      return
    }

    const ezip = new EZip()
    const files = await ezip.load()

    if (!files) return

    this.closeTab(...this.tabs)

    // 現在のファイルリストを削除
    await idb.tx(this.dbSchema, ['files'], 'readwrite', tx => (
      idb.cursor({
        index: tx.objectStore('files').index('path'),
        forEach: (value, cursor) => {
          cursor.delete()
        }
      })
    ))
    this.fileTree.textContent = ''

    this.addFile(...files)
  }

  onerror (error) {
    alert(error.message, 'エラー')
    throw error
  }
}
