Gls.VERSION = '0.3.31';

var GL = window.WebGLRenderingContext || {};

var ATTRIBUTE_TYPE = {};
ATTRIBUTE_TYPE[GL.FLOAT]      = {type: GL.FLOAT, size:  1, fn: '1f',  isMatrix: false}; // 5126
ATTRIBUTE_TYPE[GL.FLOAT_VEC2] = {type: GL.FLOAT, size:  2, fn: '2fv', isMatrix: false}; // 35664
ATTRIBUTE_TYPE[GL.FLOAT_VEC3] = {type: GL.FLOAT, size:  3, fn: '3fv', isMatrix: false}; // 35665
ATTRIBUTE_TYPE[GL.FLOAT_VEC4] = {type: GL.FLOAT, size:  4, fn: '4fv', isMatrix: false}; // 35666
ATTRIBUTE_TYPE[GL.FLOAT_MAT2] = {type: GL.FLOAT, size:  4, fn: '2fv', isMatrix: true};  // 35674
ATTRIBUTE_TYPE[GL.FLOAT_MAT3] = {type: GL.FLOAT, size:  9, fn: '3fv', isMatrix: true};  // 35675
ATTRIBUTE_TYPE[GL.FLOAT_MAT4] = {type: GL.FLOAT, size: 16, fn: '4fv', isMatrix: true};  // 35676

var TYPE_BYTE = {};
TYPE_BYTE[GL.BYTE]           = {byte: 1, Array: window.Int8Array};    // 5120
TYPE_BYTE[GL.UNSIGNED_BYTE]  = {byte: 1, Array: window.Uint8Array};   // 5121
TYPE_BYTE[GL.SHORT]          = {byte: 2, Array: window.Int16Array};   // 5122
TYPE_BYTE[GL.UNSIGNED_SHORT] = {byte: 2, Array: window.Uint16Array};  // 5123
TYPE_BYTE[GL.INT]            = {byte: 4, Array: window.Int32Array};   // 5124
TYPE_BYTE[GL.UNSIGNED_INT]   = {byte: 4, Array: window.Uint32Array};  // 5125
TYPE_BYTE[GL.FLOAT]          = {byte: 4, Array: window.Float32Array}; // 5126

////////////////////////////////////////////////////////////
// Util

function noop() {}

////////////////////////////////////////////////////////////
// Core

var Gls_initializers = [];
function Gls(canvas, param) {
    if (!(this instanceof Gls)) throw new Error('Should call as new Gls()');
    param = Object.create(param || null);
    param.PI = Math.PI;
    for (var i = 0, l = Gls_initializers.length; i < l; i++) {
        Gls_initializers[i].call(this, canvas, param);
    }
}

////////////////////////////////////////////////////////////
// Canvas

Gls_initializers.push(function (canvas, param) {
    if (typeof canvas === 'string') {
        canvas = document.querySelector(canvas);
    }
    if (!(canvas instanceof HTMLCanvasElement)) {
        throw new Error('Canvas element was not found');
    }
    param.canvas = Object.create(param.canvas || null);
    param.canvas.width = canvas.width;
    param.canvas.height = canvas.height;
    this.canvas = canvas;
});

////////////////////////////////////////////////////////////
// WebGL

Gls_initializers.push(function (canvas, param) {
    var gl, div;

    var contextAttributes = { preserveDrawingBuffer: true };
    var contextAttributeNames = ['alpha', 'desynchronized', 'antialias', 'depth', 'failIfMajorPerformanceCaveat', 'powerPreference', 'premultipliedAlpha', 'preserveDrawingBuffer', 'stencil'];
    for (var i = 0; i < contextAttributeNames.length; i++) {
        var name = contextAttributeNames[i];
        if (name in param) contextAttributes[name] = param[name];
    }

    gl = this.canvas.getContext('webgl', contextAttributes) || this.canvas.getContext('experimental-webgl', contextAttributes);
    if (!gl) {
        div = document.createElement('div');
        div.innerHTML = this.canvas.innerHTML;
        this.canvas.parentNode.replaceChild(div, this.canvas);
        throw new Error('WebGL is not supported');
    }
    this.gl = gl;
});

////////////////////////////////////////////////////////////
// Shader

function removeComment(src) {
    return src.replace(/(\/\/.*\n)|(\/\**?\*\/)/g, function (v) {
        return new Array(v.split('\n').length).join('\n') + ' ';
    });
}
function fetchAttributeType(src) {
    src = ';' + src.replace(/;/g, ';;');
    var res, re = /;\s*attribute\s+(\w+\s+)?\[\[(ushort2|ubyte4)\]\]\s+(\w+)\s*;/g;
    var attribute = Object.create(null);
    while ((res = re.exec(src)) !== null) {
        var typeStr = res[2];
        var name = res[3];
        var type = typeStr === 'ushort2' ? GL.UNSIGNED_SHORT : typeStr === 'ubyte4' ? GL.UNSIGNED_BYTE : null;
        attribute[name] = {type: type};
    }
    return attribute;
}
function replaceParam(str, param) {
    return str.replace(/\[\[(.+?)\]\]/g, function (_, keys) {
        var cur = param, i, key, val, type;
        keys = keys.split('.');
        for (i = 0; i < keys.length; i++) {
            key = keys[i];
            val = cur[key];
            if (val == null) break;
            cur = val;
        }
        type = typeof val;
        if (val == null) return '';
        else if (typeof val === 'number') return val.toFixed(8);
        else return '' + val;
    });
}

function Shader(gl, type, src) {
    var typeName;
    this.gl = gl;
    this.shader = gl.createShader(type);
    gl.shaderSource(this.shader, src);
    gl.compileShader(this.shader);
    if (!gl.getShaderParameter(this.shader, GL.COMPILE_STATUS)) {
        typeName = type === GL.VERTEX_SHADER ? 'Vertex' : type === GL.FRAGMENT_SHADER ? 'Fragment' : 'Unknown';
        throw new Error(typeName + ' shader compile error: ' + gl.getShaderInfoLog(this.shader));
    }
}

function VertexShader(gl, src, attribute) {
    Shader.call(this, gl, GL.VERTEX_SHADER, src);
    this.attribute = attribute;
}
//VertexShader.prototype = Object.create(Shader.prototype);

function FragmentShader(gl, src) {
    Shader.call(this, gl, GL.FRAGMENT_SHADER, src);
}
//FragmentShader.prototype = Object.create(Shader.prototype);

function compileShader(gl, Shader, src, param) {
    var attribute;
    src = removeComment(src);
    if (Shader === VertexShader) attribute = fetchAttributeType(src);
    src = replaceParam(src, param);
    return new Shader(gl, src, attribute);
}
Gls_initializers.push(function (canvas, param) {
    param.ushort2 = 'vec2';
    param.ubyte4 = 'vec4';
    function initShaders(gl, Shader, selector) {
        var elements, shaders, i, element, names, src, shader, j, name;
        elements = gl.canvas.querySelectorAll(selector);
        shaders = Object.create(null);
        for (i = 0; i < elements.length; i++) {
            element = elements[i];
            names = (element.getAttribute('data-name') || '').split(',');
            shader = compileShader(gl, Shader, element.textContent, param);
            for (j = 0; j < names.length; j++) {
                name = names[j];
                if (shaders[name]) throw new Error('Duplicate shader name: ' + name);
                shaders[name] = shader;
            }
        }
        return shaders;
    }
    this._shader = Object.create(null);
    this._shader.vertex = initShaders(this.gl, VertexShader, 'script[type="x-shader/x-vertex"]');
    this._shader.fragment = initShaders(this.gl, FragmentShader, 'script[type="x-shader/x-fragment"]');
});

////////////////////////////////////////////////////////////
// Program

var Program_initializers = [];
function Program(gls, name, vs, fs) {
    if (gls.gl !== vs.gl || gls.gl !== fs.gl) throw new Error('Different context');
    this.name = name;
    this._gls = gls;
    for (var i = 0, l = Program_initializers.length; i < l; i++) {
        Program_initializers[i].call(this, vs, fs);
    }
}
Program_initializers.push(function (vs, fs) {
    var gl = this._gls.gl;
    var program = gl.createProgram();
    gl.attachShader(program, vs.shader);
    gl.attachShader(program, fs.shader);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, GL.LINK_STATUS)) {
        throw new Error('Link error: ' + gl.getProgramInfoLog(program));
    }
    this._program = program;
});
Program.prototype.draw = function (geom) {
    Geometry_build.call(geom);
    if (geom.programs.indexOf(this) < 0) throw new Error('Using a program with a different geometry');
    this._gls.gl.useProgram(this._program);
    Program_applyUniforms.call(this);

    for (var i = 0; i < geom.buffers.length; i++) {
        var buffer = geom.buffers[i];
        Program_createVBO.call(this, geom, buffer);
        Program_bindVBO.call(this, geom, buffer);
        if (geom.buffers[0].indices) {
            this._gls.gl.drawElements(geom.mode, buffer.indices.length, buffer.type, 0);
        } else {
            this._gls.gl.drawArrays(geom.mode, 0, buffer.vertexes.byteLength / geom.strideSize);
        }
    }
};
Gls_initializers.push(function (canvas, param) {
    var shader = this._shader, program = Object.create(null);
    for (var programName in shader.vertex) {
        var vs = shader.vertex[programName];
        var fs = shader.fragment[programName];
        if (!fs) continue;
        program[programName] = new Program(this, programName, vs, fs);
        if (!this[programName]) this[programName] = program[programName];
    }
    this._program = program;
});
Gls.prototype.createProgram = function (vsSrc, fsSrc, param) {
    var _param = Object.create(param || null)
    _param.ushort2 = 'vec2';
    _param.ubyte4 = 'vec4';
    var vs = compileShader(this.gl, VertexShader, vsSrc, _param);
    var fs = compileShader(this.gl, FragmentShader, fsSrc, _param);
    var name = 't_' + Date.now();
    return new Program(this, name, vs, fs);
};

////////////////////////////////////////////////////////////
// Program/Attribute

function mergeAttribute(dst, src) {
    var name, dat, sat;
    for (name in src) {
        sat = src[name];
        dat = dst[name];
        if (dat) {
            if (dat.size != null && dat.size !== sat.size) {
                throw new Error('Same attribute but size is different: ' + name);
            }
            if (dat.type != null && dat.type !== sat.type) {
                throw new Error('Same attribute but type is different: ' + name + ' (' + dat.type + ' != ' + sat.type + ')' );
            }
        } else {
            dst[name] = {};
        }
        dst[name].size = sat.size;
        dst[name].type = sat.type;
    }
}

Program_initializers.push(function (vs) {
    this._attribute = Object.create(null);
    mergeAttribute(this._attribute, vs.attribute);
    Program_fetchAttributeLocations.call(this);
});
function Program_fetchAttributeLocations() {
    var dst = this._attribute, gl = this._gls.gl, l, i, info, name, at;
    l = gl.getProgramParameter(this._program, GL.ACTIVE_ATTRIBUTES);
    for (i = 0; i < l; i++) {
        info = gl.getActiveAttrib(this._program, i);
        name = info.name;
        at = ATTRIBUTE_TYPE[info.type];
        dst[name] = dst[name] || {};
        dst[name].size = dst[name].size || at.size;
        dst[name].type = dst[name].type || at.type;
        dst[name].location = i;
    }
}
function Program_createVBO(geom, buffer) {
    if (buffer.vbo) return;
    var gl = this._gls.gl, curr;
    curr = gl.getParameter(GL.ARRAY_BUFFER_BINDING);
    buffer.vbo = gl.createBuffer();
    gl.bindBuffer(GL.ARRAY_BUFFER, buffer.vbo);
    gl.bufferData(GL.ARRAY_BUFFER, buffer.vertexes, geom.usage);
    gl.bindBuffer(GL.ARRAY_BUFFER, curr);
    if (!buffer.indices) return;
    curr = gl.getParameter(GL.ELEMENT_ARRAY_BUFFER_BINDING);
    buffer.ibo = gl.createBuffer();
    gl.bindBuffer(GL.ELEMENT_ARRAY_BUFFER, buffer.ibo);
    gl.bufferData(GL.ELEMENT_ARRAY_BUFFER, buffer.indices, geom.usage);
    gl.bindBuffer(GL.ELEMENT_ARRAY_BUFFER, curr);
}
function Program_bindVBO(geom, buffer) {
    var gl = this._gls.gl, oesvao = this._gls._oesvao;
    if (oesvao) {
        if (buffer.vao[this.name]) {
            oesvao.bindVertexArrayOES(buffer.vao[this.name]);
            return;
        }
        buffer.vao[this.name] = oesvao.createVertexArrayOES();
        oesvao.bindVertexArrayOES(buffer.vao[this.name]);
    }
    var attribute = geom.attribute, name, at, st;
    gl.bindBuffer(GL.ARRAY_BUFFER, buffer.vbo);
    for (name in this._attribute) {
        at = this._attribute[name];
        st = attribute[name];
        gl.enableVertexAttribArray(at.location);
        gl.vertexAttribPointer(at.location, at.size, at.type, false, geom.strideSize, st.offset);
    }
    if (buffer.ibo) gl.bindBuffer(GL.ELEMENT_ARRAY_BUFFER, buffer.ibo);
}
Gls_initializers.push(function (canvas) {
    this._oesvao = this.gl.getExtension('OES_vertex_array_object');
});

////////////////////////////////////////////////////////////
// Program/Uniform

Program_initializers.push(function () {
    this._uniformFn = Object.create(null);
    this._uniformSrc = Object.create(null);
    this.uniform = Object.create(this._uniformSrc);
    Program_fetchUniforms.call(this);
});
function Program_fetchUniforms() {
    var gls = this._gls, gl = gls.gl, i, l, info, name, type, location;
    l = gl.getProgramParameter(this._program, GL.ACTIVE_UNIFORMS);
    for (i = 0; i < l; i++) {
        info = gl.getActiveUniform(this._program, i);
        name = info.name;
        type = ATTRIBUTE_TYPE[info.type];
        location = gl.getUniformLocation(this._program, name);
        if (type.isMatrix) {
            this._uniformFn[name] = gl['uniformMatrix' + type.fn].bind(gl, location, false);
        } else if (type.type === GL.SAMPLER_2D) {
            if (!gls._textureBinder) gls._textureBinder = new TextureBinder(gl);
            this._uniformFn[name] = gls._textureBinder.bind.bind(gls._textureBinder, location);
        } else {
            this._uniformFn[name] = gl['uniform' + type.fn].bind(gl, location);
        }
    }
}
function Program_applyUniforms() {
    var names, i, l, name, pu = this.uniform;
    names = Object.keys(pu);
    for (i = 0, l = names.length; i < l; i++) {
        name = names[i];
        var fn = this._uniformFn[name];
        var val = pu[name];
        if (val.texture) val = val.texture;
        if (typeof fn === 'function') fn(val);
        if (!(val instanceof WebGLTexture)) {
            this._uniformSrc[name] = pu[name];
            delete pu[name];
        }
    }
}

////////////////////////////////////////////////////////////
// Vector

function Vector(arr, offset) {
  this._arr = arr;
  this._offset = offset;
}
var qs = [
  {n: '0', p: 0}, {n: '1', p: 1}, {n: '2', p: 2}, {n: '3', p: 3},
  {n: 'x', p: 0}, {n: 'y', p: 1}, {n: 'z', p: 2}, {n: 'w', p: 3},
  {n: 'r', p: 0}, {n: 'g', p: 1}, {n: 'b', p: 2}, {n: 'a', p: 3},
];
for (var i = 0; i < qs.length; i++) {
  !function (q) {
    Object.defineProperty(Vector.prototype, q.n, {
      set: function (v) {
        this._arr[this._offset + q.p] = v;
      },
      get: function () {
        return this._arr[this._offset + q.p];
      }
    });
  }(qs[i]);
}

////////////////////////////////////////////////////////////
// Buffer

function Buffer(size, indexSize, strideSize) {
    this.vao = Object.create(null);
    this.vertexes = new ArrayBuffer(strideSize * size);
    if (indexSize) {
        if (size <= 256) {
            this.type = GL.UNSIGNED_BYTE;
        } else if (size <= 65536) {
            this.type = GL.UNSIGNED_SHORT;
        } else {
            throw new Error('Number of vertices exceeds the upper limit');
            //this.type = gl.UNSIGNED_INT; // OES_element_index_uint
        }
        this.indices = new (TYPE_BYTE[this.type].Array)(indexSize);
    }
}
function Buffer_fetchVertices(offset, size, strideSize, attribute) {
    var vertices = [], obj, at, name, arr;
    for (var i = offset, l = offset + size; i < l; i++) {
        obj = Object.create(null);
        for (name in attribute) {
            at = attribute[name];
            //arr = new (TYPE_BYTE[at.type].Array)(this.vertexes, i * strideSize + at.offset, at.size);
            arr = new Vector(new (TYPE_BYTE[at.type].Array)(this.vertexes, i * strideSize + at.offset, at.size), 0);
            if (at.size === 1) {
                !function (arr) {
                    Object.defineProperty(obj, name, {
                        get: function () {
                            return arr[0];
                        },
                        set: function (val) {
                            arr[0] = val;
                        }
                    });
                }(arr);
            } else {
                obj[name] = arr;
            }
        }
        vertices.push(obj);
    }
    return vertices;
}
function Buffer_fetchIndices(offset, size) {
    return this.indices ? this.indices.subarray(offset, offset + size) : null;
}

////////////////////////////////////////////////////////////
// Geometry

function Geometry(gl, programs, mode, usage) {
    this.programs = programs;
    this.mode = mode != null ? mode : gl.TRIANGLE_STRIP;
    this.usage = usage != null ? usage : gl.DYNAMIC_DRAW;
    this.attribute = Object.create(null);
    for (var i = 0; i < programs.length; i++) {
        mergeAttribute(this.attribute, programs[i]._attribute);
    }
    var offset = 0;
    for (var name in this.attribute) {
        var at = this.attribute[name];
        at.offset = offset;
        offset += TYPE_BYTE[at.type].byte * at.size;
    }
    this.strideSize = offset;
    //this.uniform = Object.create(null);
    this.allocated = [];
    this.buffers = [];
    this.currBufferSize = 0;
    this.currIndexBufferSize = 0;
}
Geometry.prototype.allocate = function (size, indexSize, callback) {
    if (this.currBufferSize + size > 65536) {
        Geometry_build.call(this);
    }
    this.allocated.push({
        size: size,
        indexSize: indexSize,
        callback: callback || noop,
    });
    this.currBufferSize += size;
    this.currIndexBufferSize += indexSize;
};
function Geometry_build() {
    if (this.allocated.length === 0) return;
    var buffer = new Buffer(this.currBufferSize, this.currIndexBufferSize, this.strideSize);
    //var bytes = new Uint8Array(buffer.vertexes);
    for (var ai = 0, offset = 0, indexOffset = 0; ai < this.allocated.length; ai++) {
        var a = this.allocated[ai];
        var vertices = Buffer_fetchVertices.call(buffer, offset, a.size, this.strideSize, this.attribute);
        var indices = Buffer_fetchIndices.call(buffer, indexOffset, a.indexSize);
        a.callback.call(null, vertices, indices);
        if (indices && offset > 0) {
            for (var i = 0; i < indices.length; i++) {
                indices[i] += offset;
            }
        }
        offset += a.size;
        indexOffset += a.indexSize;
    }
    this.buffers.push(buffer);
    this.allocated.length = 0;
    this.currBufferSize = 0;
    this.currIndexBufferSize = 0;
}
Gls.prototype.createGeometry = function (programs, mode, usage) {
    programs = programs.slice();
    for (var i = 0; i < programs.length; i++) {
        var program = programs[i];
        if (typeof program === 'string') programs[i] = this._program[program];
    }
    return new Geometry(this.gl, programs, mode, usage);
};

////////////////////////////////////////////////////////////
// Mesh

function createMesh(vtx, idx, ucount, vcount, attrName) {
    attrName = attrName || 'position';
    var u, v, n;
    var umax = ucount + 1;
    for (v = 0, n = 0; v <= vcount; v++) {
        for (u = 0; u < umax; u++, n++) {
            vtx[n][attrName][0] = u / ucount * 2 - 1;
            vtx[n][attrName][1] = v / vcount * 2 - 1;
        }
    }
    for (v = 0, n = 0; v < vcount; v++) {
        idx[n++] = v * umax;
        for (u = 0; u < umax; u++) {
            idx[n++] = u + v * umax;
            idx[n++] = u + (v + 1) * umax;
        }
        idx[n++] = (u - 1) + (v + 1) * umax;
    }
}

function Mesh(geom, ucount, vcount, attrName) {
    this._geom;
    this.ucount = ucount;
    this.vcount = vcount;
    var callbacks = [];
    this._callbacks = callbacks;
    var size = (ucount + 1) * (vcount + 1);
    var indexSize = (ucount * 2 + 4) * vcount;
    geom.allocate(size, indexSize, function (vtx, idx) {
        createMesh(vtx, idx, ucount, vcount, attrName);
        for (var i = 0; i < callbacks.length; i++) {
            var callback = callbacks[i];
            for (var j = 0; j < vtx.length; j++) {
                callback(vtx[j]);
            }
        }
    });
}
Mesh.prototype.transform = function (callback) {
    this._callbacks.push(callback);
    return this;
};

Geometry.prototype.addMesh = function (ucount, vcount, attrName) {
    return new Mesh(this, ucount, vcount, attrName);
};

////////////////////////////////////////////////////////////
// Texture

ATTRIBUTE_TYPE[GL.SAMPLER_2D] = {type: GL.SAMPLER_2D, size: 1, fn: '1i', isMatrix: false}; // 35678

function TextureBinder(gl) {
    this.gl = gl;
    this.max = Math.max(2, gl.getParameter(gl.MAX_COMBINED_TEXTURE_IMAGE_UNITS));
    this.units = []; // {number, locations[], texture}
}
TextureBinder.prototype.bind = function (location, texture) {
    var unit = TextureBinder_fetchByLocation.call(this, location);
    if (unit) {
        if (unit.texture === texture) {
            return TextureBinder_moveToLast.call(this, unit);
        }
        TextureBinder_unbind.call(this, unit, location);
    }
    if (!texture) return;
    unit = TextureBinder_fetchByTexture.call(this, texture);
    if (!unit) {
        unit = TextureBinder_bindTexture.call(this, texture);
    }
    TextureBinder_bindLocation.call(this, unit, location);
    TextureBinder_moveToLast.call(this, unit);
};
function TextureBinder_fetchByLocation(location) {
    var unit, i;
    for (i = 0; i < this.units.length; i++) {
        unit = this.units[i];
        if (unit.locations.indexOf(location) >= 0) return unit;
    }
}
function TextureBinder_fetchByTexture(texture) {
    var unit, i;
    for (i = 0; i < this.units.length; i++) {
        unit = this.units[i];
        if (unit.texture === texture) return unit;
    }
}
function TextureBinder_bindTexture(texture) {
    var number = TextureBinder_newNumber.call(this);
    this.gl.activeTexture(this.gl['TEXTURE' + number]);
    this.gl.bindTexture(this.gl.TEXTURE_2D, texture);
    return {number: number, locations: [], texture: texture};
}
function TextureBinder_newNumber() {
    var fs = new Array(this.max), i;
    this.units = this.units.slice(1 - this.max);
    for (i = 0; i < this.units.length; i++) {
        fs[this.units[i].number] = true;
    }
    for (i = 0; i < fs.length; i++) {
        if (!fs[i]) return i;
    }
}
function TextureBinder_bindLocation(unit, location) {
    unit.locations.push(location);
    this.gl.uniform1i(location, unit.number);
}
function TextureBinder_unbind(unit, location) {
    unit.locations.splice(unit.locations.indexOf(location), 1);
    if (unit.locations.length === 0) {
        this.units.splice(this.units.indexOf(unit), 1);
    }
}
function TextureBinder_moveToLast(unit) {
    var n = this.units.indexOf(unit);
    if (n >= 0) this.units.splice(n, 1);
    this.units.push(unit);
}

function setTextureParameters(gl, parameter) {
    var key, value, mipmap = !parameter.MIN_FILTER;
    for (key in parameter) {
        value = parameter[key];
        if (key === 'MIN_FILTER' && !(value === 'NEAREST' || value === 'LINEAR')) {
            mipmap = true;
        }
        gl.texParameteri(gl.TEXTURE_2D, gl['TEXTURE_' + key], gl[value]);
    }
    if (mipmap) gl.generateMipmap(gl.TEXTURE_2D);
}
function createImageTexture(gl, img, parameter) {
    parameter = parameter || {};
    var currentTexture = gl.getParameter(gl.TEXTURE_BINDING_2D);
    var texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
    setTextureParameters(gl, parameter);
    gl.bindTexture(gl.TEXTURE_2D, currentTexture);
    return texture;
}
Gls.prototype.createTexture = function (image, param) {
    return createImageTexture(this.gl, image, param);
};
Gls.prototype.NEAREST_CLAMP = {
    MIN_FILTER: 'NEAREST',
    MAG_FILTER: 'NEAREST',
    WRAP_S: 'CLAMP_TO_EDGE',
    WRAP_T: 'CLAMP_TO_EDGE'
};
Gls.prototype.LINEAR_CLAMP = {
    MIN_FILTER: 'LINEAR',
    MAG_FILTER: 'LINEAR',
    WRAP_S: 'CLAMP_TO_EDGE',
    WRAP_T: 'CLAMP_TO_EDGE'
};
Gls.prototype.NEAREST_REPEAT = {
    MIN_FILTER: 'NEAREST',
    MAG_FILTER: 'NEAREST',
    WRAP_S: 'REPEAT',
    WRAP_T: 'REPEAT'
};
Gls.prototype.LINEAR_REPEAT = {
    MIN_FILTER: 'LINEAR',
    MAG_FILTER: 'LINEAR',
    WRAP_S: 'REPEAT',
    WRAP_T: 'REPEAT'
};

////////////////////////////////////////////////////////////
// Framebuffer

function Framebuffer(gls, param) {
    param = Object.create(param || {});
    param.width = param.width || gls.canvas.width;
    param.height = param.height || gls.canvas.height;
    param.texture = param.texture || gls.NEAREST_CLAMP;
    param.depth = param.depth !== false;
    Framebuffer_init.call(this, gls.gl, param);
    this.width = param.width;
    this.height = param.height;
}
function Framebuffer_init(gl, param) {
    var currentFramebuffer = gl.getParameter(gl.FRAMEBUFFER_BINDING);
    var framebuffer = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
    var depthRenderbuffer = null, currentRenderbuffer;
    if (param.depth !== false) {
        currentRenderbuffer = gl.getParameter(gl.RENDERBUFFER_BINDING);
        depthRenderbuffer = gl.createRenderbuffer();
        gl.bindRenderbuffer(gl.RENDERBUFFER, depthRenderbuffer);
        gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT16, param.width, param.height);
        gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, depthRenderbuffer);
        gl.bindRenderbuffer(gl.RENDERBUFFER, currentRenderbuffer);
    }
    var currentTexture = gl.getParameter(gl.TEXTURE_BINDING_2D);
    var texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, param.width, param.height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    setTextureParameters(gl, param.texture);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
    gl.bindTexture(gl.TEXTURE_2D, currentTexture);
    gl.bindFramebuffer(gl.FRAMEBUFFER, currentFramebuffer);
    this.framebuffer = framebuffer;
    this.depthRenderbuffer = depthRenderbuffer;
    this.texture = texture;
}

Gls.prototype.createFramebuffer = function (param) {
    return new Framebuffer(this, param);
};
Gls.prototype.bindFramebuffer = function (framebuffer) {
    if (framebuffer) {
        this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, framebuffer.framebuffer);
        this.gl.viewport(0, 0, framebuffer.width, framebuffer.height);
    } else {
        this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, null);
        this.gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    }
};

////////////////////////////////////////////////////////////
// init depth
Gls_initializers.push(function (canvas, param) {
    this._clearParam = GL.COLOR_BUFFER_BIT | (param.depth !== false ? GL.DEPTH_BUFFER_BIT : 0) | (param.stencil === true ? GL.STENCIL_BUFFER_BIT : 0);
    if (param.depth !== false) {
        this.gl.enable(GL.DEPTH_TEST);
        this.gl.clearDepth(1);
    }
});
Gls.prototype.clear = function (param) {
    this.gl.clear(this._clearParam | param);
};

////////////////////////////////////////////////////////////
// WebGL methods and properties

['clearColor', 'enable', 'disable', 'blendFunc', 'blendFuncSeparate', 'viewport'].forEach(function (name) {
    Gls.prototype[name] = function () {
        this.gl[name].apply(this.gl, arguments);
    };
});
[
    'POINTS', 'LINES', 'LINE_STRIP', 'TRIANGLES','TRIANGLE_STRIP',
    'CULL_FACE',
    'BLEND', 'SRC_ALPHA', 'ONE_MINUS_SRC_ALPHA', 'ONE', 'ZERO',
].forEach(function (name) {
    Gls[name] = Gls.prototype[name] = GL[name];
}.bind(this));

////////////////////////////////////////////////////////////

export default Gls;

