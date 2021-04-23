import TComponent from '@haiix/TComponent'
import seq from '@haiix/seq'
import Tree from './Tree.js'
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
    height: 100%;
  }
  .horizontal > * {
    flex: 0 0 auto;
  }
  .horizontal > :last-child {
    flex: 1 1 auto;
  }
`)

class ContainerList extends TComponent {
  template () {
    return `
      <div id="_list"></div>
    `
  }
  constructor (attr, nodes) {
    super()
    this._items = Object.create(null)
    this._currItem = null
    for (const node of nodes) {
      node.style.display = 'none'
      this._list.appendChild(node)
      const key = node.getAttribute('data-key')
      if (key) this._items[key] = node
    }
    if (nodes.length > 0) {
      this._currItem = nodes[0]
      this._currItem.style.display = 'inline-block'
    }
    for (const [key, val] of Object.entries(attr)) {
      this._list.setAttribute(key, val)
    }
  }
  show (key) {
    this._currItem.style.display = 'none'
    this._currItem = this._items[key]
    this._currItem.style.display = 'inline-block'
  }
}




export default class App extends TComponent {
  template () {
    this.uses(Tree)
    this.uses(ContainerList)
    return `
      <div class="horizontal">
        <tree id="_tree" style="border: 1px solid #999; width: 200px;"
          onexpand="return this._handleExpand(event)"
        />
        <container-list id="_view" style="border: 1px solid #CCC;">
          <div data-key="none"></div>
          <div data-key="dblist">
            <button onclick="this._handleNewDatabaseButton(event)">新しいデータベース</button>
          </div>
          <div data-key="tblist">
            <button>新しいテーブル</button>
          </div>
        </container-list>
      </div>
    `
  }
  main () {
    const dbListTreeItem = new Tree.Item()
    dbListTreeItem.text = 'データベース'
    dbListTreeItem.key = 'dblist'

    for (const i of seq(2).map(v => v + 1)) {
      const dbTreeItem = new Tree.Item()
      dbTreeItem.text = 'database' + i
      dbListTreeItem.appendChild(dbTreeItem)

      const tableListTreeItem = new Tree.Item()
      tableListTreeItem.text = 'テーブル'
      tableListTreeItem.key = 'tblist'
      dbTreeItem.appendChild(tableListTreeItem)

      for (const j of seq(2).map(v => v + 1)) {
        const tableTreeItem = new Tree.Item()
        tableTreeItem.text = 'table' + i + j
        tableTreeItem.icon = 'insert_drive_file'
        tableTreeItem.iconColor = '#CCC'
        tableTreeItem.isExpandable = false
        tableListTreeItem.appendChild(tableTreeItem)
      }
    }

    this._tree.appendChild(dbListTreeItem)

    this._tree.onchange = event => {
      const item = event.detail
      console.log(item.key, item.text)
      switch (item.key) {
        case 'dblist':
          this._view.show('dblist')
          break
        case 'tblist':
          this._view.show('tblist')
          break
        default:
          this._view.show('none')
          break
      }
    }

    //this._tree.focus()
  }

  _handleNewDatabaseButton (event) {
    const dbname = prompt('データベース名', 'NewDatabase')
    const item = new Tree.Item()
    item.text = dbname
    item._setIndent(1)
    this._tree.current.appendChild(item)
    this._tree.current.expand()
  }

  async _handleExpand (event) {
    const item = event.detail
    switch (item.key) {
      case 'dblist':
        await new Promise(resolve => window.setTimeout(resolve, 200))
        break;
      case 'tblist':
        await new Promise(resolve => window.setTimeout(resolve, 200))
        break;
    }
  }
}
