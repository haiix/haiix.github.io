const moduleConversionRules = [
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

const base = location.href.slice(0, location.href.lastIndexOf('/'))

async function convert(req, cache) {
  if (req.url === base + '/service-worker.js') {
    const code = 'import * as index from \'./src/index.js\''
    return new Response(code, {
      headers: { 'Content-Type': 'text/javascript' }
    })
  }

  let res
  try {
    res = await fetch(req.url)
    if (res.status !== 200) return res
  } catch (error) {
    const _res = await cache.match(req)
    if (!_res) throw error
    return _res
  }

  if (req.url.slice(-4) === '.mjs' || req.url.slice(-3) === '.js') {
    const code = (await res.text()).replaceAll(/(import\s.*?\sfrom\s+['"])(.*?)(["'])/g, (...args) => {
      const src = args[2]
      for (const rule of moduleConversionRules) {
        if (!src.startsWith(rule.nameStartsWith) || !rule.url) continue
        return args[1] + rule.url(src) + args[3]
      }
      return args[1] + src + args[3]
    })
    res = new Response(code, {
      headers: { 'Content-Type': 'text/javascript' }
    })
  }
  return res
}

if ('ServiceWorkerGlobalScope' in self && self instanceof ServiceWorkerGlobalScope) {
  self.addEventListener('fetch', event => {
    event.respondWith(async function () {
      const cache = await caches.open(base)
      const req = event.request
      const res = await convert(req, cache)
      if (res.status === 200) await cache.put(req, res.clone())
      return res
    }())
  })
} else {
  ;(async function () {
    try {
      await navigator.serviceWorker.register('./service-worker.js')
      location.reload()
    } catch (error) {
      document.body.innerHTML = '<p>Service Worker is not available.</p>'
      throw error
    }
  }())
}