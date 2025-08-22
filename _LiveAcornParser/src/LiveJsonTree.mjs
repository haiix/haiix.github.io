import TTree from '/assets/ui/TTree.mjs'
import style from '/assets/style.mjs'

const ukey = 't-component-ui-tree'

style(`
  .${ukey} .expand-icon {
    opacity: 1;
    position: absolute;
    color: #fff;
    top: 3px;
  }
  .${ukey} .icon {
    width: 16px;
    text-align: center;
  }
`)

function typeOf (obj) {
  return Object.prototype.toString.call(obj).slice(8, -1)
}

class Item extends TTree.Item {
  constructor (...args) {
    super(...args)
    this.key = ''
    this.value = ''
    this._type = ''
  }

  get type () {
    return this._type
  }

  set type (v) {
    this._type = v
    this.iconColor = {
        Object: '#33c',
        Array: '#c33',
        Number: '#fc3',
        String: '#696',
        Boolean: '#69f',
        Null: '#999'
      }[v] ?? '#000'
    this.icon = 'square'
    this._icon.style.fontSize = v === 'Array' || v === 'Object' ? null : '10px'
  }

  updateText () {
    if (this.type === 'Object' || this.type === 'Array') {
      this.text = this.key
      this.isExpandable = true
    } else {
      this.text = this.key + ': ' + this.value
      this.isExpandable = false
    }
  }

  set (key, value, type) {
    this.key = key
    this.value = type === 'String' ? '"' + value + '"' : value
    this.type = type
    this.updateText()
  }
}

export default class LiveJsonTree extends TTree {
  template (...args) {
    const retVal = super.template(...args)
    this.tagName = 'live-json-tree'
    return retVal
  }

  constructor (...args) {
    super(...args)
    this.root = this.appendChild(new Item())
    this.update(null)
  }

  update (value) {
    this.recur('root', value, this.root)
  }

  recur (key, value, item) {
    const type = typeOf(value)
    if (type === 'Array' || type === 'Object') {
      if (item.type === type) {
        if (type === 'Object') {
          for (const child of [...item]) {
            if (!(child.key in value)) item.removeChild(child)
          }
          let curr = item.firstChild
          for (const [k, v] of this.getIterator(value, type)) {
            while (curr != null && curr.key < k) {
              curr = curr?.nextSibling
            }
            if (curr != null && curr.key === k) {
              this.recur(k, v, curr)
            } else {
              const child = new Item()
              item.insertBefore(child, curr)
              curr = child
              this.recur(k, v, curr)
              curr.expand()
            }
            curr = curr?.nextSibling
          }
        } else {
          let curr = item.firstChild
          for (const [i, v] of this.getIterator(value, type)) {
            if (item.childNodes.length !== value.length) {
              const res = this.isAlmostTheSame(v, curr?.value)
              if (!res && item.childElementCount < value.length) {
                const child = new Item()
                item.insertBefore(child, curr)
                curr = child
              } else if (!res && item.childElementCount > value.length) {
                const next = curr.nextSibling
                item.removeChild(curr)
                curr = next
              }
            }
            this.recur(i, v, curr)
            curr = curr.nextSibling
          }
          while (item.childElementCount > value.length) {
            item.removeChild(item.lastChild)
          }
        }
        item.set(key, value, type)
      } else {
        item.textContent = ''
        for (const [k, v] of this.getIterator(value, type)) {
          const child = new Item()
          item.appendChild(child)
          this.recur(k, v, child)
        }
        item.set(key, value, type)
        item.expand()
      }
    } else {
      item.textContent = ''
      item.set(key, value, type)
    }
  }

  getIterator (obj, type) {
    return type === 'Object' ? Object.entries(obj).sort((a, b) => a[0] < b[0] ? -1 : 1) : obj.entries()
  }

  isAlmostTheSame (obj1, obj2) {
    const type = typeOf(obj1)
    if (type !== typeOf(obj2)) return false
    if (type === 'Array' || type === 'Object') {
      if (type === 'Array' && obj1.length !== obj2.length) return false
      if (type === 'Object' && Object.keys(obj1).length !== Object.keys(obj2).length) return false
      for (const [k, v1] of this.getIterator(obj1, type)) {
        const v2 = obj2[k]
        const t = typeOf(v1)
        if (t !== typeOf(v2)) return false
        if (t !== 'Array' && t !== 'Object' && v1 !== v2) return false
      }
      return true
    } else {
      return obj1 === obj2
    }
  }
}
