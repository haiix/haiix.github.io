import TComponent from '@haiix/TComponent'
import Tree from './Tree.js'
import ContainerList from './ContainerList.js'
import style from '../../assets/style.mjs'

style(`
  html, body {
    width: 100%;
    height: 100%;
    margin: 0;
    padding: 0;
    font-family: "Meiryo UI";
    font-size: 9pt;
    background: #FFF;
    color: #000;
  }
  .horizontal {
    display: flex;
    flex-flow: row nowrap;
    width: 100%;
    height: 100%;
  }
  .horizontal > * {
    flex: 0 0 auto;
  }
  .horizontal > :last-child {
    flex: 1 1 auto;
  }
  .vertical {
    display: flex;
    flex-flow: column nowrap;
    width: 100%;
    height: 100%;
  }
  .vertical > * {
    flex: 0 0 auto;
  }
  .vertical > :last-child {
    flex: 1 1 auto;
  }
`)

export default class App extends TComponent {
  template () {
    this.uses(Tree, ContainerList)
    style(`
      .app-view {
        overflow: hidden;
      }
      .app-view > * {
        box-sizing: border-box;
        width: 100%;
        height: 100%;
      }
      .app textarea {
        resize: none;
      }
      .app-tabs > a {
        display: inline-block;
        padding: 4px;
      }
      .app-tabs > .current {
        font-weight: bold;
      }
    `)
    return `
      <div class="app vertical">
        <div onclick="this.handleClickTab(event)" id="tabs" class="app-tabs">
          <a href="#text" class="current">テキスト</a>
          |
          <a href="#tree">ツリー</a>
        </div>
        <ContainerList id="view" class="app-view">
          <textarea id="text" data-key="text">{"a":1,"b":{"c":2,"d":{"e":3,"f":4}}}</textarea>
          <Tree id="tree" data-key="tree" style="border: 1px solid #999;" onexpand="this.handleTreeExpand(event)" />
        </ContainerList>
      </div>
    `
  }
  constructor () {
    super()
    this.rootObj = null
  }
  handleClickTab (event) {
    event.preventDefault()
    if (event.target.tagName !== 'A') return
    const key = event.target.hash.slice(1);
    if (key === 'tree') {
      try {
        const obj = JSON.parse(this.text.value)
        this.updateTree(obj)
      } catch (error) {
        alert(error.message)
        return
      }
    }
    for (const tab of this.tabs.childNodes) {
      if (tab.classList) tab.classList.remove('current')
    }
    event.target.classList.add('current')
    this.view.show(key)
  }
  updateTree (obj) {
    this.rootObj = obj
    this.tree._list.innerHTML = ''

    const item = this._createChildItem('ルート', obj)
    item.icon = 'desktop_windows'
    item.iconColor = '#69C'
    this.tree.appendChild(item)
    if (item.isExpandable) item.expand()
  }
  handleTreeExpand (event) {
    const item = event.detail
    if (item.isLoaded) return

    const path = []
    {
      let curr = item
      while (curr.text) {
        path.unshift(curr.key)
        curr = curr.parentNode
      }
    }
    path.shift()

    let curr = this.rootObj
    for (const key of path) {
      curr = curr[key]
    }

    if (typeof curr !== 'object' || curr == null) {
      throw new Error('Invalid')
    }

    const ite = Array.isArray(curr) ? curr.entries() : Object.entries(curr)
    for (const [key, val] of ite) {
      const citem = this._createChildItem(key, val)
      if (!citem.isExpandable) {
        citem.icon = 'insert_drive_file'
        citem.iconColor = '#CCC'
      }
      item.appendChild(citem)
    }

    item.isLoaded = true
  }
  _createChildItem (key, val) {
    const isExpandable = typeof val === 'object' && val != null
    const citem = new Tree.Item()
    const _val = (typeof val === 'string') ? '"' + val + '"' : val
    citem.text = key + (isExpandable ? '' : ': ' + _val)
    citem.key = key
    citem.isLoaded = false
    citem.isExpandable = isExpandable
    return citem
  }
}
