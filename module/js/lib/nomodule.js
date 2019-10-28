(function () {
'use strict';

var transformOptions = {presets: ['es2015', 'es2016', 'es2017']};

// https://qiita.com/kijtra/items/472cb34a8f0eb6dde459
var current = function () {
    if (document.currentScript) {
        return document.currentScript.src;
    } else {
        var scripts = document.getElementsByTagName('script'),
        script = scripts[scripts.length - 1];
        if (script.src) return script.src;
    }
    throw new Error('Invalid');
}();

function path_normalize(path) {
    var src = path.split('/'), dst = [], i, val;
    for (i = 0; i < src.length; i++) {
        val = src[i];
        if (val === '' || val === '.') continue;
        if (val === '..') dst.pop();
        else dst.push(val);
    }
    return (path[0] === '/' ? '/' : './') + dst.join('/');
}

function path_dirname(path) {
    return path.slice(0, path.lastIndexOf('/'));
}

var cache = {};
var currdir = path_dirname(location.pathname.split('\\').join('/'));
function require(path) {
    path = path_normalize(currdir + '/' + path);
    if (!cache[path]) {
        var code;
        if (location.protocol !== 'file:') {
            var req = new XMLHttpRequest();
            req.open('GET', path, false);
            req.send();
            if (req.status !== 200) throw new Error('Load faled: ' + path);
            code = req.responseText;
        } else if (Object.getOwnPropertyDescriptor(window, 'ActiveXObject')) {
            var fso = new ActiveXObject('Scripting.FileSystemObject');
            try {
                var file = fso.OpenTextFile(path.slice(1), 1, false);
            } catch (err) {
                throw new Error('Load failed: ' + path + ': ' + err.message);
            }
            code = file.ReadAll();
            file.close();
        }
        var prevdir = currdir;
        currdir = path_dirname(path);
        cache[path] = new Function('\'use strict\';var exports={};' + Babel.transform(code, transformOptions).code + ';return exports')();
        currdir = prevdir;
    }
    return cache[path];
}

function loadScript(path, callback) {
    var script = document.createElement('script');
    script.onload = function (event) {
        document.body.removeChild(script);
        callback();
    };
    script.onerror = function (event) {
        throw new Error('Load faild: ' + path);
    };
    script.src = path;
    document.body.appendChild(script);
}

loadScript(path_dirname(current) + '/babel-polyfill.6.26.0.min.js', function () {
    loadScript(path_dirname(current) + '/babel-standalone.6.26.0.min.js', function () {
        window.fetch = window.fetch || require('./js/lib/fetch.3.0.0.min.js').fetch;

        var scripts = document.querySelectorAll('script[type="module"]');
        for (var i = 0; i < scripts.length; i++) {
            new Function(Babel.transform(scripts[i].text, transformOptions).code)();
        }
    });
});

window.require = require;
}());
