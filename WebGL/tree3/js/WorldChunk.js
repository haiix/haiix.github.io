import Terrain from './Terrain.js';
import Tree from './Tree.js';

export default class WorldChunck {
  static init(gl) {
    // 葉テクスチャ作成
    gl.textureShader.uniform.texture = gl.createTexture(Tree.createLeafImage(), gl.NEAREST_CLAMP);
  }

  constructor(gl) {
    // 地面
    this.terrainGeom = gl.createGeometry([gl.mainShader], gl.LINE_STRIP);
    new Terrain(this.terrainGeom);

    // 木
    this.treeGeom = gl.createGeometry([gl.mainShader], gl.TRIANGLE_STRIP);
    this.leafGeom = gl.createGeometry([gl.textureShader], gl.TRIANGLE_STRIP);
    for (let ts = 0; ts < 20; ts++) {
      const treeAngle = Math.random() * Math.PI * 2;
      const treeScale = Math.random() * 0.4 + 0.8;
      const treePosition = vec3.fromValues(
        Math.random() * 20 - 10,
        0,
        Math.random() * 20 - 10,
      );
      new Tree(this.treeGeom, this.leafGeom, treeAngle, treeScale, treePosition);
    }
  }

  draw(gl, mvp) {
    gl.enable(gl.CULL_FACE);
    gl.mainShader.uniform.mvp = mvp;
    gl.mainShader.draw(this.terrainGeom);
    gl.mainShader.draw(this.treeGeom);

    gl.disable(gl.CULL_FACE);
    gl.textureShader.uniform.mvp = mvp;
    gl.textureShader.draw(this.leafGeom);
  }
}