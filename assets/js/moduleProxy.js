;(function () {
  'use strict'
  var currentScript = null
  if (self.document) currentScript = document.querySelector('script:last-child').src
  self.moduleProxy = {
    base: location.href.slice(0, location.href.split('#')[0].lastIndexOf('/')) + '/',
    rules: [],
    cache: {
      status: 0,
      resolves: [],
      result: null,
      get: function () {
        var _self = this
        if (_self.status === 0) {
          _self.status = 1
          caches.open(self.moduleProxy.base).then(function (_cache) {
            _self.result = _cache
            _self.status = 2
            for (var i = 0; i < _self.resolves.length; i++) {
              var resolve = _self.resolves[i]
              resolve(_cache)
            }
            _self.resolves.length = 0
          })
        }
        if (_self.status === 1) {
          return new Promise(function (resolve) {
            _self.resolves.push(resolve)
          })
        } else {
          return Promise.resolve(_self.result)
        }
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
              return arguments[1] + rule.url(src, self.moduleProxy.base) + arguments[3]
            }
            return arguments[1] + src + arguments[3]
          })
          return new Response(code, {
            headers: { 'Content-Type': 'text/javascript' }
          })
        })
      }).then(function (res) {
        if (res.status !== 200) return res
        return self.moduleProxy.cache.get().then(function (cache) {
          cache.put(req, res.clone())
          return res
        })
      }).catch(function (error) {
        return self.moduleProxy.cache.get().then(function (cache) {
          return cache.match(req)
        })
      })
    },
    register: function (settings) {
      if (!self.caches) {
        self.moduleProxy.rulesUrl = settings.rules
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
      var settingsUrl = self.moduleProxy.base + self.moduleProxy.rulesUrl
      return self.moduleProxy.cache.get().then(function (_cache) {
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
    self.moduleProxy.cache.get()
    self.addEventListener('fetch', function (event) {
      event.respondWith(function () {
        //console.debug('proxy fetched', event.request.url)
        return self.moduleProxy.convert(event.request)
      }())
    })
  }
}());
