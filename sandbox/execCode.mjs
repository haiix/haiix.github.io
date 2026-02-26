let executer = null;

/**
 * Run the JavaScript code on the worker.
 *
 * @async
 * @function execCode
 * @param {string} code - The JavaScript code.
 * @param {Object} [option] - Options.
 * @param {AbortSignal} [option.signal] - The AbortSignal.
 * @param {number} [option.timeout] - Timeout (ms).
 * @return {Promise<string|ImageData>} The resulting string or ImageData.
 * @throws {Error}
 */
export default function execCode(code, option = null) {
  if (!executer) executer = new Executer();
  return executer.execCode(code, option);
}

function createWorker({ oncreate, onmessage, options }) {
  const objectURL = URL.createObjectURL(new Blob([`
    'use strict'
    ;((Object, self, postMessage, addEventListener) => {
      ;(${oncreate})()
      addEventListener('message', ${onmessage})
    })(Object, self, postMessage.bind(self), addEventListener.bind(self))
  `], { type: 'text/javascript' }));
  return [objectURL, new Worker(objectURL, options)];
}

function createExecWorker() {
  return createWorker({
    options: { type: 'classic', credentials: 'omit' },
    oncreate: () => {
      // グローバル変数のうち、許可する変数のリスト
      const whitelist = [
        'Object', 'Function', 'Array', 'Number', 'Boolean', 'String', 'Symbol', 'Date', 'Promise', 'RegExp', 'JSON', 'Math', 'BigInt',
        'parseFloat', 'parseInt', 'Infinity', 'NaN', 'undefined', 'isFinite', 'isNaN',
        //'escape', 'unescape',
        'Error', 'AggregateError', 'EvalError', 'RangeError', 'ReferenceError', 'SyntaxError', 'TypeError', 'URIError',
        'ArrayBuffer', 'Uint8Array', 'Int8Array', 'Uint16Array', 'Int16Array', 'Uint32Array', 'Int32Array', 'Float32Array', 'Float64Array', 'Uint8ClampedArray', 'BigUint64Array', 'BigInt64Array', 'DataView',
        'Map', 'Set', 'WeakMap', 'WeakSet',
        'decodeURI', 'decodeURIComponent', 'encodeURI', 'encodeURIComponent',
        'setTimeout', 'setInterval', 'clearInterval', 'clearTimeout', 'requestAnimationFrame', 'cancelAnimationFrame',
        'atob', 'btoa',
        'Intl', 'Proxy', 'Reflect',
        'TextEncoder', 'TextDecoder',
        'FileReaderSync', 'FileReader', 'FileList', 'File', 'Blob',
        'Crypto', 'CryptoKey', 'SubtleCrypto', 'crypto',
        'ImageData',
        'OffscreenCanvas', 'OffscreenCanvasRenderingContext2D',
        'createImageBitmap', 'ImageBitmap',
        'AbortSignal', 'AbortController',
        //'console' // debug
      ];

      // グローバル変数とプロトタイプ継承から、削除可能なものは削除し、削除できないものは隠す変数に追加
      const hiddenVariableNames = new Set();
      for (let curr = self; curr.constructor !== Object; curr = Object.getPrototypeOf(curr)) {
        for (const [name, descriptor] of Object.entries(Object.getOwnPropertyDescriptors(curr))) {
          if (whitelist.includes(name)) continue;
          if (descriptor.configurable) {
            delete curr[name];
          } else {
            hiddenVariableNames.add(name);
          }
        }
      }
      //console.log([...hiddenVariableNames.keys()]); // debug

      // Function を置き換える
      for (const OldFunc of [
        self.Function,
        (function * () {}).constructor,
        (async function () {}).constructor,
        (async function * () {}).constructor
      ]) {
        const Function = function (...args) {
          const code = args.length > 0 ? (args.pop() + '') : '';
          // 禁止ワード: import
          // importはキーワードであり変数の置き換えができないが、動的インポート「import('url')」を防ぐ必要がある
          if (/\bimport\s*\(|\bimport\b/.test(code)) {
            throw new Error('Forbidden word: import');
          }
          const dummyFunc = OldFunc(...args, code);
          const func = OldFunc([...args, ...hiddenVariableNames.keys()], '"use strict";' + code);
          func.toString = dummyFunc.toString.bind(dummyFunc);
          return func;
        }
        Function.toString = OldFunc.toString.bind(OldFunc);
        delete OldFunc.prototype.constructor;
        OldFunc.prototype.constructor = Function;
      }
      self.Function = self.Function.prototype.constructor;

      // setTimeout, setInterval からグローバルへのアクセスを防ぐ
      for (const fn of ['setTimeout', 'setInterval']) {
        const tmp = self[fn];
        if (!tmp) continue;
        self[fn] = (func, ...rest) => {
          if (func != null) {
            if (typeof func !== 'function') func = new Function(func);
            func = func.bind(void 0);
          }
          return tmp(func, ...rest);
        }
        self[fn].toString = tmp.toString.bind(tmp);
      }

      // グローバル変数凍結
      function deepFreeze(obj, frozen = new Set()) {
        if (obj == null || typeof obj !== 'object' && typeof obj !== 'function') return;
        if (frozen.has(obj)) return;
        frozen.add(obj);
        Object.freeze(obj);
        for (const key of Reflect.ownKeys(obj)) {
          try {
            deepFreeze(obj[key], frozen);
          } catch {
            // Do nothing
          }
        }
      }
      deepFreeze(self);
    },

    onmessage: async function (event) {
      try {
        // 実行
        const AsyncFunction = (async function () {}).constructor;
        let retVal = await new AsyncFunction(event.data)();
        if (retVal instanceof OffscreenCanvas) {
          retVal = retVal.getContext('2d');
        }
        if (retVal instanceof OffscreenCanvasRenderingContext2D) {
          retVal = retVal.getImageData(0, 0, retVal.canvas.width, retVal.canvas.height);
        }
        if (retVal instanceof ImageData) {
          if (retVal.width > 256 || retVal.height > 256) {
            throw new Error('Too large ImageData');
          }
        } else {
          retVal = '' + JSON.stringify(retVal, (key, val) => typeof val === 'function' ? val + '' : (val != null && !Array.isArray(val) && typeof val !== 'string' && typeof val[Symbol.iterator] === 'function') ? Array.from(val) : val);
          retVal = retVal.length < 1000 ? retVal : retVal.slice(0, 997) + '...';
        }
        postMessage(['resolve', retVal]);
      } catch (error) {
        const retVal = '[' + error.name + '] ' + error.message;
        postMessage(['reject', retVal.length < 1000 ? retVal : retVal.slice(0, 997) + '...']);
      }
    }
  })
}

export class Executer {
  proc = null;
  objectURL = null;
  worker = null;
  timeout = null;

  initialize() {
    if (this.worker) return;
    [this.objectURL, this.worker] = createExecWorker();
    this.worker.onmessage = event => {
      clearTimeout(this.timeout);
      const [type, value] = event.data;
      if (!this.proc) return;
      const [resolve, reject] = this.proc;
      this.proc = null;
      if (type === 'resolve') {
        resolve(value);
      } else {
        reject(new Error(value));
      }
    }
  }

  execCode(code, option = null) {
    return new Promise((resolve, reject) => {
      if (this.proc) throw new Error('Currently working.');
      this.proc = [resolve, reject];
      this.initialize();
      if (option && option.timeout) {
        this.timeout = setTimeout(() => this.terminate('Timeout.'), option.timeout);
      }
      if (option && option.signal) {
        option.signal.addEventListener('abort', event => this.terminate('Worker terminated by the abort signal.'), { once: true });
      }
      this.worker.postMessage(code);
    })
  }

  terminate(message) {
    clearTimeout(this.timeout);
    if (!this.worker) return;
    this.worker.terminate();
    this.worker = null;
    URL.revokeObjectURL(this.objectURL);
    if (!this.proc) return;
    const [resolve, reject] = this.proc;
    this.proc = null;
    reject(new Error(message));
  }
}
