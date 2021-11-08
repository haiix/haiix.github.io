import TComponent from '/assets/TComponent.mjs'
import style from '/assets/style.mjs'
import { Dialog, createDialog, openFile, Prompt } from '/assets/ui/dialog.mjs'
//import * as idb from '/assets/idb.mjs'

const EXT = '.zip'

// TODO ちゃんとインスタンスに保存する
let opendFileName = ''
let opendFilePassword = ''

const saveDialog = createDialog(class extends Dialog {
  constructor (attr = {}, nodes = []) {
    super(attr, nodes)
    this.form.name.value = attr.arguments[1]
    const password = attr.arguments[2]
    if (password) {
      this.form['confirm-password'].value = password
      this.form.password.value = password
      this.details.open = true
    }
  }

  titleTemplate () {
    return '保存'
  }

  bodyTemplate () {
    const ukey = 'my-save-dialog-body'
    style(`
      .${ukey} label {
        display: block;
        white-space: nowrap;
        height: 24px;
      }
      .${ukey} label > span {
        display: inline-block;
        width: 100px;
      }
      .${ukey} details {
        margin-top: 8px;
      }
      .${ukey} summary {
        height: 24px;
        color: #08E;
        cursor: pointer;
      }
      .${ukey} summary:hover {
        text-decoration: underline;
      }
    `)
    return `
      <form id="form" class="${ukey}" onsubmit="event.preventDefault()">
        <label>
          <span>ファイル名:</span>
          <input name="name" />
        </label>
        <details id="details">
          <summary tabindex="-1">オプション</summary>
          <label>
            <span>パスワード:</span>
            <input type="password" name="password" autocomplete="none" />
          </label>
          <label>
            <span>パスワード(確認):</span>
            <input type="password" name="confirm-password" autocomplete="none" />
          </label>
        </details>
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

export const passwordPrompt = createDialog(class extends Prompt {
  bodyTemplate () {
    return `
      <form onsubmit="event.preventDefault()">
        <p id="text" style="white-space: pre-wrap;"></p>
        <input id="input" type="password" name="password" autocomplete="none" />
      </form>
    `
  }
})

export default class EZip {
  async save (callback) {
    const formValues = await saveDialog('', opendFileName, opendFilePassword)
    if (!formValues) return

    if (formValues.password !== formValues['confirm-password']) {
      throw new Error('パスワードが一致しません')
    }

    const zipFileName = (formValues.name || 'untitled') + (formValues.name.slice(-4) === EXT ? '' : EXT)
    const zipFilePassword = formValues.password

    const inputFiles = await callback()

    const zipBlob = await this.createEncryptedZipBlob(zipFilePassword, inputFiles)

    this.downloadFile(zipFileName, zipBlob)

    opendFileName = zipFileName
    opendFilePassword = zipFilePassword
  }

  async createEncryptedZipBlob (password, inputFiles) {
    const innerZipBlob = await this.createZip(inputFiles, { level: password ? 0 : 5 })
    return password ? await this.createZip([{ path: 'encrypted.zip', file: innerZipBlob }], { password, level: 5 }) : innerZipBlob
  }

  async createZip (inputFiles, options) {
    const blobWriter = new zip.BlobWriter('application/zip')
    const writer = new zip.ZipWriter(blobWriter, options)
    for (const { file, path } of inputFiles) {
      const foptions = {}
      foptions.directory = !file
      await writer.add(path, file ? new zip.BlobReader(file) : null, foptions)
    }
    await writer.close()
    return await blobWriter.getData()
  }

  async downloadFile (name, blob) {
    const url = URL.createObjectURL(blob)
    TComponent.createElement(`<a href="${url}" download="${name}"></a>`).click()
    URL.revokeObjectURL(url)
  }



  async load (event) {
    const zipFile = await openFile(EXT)
    if (!zipFile) return

    opendFileName = zipFile.name

    return await this.readEncryptedZipFile(zipFile)
  }

  async readEncryptedZipFile (zipFile) {
    try {
      const files = await this.readZip(zipFile)
      return files.length === 1 && files[0].path === 'encrypted.zip' ? await this.readZip(files[0].file) : files
    } catch (error) {
      throw new Error('ファイルを開けません:\n' + error.message)
    }
  }

  async readZip (zipFile, options = {}) {
    const reader = new zip.ZipReader(new zip.BlobReader(zipFile))
    const entries = await reader.getEntries()
    return await Promise.all(
      entries.map(async function (entry) {
        if (!options.password && entry.encrypted) {
          const password = await passwordPrompt('パスワードを入力してください。')
          if (password == null) return
          options.password = password
          opendFilePassword = password
        }

        const path = entry.filename.slice(-1) === '/' ? entry.filename.slice(0, -1) : entry.filename

        const file = entry.directory ? null : await entry.getData(new zip.BlobWriter(this.getMimeFromExt(entry.filename)), options)
        return { path, file }
      }.bind(this))
    )
  }

  // TODO 共通化
  getMimeFromExt (fileName) {
    const ext = fileName.slice(fileName.lastIndexOf('.') + 1)
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
}
