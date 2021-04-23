;(function () {
  'use strict'
  var currentScript = null
  if (self.document) currentScript = document.querySelector('script:last-child').src
  self.moduleProxy = {
    base: location.href.slice(0, location.href.split('#')[0].lastIndexOf('/')) + '/',
    rules: [],
    cache: null,
    getCache: function () {
      if (!self.moduleProxy.cache) {
        return caches.open(self.moduleProxy.base).then(function (_cache) {
          self.moduleProxy.cache = _cache
          return _cache
        })
      } else {
        return Promise.resolve(self.moduleProxy.cache)
      }
    },
    convert: function (req) {
      return fetch(req.url).then(function (res) {
        if (res.status !== 200) return res
        if (req.url.slice(-4) !== '.mjs' && req.url.slice(-3) !== '.js') return res
        return res.text().then(function (_text) {
          var code = _text.replaceAll(/(import\s.*?\sfrom\s+['"])(.*?)(["'])/g, function () {
            var src = arguments[2]
            for (var i = 0; i < self.moduleProxy.rules.length; i++) {
              var rule = self.moduleProxy.rules[i]
              if (!src.startsWith(rule.nameStartsWith) || !rule.url) continue
              return arguments[1] + rule.url(src) + arguments[3]
            }
            return arguments[1] + src + arguments[3]
          })
          return new Response(code, {
            headers: { 'Content-Type': 'text/javascript' }
          })
        })
      }).then(function (res) {
        if (res.status !== 200) return res
        return self.moduleProxy.getCache().then(function (cache) {
          cache.put(req, res.clone())
          return res
        })
      }).catch(function (error) {
        return self.moduleProxy.getCache().then(function (cache) {
          return cache.match(req)
        })
      })
    },
    register: function (settings) {
      if (!self.caches) {
        moduleProxy.rulesUrl = settings.rules
        var script = document.createElement('script')
        script.type = 'module'
        script.src = settings.import
        document.head.appendChild(script)
        var script = document.createElement('script')
        script.src = currentScript.slice(0, currentScript.lastIndexOf('/')) + '/nomodule.js'
        document.head.appendChild(script)
        return
      }
      var cache = null
      var settingsUrl = self.moduleProxy.base + 'moduleProxySettings.json'
      return self.moduleProxy.getCache().then(function (_cache) {
        cache = _cache
        return cache.match(settingsUrl)
      }).then(function (_res) {
        if (_res) {
          //console.debug('alrady registered')
          return _res.json().then(function (settings) {
            if (settings.import) return eval('import(self.moduleProxy.base + settings.import)')
          }).catch(function (error) {
            document.body.insertAdjacentHTML('afterbegin', '<pre>' + (error.stack || error.message) + '</pre>')
            throw error
          })
        } else {
          return self.navigator.serviceWorker.register(settings.rules).then(function () {
            //console.debug('registered!')
            return cache.put(settingsUrl, new Response(JSON.stringify(settings)))
          }).then(function () {
            location.reload()
            return new Promise(function () {})
          })
        }
      })
    }
  }
  if ('ServiceWorkerGlobalScope' in self && self instanceof ServiceWorkerGlobalScope) {
    self.moduleProxy.getCache()
    self.addEventListener('fetch', function (event) {
      event.respondWith(function () {
        //console.debug('proxy fetched', event.request.url)
        return self.moduleProxy.convert(event.request)
      }())
    })
  }
}());
