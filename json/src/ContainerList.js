import TComponent from '@haiix/TComponent'

export default class ContainerList extends TComponent {
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
      this._currItem.style.display = ''
    }
    for (const [key, val] of Object.entries(attr)) {
      this._list.setAttribute(key, val)
    }
  }
  show (key) {
    this._currItem.style.display = 'none'
    this._currItem = this._items[key]
    this._currItem.style.display = ''
  }
}
