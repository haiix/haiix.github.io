import TComponent from '@haiix/TComponent'
import style from '/assets/style.mjs'
import * as styleDef from '/assets/styledef.mjs'
import TTree from '/assets/ui/TTree.mjs'
import { TUl, TLi } from './List.js'
import * as customEventPolyfill from 'custom-event-polyfill'

style(styleDef.ui, styleDef.fullscreen, styleDef.flex)

style(`
  ul.app, .app ul {
    margin: 0;
    padding: 0;
    list-style-type: none;
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

  .tree small {
    font-size: inherit;
    color: #939;
  }
  .tree li.expanded > div > span > small {
    display: none;
  }

  .overlap {
    overflow: auto;
  }
  .overlap > * {
    display: none;
  }
  .overlap > .current {
    display: block;
    width: 100%;
    height: 100%;
  }
`)

export default class App extends TComponent {
  template () {
    this.uses(TUl, TLi, TTree)
    return `
      <div class="app fullscreen flex composition column">
        <t-ul id="_tab" class="flex row tab" onchange="this._handleChangeTab(event)">
          <t-li value="text" current>テキスト</t-li>
          <t-li value="tree">ツリー</t-li>
        </t-ul>
        <t-ul id="_view" class="flex fit overlap">
          <t-li value="text" current>
            <textarea id="_textarea">{"a":1,"b":{"c":2,"d":{"e":3,"f":4}}}</textarea>
          </t-li>
          <t-li value="tree">
            <t-tree id="_tree" class="tree" onexpand="this._handleTreeExpand(event)" />
          </t-li>
        </t-ul>
      </div>
    `
  }

  constructor () {
    super()
    this.rootObj = null
  }

  updateTree (obj) {
    this.rootObj = obj
    this._tree.textContent = ''

    const item = this._createTreeItem('ルート', obj, true)
    this._tree.appendChild(item)
    if (item.isExpandable) item.expand()
    this._tree.current = item
  }

  _handleChangeTab (event) {
    const value = event.detail.value
    if (value === 'tree') {
      try {
        this.updateTree(JSON.parse(this._textarea.value))
        requestAnimationFrame(() => this._tree.focus())
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
      item.appendChild(this._createTreeItem(key, val))
    }

    item.isLoaded = true
  }

  _createTreeItem (key, val, isRoot = false) {
    const isExpandable = typeof val === 'object' && val != null
    const item = new TTree.Item()
    if (Array.isArray(val)) {
      item.html = key + '<small>: [ ' + val.map(this._toS).join(', ') + ' ]</small>'
    } else if (isExpandable) {
      item.html = key + '<small>: { ' + Object.entries(val).map(([k, v]) => k + ': ' + this._toS(v)).join(', ') + ' }</small>'
    } else {
      item.html = key + '<small>: ' + this._toS(val) + '</small>'
    }
    item.key = key
    item.isLoaded = false
    item.isExpandable = isExpandable
    if (isRoot) {
      item.icon = 'desktop_windows'
      item.iconColor = '#69C'
    } else if (!isExpandable) {
      item.icon = 'insert_drive_file'
      item.iconColor = '#CCC'
    }
    return item
  }

  _toS (val) {
    if (Array.isArray(val)) {
      return '[ ... ]'
    }
    if (typeof val === 'object' && val != null) {
      return '{ ... }'
    }
    if (typeof val === 'string') {
      return '"' + val + '"'
    }
    return '' + val
  }
}
