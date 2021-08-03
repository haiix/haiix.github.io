importScripts('../assets/moduleProxy.js')

moduleProxy.rules = [
  {
    nameStartsWith: './assets/',
    url (src) {
      return '../.' + src
    }
  },
  {
    nameStartsWith: '@haiix/',
    url (src) {
      const module = src.slice(this.nameStartsWith.length)
      return `https://raw.githubusercontent.com/haiix/${module}/master/${module}.mjs`
    }
  },
  {
    nameStartsWith: '@zip.js/',
    url (src) {
      const module = src.slice(this.nameStartsWith.length)
      return `https://raw.githubusercontent.com/gildas-lormeau/${module}/master/index.js`
      // return `https://unpkg.com/${src}@2.3.8/index.js`
      // return `https://cdn.jsdelivr.net/npm/${src}`
      // return `https://cdn.skypack.dev/${src}`
    }
  }
]
