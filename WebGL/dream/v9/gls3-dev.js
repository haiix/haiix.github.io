/* =========================================================

この「gls3-dev.js」ファイルと同じフォルダーに、「index.html」を作成して、下記コードを書いてください。

<script src="gls3-dev.js" charset="UTF-8"></script>

その後、ブラウザで、作成した「index.html」を読み込んでください。

(ここから下は、スクリプトです。)

============================================================ */

initValidator(function () { /*

m[100]
/
以下、HTMLファイルのテンプレートです。
============================================================
<!DOCTYPE html>
<html lang="ja">
  <head>
    <meta charset="UTF-8">
    <title></title>
  </head>
  <body>
    <canvas id="view" width="400" height="400">
      WebGL is not supported.
      <script data-name="mainShader" type="x-shader/x-vertex">
        attribute vec3 position;
        //attribute ${ubyte4} color; // 拡張 attribute ${ushort2}, ${ubyte4} が使えます
        //attribute vec2 textureCoord;
        //uniform mat4 mvp;
        //varying vec2 vTextureCoord;
        //varying vec4 vColor;
        void main() {
            // ここに頂点シェーダーのコードを書いてください
            gl_Position = vec4(position, 1.0);
            //gl_Position = mvp * vec4(position, 1.0);
            //vTextureCoord = textureCoord;
            //vColor = color / 255.0;
        }
      </script>
      <script data-name="mainShader" type="x-shader/x-fragment">
        precision mediump float;
        //const vec2 ireso = 1.0 / vec2(${canvas.width}, ${canvas.height});
        //uniform sampler2D texture;
        //varying vec2 vTextureCoord;
        //varying vec4 vColor;
        void main() {
            // ここにフラグメントシェーダーのコードを書いてください
            //gl_FragColor = texture2D(texture, vTextureCoord);
            //gl_FragColor = texture2D(texture, gl_FragCoord.xy * ireso);
            //gl_FragColor = vColor;
            //gl_FragColor = vec4(vec3(gl_FragCoord.w * 2.0), 1.0);
            gl_FragColor = vec4(1.0);
        }
      </script>
    </canvas>
    <script src="gl-matrix-min.js"></script>
    <script src="gls3.js"></script>
    <script src="gls3-lib.js"></script>
    <script src="gls3-dev.js"></script>
    <script>
'use strict';

var X = 0, Y = 1, Z = 2, W = 3;

var gl = new Gls('#view', {context: {alpha: true, depth: false, antialias: true}});

// ここにJavaScriptのコードを書いてください。

    </script>
  </body>
</html>
============================================================

m[101]
このhtmlファイルと同じフォルダーに「gls3.js」を置き、「gls3-dev.js」よりも先に読み込んでください。

m[102]
Glsをインスタンス化してください。

m[103]
Glsはnewをつけてインスタンス化してください。

m[104]
new Gls()の第一引数にはCanvas要素のセレクタ文字列、またはCanvas要素のオブジェクトを渡してください。

m[105]
new Gls()の第一引数で設定したセレクタ「%s」ではCanvas要素がセレクトできませんでした。スクリプトを実行する前にCanvas要素を構築してください。

m[106]
Programが1つも作成されませんでした。Canvas要素の中にGLSLのスクリプトを作成してください。また、VertexShaderとFragmentShaderのdata-nameは一致させてください。

m[107]
VertexShader「%s」にAttributeを追加してください。例えば、
    attribute vec3 position;
    attribute ${ubyte4} color;
など。
追加したAttibuteはGLSLスクリプト内で使用しないと、最適化により削除されるかもしれません。必ず使用するようにしてください！

例：
  <script data-name="" type="x-shader/x-vertex">
    attribute vec3 position; // Attribute「position」を追加
    void main() {
        gl_Position = vec4(position, 1.0); // 追加したAttributeはスクリプト内で使う！
    }
  </script>

m[108]
gl.createGeometry(programNames, mode, usage) でジオメトリを作成してください。

programNamesは現在、
    %s が使えます。
modeは、
    「gl.POINT」「gl.LINES」「gl.TRIANGLES」「gl.TRIANGLE_STRIP」などがあります。
usageは、
    「gl.DINAMIC_DRAW」「gl.STATIC_DRAW」などがあり、デフォルトは、「gl.DINAMIC_DRAW」です。

例：
var geom = gl.createGeometry(%s, gl.TRIANGLE_STRIP);

m[109]
createGeometryの第一引数は文字列の配列で指定してください。
シェーダースクリプト要素のdata-name属性で設定した名前を指定できます。
現在使える名前は、%sです。

例：
var geom = gl.createGeometry(%s, gl.TRIANGLE_STRIP);

m[110]
createGeometryの第二引数には描画モードを指定することを推奨します。
描画モードは、「gl.POINT」「gl.LINES」「gl.TRIANGLES」「gl.TRIANGLE_STRIP」などがあります。

例：
var geom = gl.createGeometry(%s, gl.TRIANGLE_STRIP);

m[111]
geom.addMesh() が存在しません。「gls3-lib.js」の読み込みを推奨します。
「gls3-lib.js」を読み込む代わりに、geom.assign()を使うこともできます。

例(「<script src="gls3.js"></script>」の後ろに)：
<script src="gls3-lib.js"></script>

m[112]
geom.addMesh(param) でメッシュを追加してください。

例：
geom.addMesh({
    unum: 1,
    vnum: 1,
    uloop: false,
    shape: function (attribute) {
        // ここにmeshの変形処理を書く
        attribute.position[X] *= 0.4;
        attribute.position[Y] *= 0.2;
    },
});

m[113]
作成したジオメトリを描画してください。
gl.mainShader.draw(geom);

m[114]
gl.createTextureの第一引数にはImage、HTMLCanvasElement、またはWebGLTextureを指定してください。

例：
gl.createTexture(image, gl.NEAREST_CLAMP)

m[115]
gl.createTextureの第二引数を指定することを推奨します。

プリセット：
gl.NEAREST_CLAMP, gl.LINEAR_CLAMP, gl.NEAREST_REPEAT, gl.LINEAR_REPEAT

m[116]
gl.createFramebufferの第一引数にparamを指定して下さい。

例：
var framebuffer = gl.createFramebuffer({
    depth: false,
    //width: gl.canvas.width,
    //height: gl.canvas.height,
    texture: gl.NEAREST_CLAMP,
});

m[117]
作成したframebufferは使用して下さい。

例：
gl.bindFramebuffer(framebuffer);

m[118]
gl.createCameraの第一引数にparamを指定して下さい。
また、作成したcameraを使用して下さい。

例:
var camera = gl.createCamera({
    fov: 45,
    near: 0.1,
    far: 100,
    z: 1 / Math.tan(45 * Math.PI / 360),
});

var m = mat4.fromXRotation(mat4.create(), Math.PI / -2);
var vp = camera({
    pan: 0,
    tilt: 90,
    roll: 0,
});
gl.mainShader.uniform.mvp = mat4.mul(mat4.create(), vp, m);

m[119]
gl.createMouseの第一引数にparamを指定して下さい。
また、作成したmouseを使用して下さい。

var mouse = gl.createMouse({
    delay: 0.9,
});
!function loop() {
    requestAnimationFrame(loop);
    mouse.update();
    console.log(mouse.dispX, mouse.dispY);
}();

m[999]
gl.createGeometry() でジオメトリを作成できます。
gl.createTexture() で画像からテクスチャを作成できます。
gl.createFramebuffer() でフレームバッファを作成できます。
gl.createCamera() でカメラを作成できます。
gl.createMouse() でマウスインターフェイスを作成できます。
geom.addMesh() でメッシュを追加できます。
スクリプトが完成したら、この「gls3-dev.js」の読み込みをやめてください。

*/ }, function (v, p, m) {
  'use strict';
  v.default(m[999]);
  v(window, 'Gls')
  .notExists(m[101] + m[100])
  .notCalled(m[102] + m[100])
  .beforeCall(function (query, params) {
    if (!(this instanceof Gls)) return [m[103] + m[100]];

    if ((typeof query !== 'string' || query === '') && !(query instanceof HTMLCanvasElement)) {
      return [m[104] + m[100]];
    }

    try {
      if (!document.body || (typeof query === 'string' && !(document.querySelector(query) instanceof HTMLCanvasElement))) {
        throw 0;
      }
    } catch (err) {
      return [m[105] + m[100], query];
    }
  })
  .afterCall(function (gls) {
    if (Object.keys(gls._program).length === 0) {
      return [m[106] + m[100]];
    }

    for (var name in gls._program) {
      if (Object.keys(gls._program[name].attribute).length === 0) {
        return [m[107], name];
      }
    }

    var programNames = JSON.stringify(Object.keys(gls._program)).split('"').join('\'');
    v(gls, 'createGeometry')
    .notCalled(m[108], programNames, programNames)
    .beforeCall(function (names, mode, usage) {
      if (!Array.isArray(names)) {
        return [m[109], programNames, programNames];
      }
      if (mode === undefined) {
        p(m[110], programNames);
      }
    })
    .afterCall(function (geom) {
      v(geom, 'addMesh')
      .notExists(m[111])
      .notCalled(function () {
        v(geom, 'assign')
        .notCalled(m[112])
      })
      //.beforeCall();
      .afterCall(function () {
        v(gls, 'clearColor')
        .notCalled('背景色を設定してください。\n\n例：\ngl.clearColor(0, 0, 1, 1);')

        v(gls, 'clear')
        .notCalled(' 画面を初期化してください。\ngl.clear();')

        v(gls._program.mainShader || gls._program[Object.keys(gls._program)[0]], 'draw')
        .notCalled(m[113]);
      })
    });

    v(gls, 'createTexture')
    .beforeCall(function (image, param) {
        if (!image) {
            return [m[114]];
        }

        if (!param) {
            p(m[115]);
        }
    });

    v(gls, 'createFramebuffer')
    .beforeCall(function (param) {
        if (!param) {
            return [m[116]];
        }
    })
    .afterCall(function (framebuffer) {
        v(gls, 'bindFramebuffer')
        .notCalled(m[117]);
    });

    v(gls, 'createCamera')
    .beforeCall(function (param) {
        if (!param) {
            return [m[118]];
        }
    });

    v(gls, 'createMouse')
    .beforeCall(function (param) {
        if (!param) {
            return [m[119]];
        }
    });
  });
});

////////////////////////////////////////////////////////////

function initValidator(src, callback) {
  'use strict';
  var m = function defmsg(src) {
    var msg = Object.create(null);
    var str = src.toString();
    str = str.slice(str.indexOf('/*') + 2, str.lastIndexOf('*/'));
    var arr = str.split('m[').slice(1);
    for (var i = 0; i < arr.length; i++) {
      var tmp = arr[i];
      var n = tmp.indexOf(']\n');
      var key = tmp.slice(0, n);
      var val = tmp.slice(n + 1).trim();
      msg[key] = val;
    }
    return msg;
  }(src);
  var p = console.warn.bind(console);
  var notCalledFuncs = [], valid = true;
  function Validator(obj, method) {
    this.defined = obj && typeof obj[method] === 'function';
    var org = obj[method];
    var self = this;
    self.func = obj[method] = function callee() {
      for (var i = 0; i < notCalledFuncs.length; i++) {
        if (notCalledFuncs[i].func === self.func) {
          notCalledFuncs.splice(i, 1);
          break;
        }
      }
      if (self.beforeCallFunc) {
        var f = self.beforeCallFunc.apply(this, arguments);
        if (Array.isArray(f)) {
          p.apply(null, f);
          valid = false;
          return;
        }
      }
      if (this instanceof callee) {
        var ins = Object.create(org.prototype)
        var retVal = org.apply(ins, arguments);
        if (retVal === undefined) retVal = ins;
      } else {
        var retVal = org.apply(this, arguments);
      }
      if (self.afterCallFunc) {
        self.afterCallFunc.call(this, retVal);
      }
      return retVal;
    };
  }
  Validator.prototype.notExists = function () {
    if (!this.defined) {
      p.apply(null, arguments);
      valid = false;
    }
    return this;
  };
  Validator.prototype.notCalled = function (fn) {
    if (this.defined) {
      if (typeof fn === 'function') {
        fn();
      } else {
        notCalledFuncs.push({func: this.func, arguments: arguments});
      }
    }
    return this;
  };
  Validator.prototype.beforeCall = function (func) {
    this.beforeCallFunc = func;
    return this;
  };
  Validator.prototype.afterCall = function (func) {
    this.afterCallFunc = func;
    return this;
  };
  requestAnimationFrame(function () {
    for (var i = 0; i < notCalledFuncs.length; i++) {
      p.apply(null, notCalledFuncs[i].arguments);
    }
    if (notCalledFuncs.length === 0 && valid) {
      p.apply(null, v.defaultArguments);
    }
  });
  var v = function (obj, method) {
    return new Validator(obj, method);
  }
  v.defaultArguments = [''];
  v.default = function () {
    v.defaultArguments = arguments;
  }
  callback(v, p, m);
}
