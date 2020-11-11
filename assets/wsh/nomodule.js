!function () {
  'use strict';

  var currentPath = path_dirname(document.head.lastChild.src);
  var babelStandalone = currentPath + '/babel-polyfill-6.26.0.min.js';
  var babelPolyfill = currentPath + '/babel-standalone-6.26.0.min.js';

  var transformOptions = {presets: ['es2015', 'es2016', 'es2017']};

  var FileSystemObject = new ActiveXObject('Scripting.FileSystemObject');
  var Stream = new ActiveXObject('ADODB.Stream');
  Stream.Charset = 'UTF-8';

  function path_normalize(path) {
    var src = path.split('/'), dst = [], i = 0, val;
    while ((val = src[i++]) != null) {
      if (val === '' || val === '.') continue;
      if (val === '..') dst.pop();
      else dst.push(val);
    }
    return (path[0] === '/' ? '/' : './') + dst.join('/');
  }

  function path_dirname(path) {
    return path.slice(0, path.lastIndexOf('/'));
  }

  function readFile(base, path) {
    var curr = base + '/' + path;
    if (!FileSystemObject.FileExists(curr)) return null;
    try {
      Stream.Open();
      Stream.LoadFromFile(curr);
      return Stream.ReadText();
    } finally {
      Stream.Close();
    }
  }

  function writeFile(base, path, text) {
    var names = path.split('/');
    var fileName = names.pop();
    var curr = base;
    for (var i = 0; i < names.length; i++) {
      curr += '/' + names[i];
      if (!FileSystemObject.FolderExists(curr)) FileSystemObject.CreateFolder(curr);
    }
    curr += '/' + fileName;
    try {
      Stream.Open();
      Stream.WriteText(text);
      Stream.SaveToFile(curr, 2);
    } finally {
      Stream.Close();
    }
  }

  function getFileInfo(base, path) {
    var file = FileSystemObject.GetFile(base + '/' + path);
    return {
      lastModified: new Date(file.DateLastModified).getTime(),
      size: Number(file.Size)
    };
  }

  var filePath = location.pathname.slice(1).replace(/\\/g, '/')
  var fileName = '.' + filePath.slice(filePath.lastIndexOf('/'));
  var basedir = path_dirname(filePath);
  var currdir = '.';
  var cache = {};
  var cacheS = JSON.parse(readFile(basedir, 'data/cache/nomodule/scripts.json')) || {};
  var cacheSModified = false;
  function require(path) {
    path = path_normalize(currdir + '/' + path);
    if (!cache[path]) {
      var info = getFileInfo(basedir, path);
      if (!cacheS[path] || cacheS[path].lastModified !== info.lastModified || cacheS[path].size !== info.size) {
        var text = readFile(basedir, path);
        if (text == null) throw new Error('File not exists: ' + path);
        info.code = '\'use strict\';var exports={};' + Babel.transform(text, transformOptions).code + ';return exports';
        cacheS[path] = info;
        cacheSModified = true;
      }
      var prevdir = currdir;
      currdir = path_dirname(path);
      cache[path] = new Function(cacheS[path].code)();
      currdir = prevdir;
    }
    return cache[path];
  }

  function loadScript(url, callback) {
    var script = document.createElement('script');
    script.onload = function (event) {
      document.head.removeChild(script);
      callback();
    };
    script.onerror = function (event) {
      throw new Error('Load faild: ' + url);
    };
    script.src = url;
    document.head.appendChild(script);
  }

  loadScript(babelPolyfill, function () {
    loadScript(babelStandalone, function () {
      var scripts = document.querySelectorAll('script[type="module"]');
      window.require = require;
      var info = getFileInfo(basedir, fileName);
      if (!cacheS[fileName] || cacheS[fileName].lastModified !== info.lastModified || cacheS[fileName].size !== info.size) {
        info.codes = [];
        for (var i = 0, script; script = scripts[i]; i++) {
          if (script.src) {
            require(script.getAttribute('src'));
          } else {
            info.codes[i] = Babel.transform(script.text, transformOptions).code;
          }
        }
        cacheS[fileName] = info;
        cacheSModified = true;
      }
      for (var i = 0; i < cacheS[fileName].codes.length; i++) {
        new Function(cacheS[fileName].codes[i])();
      }
      delete window.require;
      if (cacheSModified) writeFile(basedir, 'data/cache/nomodule/scripts.json', JSON.stringify(cacheS));
    });
  });
}();