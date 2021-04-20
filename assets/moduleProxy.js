;(function () {
  'use strict'
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
      var cache = null
      return self.moduleProxy.getCache().then(function (_cache) {
        cache = _cache
        return fetch(req.url)
      }).then(function (res) {
        if (res.status !== 200) return res
        if (req.url.slice(-4) === '.mjs' || req.url.slice(-3) === '.js') {
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
            res = new Response(code, {
              headers: { 'Content-Type': 'text/javascript' }
            })
            cache.put(req, res.clone())
            return res
          })
        } else {
          cache.put(req, res.clone())
          return res
        }
      }).catch(function (error) {
        return cache.match(req)
      })
    },
    register: function (settings) {
      var cache = null
      var settingsUrl = self.moduleProxy.base + 'moduleProxySettings.json'
      self.moduleProxy.getCache().then(function (_cache) {
        cache = _cache
        return cache.match(settingsUrl)
      }).then(function (_res) {
        if (_res) {
          //console.debug('alrady registered')
          _res.json().then(function (settings) {
            return import(self.moduleProxy.base + settings.load)
          }).catch(function (error) {
            document.body.insertAdjacentHTML('afterbegin', '<pre>' + (error.stack || error.message) + '</pre>')
            throw error
          })
        } else {
          self.navigator.serviceWorker.register(settings.rules).then(function () {
            //console.debug('registered!')
            return cache.put(settingsUrl, new Response(JSON.stringify(settings)))
          }).then(function () {
            location.reload()
          })
        }
      })
    }
  }
  if ('ServiceWorkerGlobalScope' in self && self instanceof ServiceWorkerGlobalScope) {
    self.addEventListener('fetch', function (event) {
      event.respondWith(function () {
        console.debug('proxy fetched', event.request.url)
        return self.moduleProxy.convert(event.request)
      }())
    })
  }
}());
