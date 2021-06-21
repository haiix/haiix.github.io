importScripts('../../../assets/moduleProxy.js')

moduleProxy.rules = [
  {
    nameStartsWith: '@haiix/',
    url (src) {
      const module = src.slice(7)
      return `https://raw.githubusercontent.com/haiix/${module}/master/${module}.mjs`
    }
  },
  {
    nameStartsWith: 'gl-matrix/cjs/',
    url (src) {
      const module = src.slice(14)
      return `https://raw.githubusercontent.com/toji/gl-matrix/master/src/${module}`
    }
  }
]
