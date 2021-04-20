class Style {
  constructor (text, options = null) {
    this.elem = document.createElement('style')
    this.elem.textContent = text
    if (!(options && options.disabled)) this.enable()
  }

  enable () {
    document.head.appendChild(this.elem)
  }

  disable () {
    document.head.removeChild(this.elem)
  }
}

export default function style (text, options = null) {
  return new Style(text, options)
}
