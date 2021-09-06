importScripts('../../assets/moduleProxy.js')

moduleProxy.rules = [
  {
    nameStartsWith: '@haiix/',
    url (src, base) {
      const module = src.slice(this.nameStartsWith.length)
      return base + `../../${module}/${module}.mjs`
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
