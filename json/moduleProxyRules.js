importScripts('../assets/moduleProxy.js')

moduleProxy.rules = [
  {
    nameStartsWith: '/assets/',
    url (src, base) {
      return base + '..' + src
    }
  },
  {
    nameStartsWith: '@haiix/',
    url (src, base) {
      const module = src.slice(this.nameStartsWith.length)
      return base + `../${module}/${module}.mjs`
    }
  },
  {
    nameStartsWith: 'custom-event-polyfill',
    url (src) {
      return `https://raw.githubusercontent.com/krambuhl/custom-event-polyfill/master/custom-event-polyfill.js`
    }
  }
]
