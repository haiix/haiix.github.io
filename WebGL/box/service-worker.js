const moduleTransformRules = [
  {
    startsWith: '@haiix/',
    url (src) {
      const module = src.slice(7)
      return `https://raw.githubusercontent.com/haiix/${module}/master/${module}.mjs`
    }
  },
  {
    startsWith: 'gl-matrix/cjs/',
    url (src) {
      const module = src.slice(14)
      return `https://raw.githubusercontent.com/toji/gl-matrix/master/src/${module}`
    }
  }
]

const bootCode = `
  import App from './src/App.mjs'
  const app = new App()
  document.body.appendChild(app.element)
  if (app.main) app.main()
  if (app.loop) {
    ;(function loop (t) {
      requestAnimationFrame(loop)
      app.loop(t)
    }(0))
  }
  window.app = app
`

if ('ServiceWorkerGlobalScope' in self && self instanceof ServiceWorkerGlobalScope) {
  const base = location.href.slice(0, location.href.lastIndexOf('/'))
  self.addEventListener('fetch', event => {
    event.respondWith(async function () {
      const url = event.request.url
      if (url.slice(-4) === '.mjs' || url.slice(-3) === '.js') {
        let code = ''
        if (url === base + '/service-worker.js') {
          code = bootCode
        } else {
          const res = await fetch(url)
          if (res.status !== 200) return res
          code = await res.text()
          code = code.replaceAll(/(import\s.*?\sfrom\s+['"])(.*?)(["'])/g, (...args) => {
            const src = args[2]
            for (const rule of moduleTransformRules) {
              if (!src.startsWith(rule.startsWith) || !rule.url) continue
              return args[1] + rule.url(src) + args[3]
            }
            return args[1] + src + args[3]
          })
        }
        return new Response(code, {
          headers: { 'Content-Type': 'text/javascript' }
        })
      } else {
        return await fetch(event.request)
      }
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