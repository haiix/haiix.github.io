function createSandboxWorker({ onInit, onMessage, options }) {
  const workerScriptURL = URL.createObjectURL(new Blob([`
    'use strict';
    ((self, postMessage, addEventListener) => {
      (${onInit})();
      addEventListener('message', ${onMessage});
    })(self, postMessage.bind(self), addEventListener.bind(self));
  `], { type: 'text/javascript' }));

  return [workerScriptURL, new Worker(workerScriptURL, options)];
}

function createExecutionWorker() {
  return createSandboxWorker({
    options: { type: 'classic', credentials: 'omit' },

    onInit: () => {
      // 許可するグローバル変数のホワイトリスト
      const allowedGlobals = new Set([
        'Object', 'Function', 'Array', 'Number', 'Boolean', 'String', 'Symbol', 'Date', 'Promise', 'RegExp', 'JSON', 'Math', 'BigInt', 'Iterator',
        'parseFloat', 'parseInt', 'Infinity', 'NaN', 'undefined', 'isFinite', 'isNaN',
        //'escape', 'unescape',
        'Error', 'AggregateError', 'EvalError', 'RangeError', 'ReferenceError', 'SyntaxError', 'TypeError', 'URIError', 'SuppressedError',
        'Event', 'CustomEvent', 'EventTarget', 'PromiseRejectionEvent', 'ErrorEvent',
        'DisposableStack', 'AsyncDisposableStack',
        'ArrayBuffer', 'Uint8Array', 'Int8Array', 'Uint16Array', 'Int16Array', 'Uint32Array', 'Int32Array', 'Float16Array', 'Float32Array', 'Float64Array', 'Uint8ClampedArray', 'BigUint64Array', 'BigInt64Array', 'DataView',
        'structuredClone',
        'Map', 'Set', 'WeakMap', 'WeakSet',
        'FinalizationRegistry', 'WeakRef',
        'Temporal',
        'decodeURI', 'decodeURIComponent', 'encodeURI', 'encodeURIComponent', 'URL', 'URLSearchParams',
        'setTimeout', 'setInterval', 'clearInterval', 'clearTimeout', 'requestAnimationFrame', 'cancelAnimationFrame', 'queueMicrotask',
        'atob', 'btoa',
        'Intl', 'Proxy', 'Reflect',
        'ReadableStream', 'WritableStream', 'TransformStream',
        'TextEncoder', 'TextDecoder', 'TextEncoderStream', 'TextDecoderStream', 'CompressionStream', 'DecompressionStream',
        'FileReaderSync', 'FileReader', 'FileList', 'File', 'Blob',
        'Crypto', 'CryptoKey', 'SubtleCrypto', 'crypto',
        'ImageData', 'OffscreenCanvas', 'OffscreenCanvasRenderingContext2D',
        'Path2D', 'TextMetrics', 'CanvasGradient', 'CanvasPattern',
        'DOMMatrix', 'DOMMatrixReadOnly', 'DOMPoint', 'DOMPointReadOnly', 'DOMRect', 'DOMRectReadOnly', 'DOMQuad',
        'createImageBitmap', 'ImageBitmap', 'ImageBitmapRenderingContext',
        'AbortController', 'AbortSignal',
        //'console', // debug
      ]);

      // 非公開にすべきグローバル変数名
      const hiddenGlobalNames = new Set();

      // グローバルオブジェクトとプロトタイプから不要なプロパティを除去
      for (let current = self; current.constructor !== Object; current = Object.getPrototypeOf(current)) {
        for (const key of Reflect.ownKeys(current)) {
          if (allowedGlobals.has(key)) continue;

          if (Object.getOwnPropertyDescriptor(current, key).configurable) {
            delete current[key];
          } else {
            hiddenGlobalNames.add(key);
          }
        }
      }
      //console.log([...hiddenGlobalNames.keys()]); // debug

      // Function コンストラクタを安全なものに差し替える
      for (const OriginalFunction of [
        self.Function,
        (function * () {}).constructor,
        (async function () {}).constructor,
        (async function * () {}).constructor
      ]) {
        const SafeFunction = function (...args) {
          // 事前にすべての引数を文字列に変換しておく (副作用を確定させる)
          const stringArgs = args.map(arg => String(arg));

          // 動的 import を禁止
          if (/\bimport\s*\(|\bimport\b/.test(stringArgs.join(','))) {
            throw new Error('Forbidden word: import');
          }

          const code = stringArgs.pop() ?? '';
          const fn = OriginalFunction(...[...stringArgs, ...hiddenGlobalNames.keys()], `'use strict';${code}`);
          const tmpFn = OriginalFunction(...stringArgs, code);
          fn.toString = tmpFn.toString.bind(tmpFn);
          return fn;
        };

        SafeFunction.toString = OriginalFunction.toString.bind(OriginalFunction);
        delete OriginalFunction.prototype.constructor;
        OriginalFunction.prototype.constructor = SafeFunction;
      }

      self.Function = self.Function.prototype.constructor;

      // setTimeout / setInterval からグローバルへアクセスできないようにする
      for (const name of ['setTimeout', 'setInterval']) {
        const originalTimer = self[name];
        if (!originalTimer) continue;

        self[name] = (callback, ...rest) => {
          if (callback != null) {
            if (typeof callback !== 'function') {
              callback = new Function(callback);
            }
            callback = callback.bind(void 0);
          }
          return originalTimer(callback, ...rest);
        };

        self[name].toString = originalTimer.toString.bind(originalTimer);
      }

      // グローバルオブジェクトを再帰的に凍結
      function deepFreeze(target, frozen = new Set()) {
        if (target == null || typeof target !== 'object' && typeof target !== 'function') return;
        if (frozen.has(target)) return;

        frozen.add(target);
        Object.freeze(target);

        for (const key of Reflect.ownKeys(target)) {
          try {
            deepFreeze(target[key], frozen);
          } catch {
            // 無視
          }
        }
      }

      deepFreeze(self);
    },

    onMessage: async (event) => {
      try {
        const AsyncFunction = (async function () {}).constructor;
        let result = await new AsyncFunction(event.data)();

        if (result instanceof OffscreenCanvas) {
          result = result.getContext('2d');
        }

        if (result instanceof OffscreenCanvasRenderingContext2D) {
          result = result.getImageData(0, 0, result.canvas.width, result.canvas.height);
        }

        if (result instanceof ImageData) {
          if (result.width > 256 || result.height > 256) {
            throw new Error('Too large ImageData');
          }
        } else {
          result = '' + JSON.stringify(
            result,
            (key, val) =>
              typeof val === 'function'
                ? val + ''
                : (val != null && !Array.isArray(val) && typeof val !== 'string' && typeof val[Symbol.iterator] === 'function')
                  ? Array.from(val)
                  : val
          );

          result = result.length < 1000 ? result : `${result.slice(0, 997)}...`;
        }

        postMessage(['resolve', result]);
      } catch (error) {
        const message = error instanceof Error ? `[${error.name}] ${error.message}` : String(error);
        postMessage(['reject', message.length < 1000 ? message : `${message.slice(0, 997)}...`]);
      }
    },
  });
}

export class CodeExecutor {
  pendingPromise = null;
  workerScriptURL = null;
  worker = null;
  timeoutId = null;

  initialize() {
    if (this.worker) return;

    [this.workerScriptURL, this.worker] = createExecutionWorker();

    this.worker.onmessage = (event) => {
      clearTimeout(this.timeoutId);

      const [type, value] = event.data;
      if (!this.pendingPromise) return;

      const [resolve, reject] = this.pendingPromise;
      this.pendingPromise = null;

      if (type === 'resolve') {
        resolve(value);
      } else {
        reject(new Error(value));
      }
    };
  }

  execute(code, options) {
    if (this.pendingPromise) {
      throw new Error('Execution already in progress.');
    }

    const { promise, resolve, reject } = Promise.withResolvers();
    this.pendingPromise = [resolve, reject];

    this.initialize();

    if (options?.timeout) {
      this.timeoutId = setTimeout(() => {
        this.terminate('Timeout.');
      }, options.timeout);
    }

    if (options?.signal) {
      options.signal.addEventListener(
        'abort',
        () => {
          this.terminate('Worker terminated by abort signal.');
        },
        { once: true },
      );
    }

    this.worker?.postMessage(code);
    return promise;
  }

  terminate(message) {
    clearTimeout(this.timeoutId);

    if (!this.worker) return;

    this.worker.terminate();
    this.worker = null;

    if (this.workerScriptURL) {
      URL.revokeObjectURL(this.workerScriptURL);
    }

    if (!this.pendingPromise) return;

    const [, reject] = this.pendingPromise;
    this.pendingPromise = null;

    reject(new Error(message));
  }
}

let executorInstance;

/**
 * Execute JavaScript code in a sandboxed Worker.
 *
 * @async
 * @function execute
 * @param {string} code - JavaScript code to run.
 * @param {Object} [options] - Execution options.
 * @param {AbortSignal} [options.signal] - Abort signal.
 * @param {number} [options.timeout] - Timeout in milliseconds.
 * @return {Promise<string|ImageData>}
 */
export function execute(code, options) {
  executorInstance ??= new CodeExecutor();
  return executorInstance.execute(code, options);
}

export default execute;
