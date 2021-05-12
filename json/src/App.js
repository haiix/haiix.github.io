import TComponent from '@haiix/TComponent'
import style from '../../assets/style.mjs'
import { TUl, TLi } from './List.js'
import Tree from './Tree.js'

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
  .tab {
    position: relative;
    border-bottom: 1px solid #CCC;
    align-items: flex-end;
    background: #FFF;
    top: -1px;
  }
  .tab > * {
    position: relative;
    background: #EEE;
    border: 1px solid #CCC;
    padding: 2px 5px;
    top: 1px;
    margin-right: -1px;
  }
  .tab > :not(.current):hover {
    background: #DEF;
  }
  .tab > .current {
    background: #FFF;
    padding: 3px 5px 4px;
    border-bottom: none;
  }
  textarea {
    width: 100%;
    height: 100%;
    margin: 0;
    padding: 4px;
    box-sizing: border-box;
    border: none;
    outline: none;
    resize: none;
  }
  .tree {
    width: 100%;
    height: 100%;
  }
`)

export default class App extends TComponent {
  template () {
    this.uses(TUl, TLi, Tree)
    return `
      <t-ul class="vertical">
        <t-ul id="_tab" class="horizontal tab" onchange="this._handleChangeTab(event)">
          <t-li value="text" current>テキスト</t-li>
          <t-li value="tree">ツリー</t-li>
        </t-ul>
        <t-ul id="_view" parent-class="stretch" class="overlap">
          <t-li value="text" current>
            <textarea id="_textarea">{"a":1,"b":{"c":2,"d":{"e":3,"f":4}}}</textarea>
          </t-li>
          <t-li value="tree">
            <Tree id="_tree" class="tree" onexpand="this._handleTreeExpand(event)" />
          </t-li>
        </t-ul>
      </t-ul>
    `
  }
  constructor () {
    super()
    this.rootObj = null
  }
  updateTree (obj) {
    this.rootObj = obj
    this._tree._list.innerHTML = ''

    const item = this._createChildItem('ルート', obj)
    item.icon = 'desktop_windows'
    item.iconColor = '#69C'
    this._tree.appendChild(item)
    if (item.isExpandable) item.expand()
  }
  _handleChangeTab (event) {
    const value = event.detail.value;
    if (value === 'tree') {
      try {
        this.updateTree(JSON.parse(this._textarea.value))
      } catch (error) {
        alert(error.message)
        this._tab.value = 'text'
        return
      }
    }
    this._view.value = value
  }
  _handleTreeExpand (event) {
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
    const item = new Tree.Item()
    const _val = (typeof val === 'string') ? '"' + val + '"' : val
    item.text = key + (isExpandable ? '' : ': ' + _val)
    item.key = key
    item.isLoaded = false
    item.isExpandable = isExpandable
    return item
  }
}
