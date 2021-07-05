class Style {
  constructor (text, options) {
    this._elem = document.createElement('style')
    this._elem.textContent = text
    if (!(options && options.disabled)) this.enable()
  }

  enable () {
    document.head.appendChild(this._elem)
  }

  disable () {
    document.head.removeChild(this._elem)
  }
}

export default function style (text, options = null) {
  return new Style(text, options)
}
