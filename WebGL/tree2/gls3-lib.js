!function () {
'use strict';

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

var Geometry = Gls.prototype.createGeometry.call({gl:{}}, []).constructor;
Geometry.prototype.createMesh = function (ucount, vcount, attrName) {
    return new Mesh(this, ucount, vcount, attrName);
}

////////////////////////////////////////////////////////////
// Mouse

function Mouse(gls, c) {
    this.x = c.x || 0;
    this.y = c.y || 0;
    this.z = c.z || 0;
    this.delayX = c.delayX || c.delay || 0;
    this.delayY = c.delayY || c.delay || 0;
    this.delayZ = c.delayZ || c.delay || 0;
    this[0] = this.dispX = this.x;
    this[1] = this.dispY = this.y;
    this[2] = this.dispZ = this.z;
    gls.canvas.addEventListener('mousemove', function (event) {
        var rect = event.target.getBoundingClientRect();
        this.x = (event.pageX - rect.left - window.pageXOffset) / rect.width * 2 - 1;
        this.y = 1 - (event.pageY - rect.top - window.pageYOffset) / rect.height * 2;
    }.bind(this));
    gls.canvas.addEventListener('mousewheel', function (event) {
        this.z += event.wheelDelta;
    }.bind(this), {passive: true});
}
Mouse.prototype.update = function () {
    this[0] = this.dispX = this.dispX * this.delayX + this.x * (1 - this.delayX);
    this[1] = this.dispY = this.dispY * this.delayY + this.y * (1 - this.delayY);
    this[2] = this.dispZ = this.dispZ * this.delayZ + this.z * (1 - this.delayZ);
};
Gls.prototype.createMouse = function (c) {
    return new Mouse(this, c || {});
};

////////////////////////////////////////////////////////////
// Camera

Gls.prototype.createCamera = function (c) {
    var translation = vec3.fromValues(-c.x || 0, -c.y || 0, -c.z || 0);
    var pMatrix = mat4.perspective(mat4.create(), c.fov * Math.PI / 180, this.canvas.width / this.canvas.height, c.near, c.far);

    return function (p) {
        var rotation = quat.create();
        quat.rotateZ(rotation, rotation, (p.roll || 0) * Math.PI / 180);
        quat.rotateX(rotation, rotation, (p.tilt || 0) * Math.PI / 180);
        quat.rotateY(rotation, rotation, (p.pan || 0) * Math.PI / 180);

        var vMatrix = mat4.fromRotationTranslation(mat4.create(), rotation, translation);
        var vpMatrix = mat4.mul(mat4.create(), pMatrix, vMatrix);
        mat4.translate(vpMatrix, vpMatrix, vec3.fromValues(-p.x || 0, -p.y || 0, -p.z || 0));

        return vpMatrix;
    };
};

}();