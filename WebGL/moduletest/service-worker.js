if (self && self.constructor && self.constructor.name === 'ServiceWorkerGlobalScope') {
  const base = location.href.slice(0, location.href.lastIndexOf('/'))
  self.addEventListener('fetch', event => {
    event.respondWith(async function () {
      const url = event.request.url
      if (url.slice(-4) === '.mjs' || url.slice(-3) === '.js') {
        let code = ''
        if (url === base + '/service-worker.js') {
          code = `
            import App from './src/App.mjs'
            const app = new App()
            document.body.appendChild(app.element)
            if (app.init) app.init()
            if (app.loop) {
              ;(function loop (t) {
                requestAnimationFrame(loop)
                app.loop(t)
              }(0))
            }
            window.app = app
          `
        } else {
          const res = await fetch(url)
          if (res.status !== 200) return res
          code = await res.text()
          //code = code.replaceAll(/((import\s.*?\sfrom\s)['"]((@(\w*)\/)?(\w*))["'])/g, `$2'${base}/src/modules/$6.mjs'`)
          code = code.replaceAll(/((import\s.*?\sfrom\s)['"]((@(\w*)\/)?(\w*))["'])/g, `$2'https://raw.githubusercontent.com/$5/$6/master/$6.mjs'`)
        }
        return new Response(code, {
          headers: { 'Content-Type': 'text/javascript' }
        })
      } else {
        return await fetch(event.request)
      }
    }())
  })
} else if (self && self.constructor && self.constructor.name === 'Window') {
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