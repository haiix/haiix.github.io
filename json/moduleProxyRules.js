importScripts('../assets/moduleProxy.js')

moduleProxy.rules = [
  {
    nameStartsWith: '@haiix/',
    url (src) {
      const module = src.slice(7)
      return `https://raw.githubusercontent.com/haiix/${module}/master/${module}.mjs`
    }
  },
  {
    nameStartsWith: 'custom-event-polyfill',
    url (src) {
      return `https://raw.githubusercontent.com/krambuhl/custom-event-polyfill/master/custom-event-polyfill.js`
    }
  }
]
