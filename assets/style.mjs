class Style {
  constructor (text) {
    this.elem = document.createElement('style')
    this.elem.textContent = text
    this.enable()
  }

  enable () {
    document.head.appendChild(this.elem)
  }

  disable () {
    document.head.removeChild(this.elem)
  }
}

export default function style (text) {
  return new Style(text)
}
