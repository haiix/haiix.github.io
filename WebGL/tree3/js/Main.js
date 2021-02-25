import WorldChunk from './WorldChunk.js';

export default class Main {
  async main() {
    window.gl = new Gls('#view', {alpha: true, depth: true, antialias: false});
    WorldChunk.init(gl);

    // 画面の背景色を設定
    gl.clearColor(0.6, 0.8, 1.0, 1);

    // 視点を作成
    this.camera = gl.createCamera({
      fov: 45,
      near: 0.1,
      far: 100,
      z: 20,
    });

    // マウス制御処理を作成
    this.mouse = gl.createMouse({
      delay: 0.9,
    });

    this.worldChunk = new WorldChunk(gl);
  }

  // メインループ
  animationFrame() {
    this.mouse.update();

    // 視点
    const mvp = this.camera({
        pan: this.mouse.dispX * -180,
        tilt: this.mouse.dispY * 90,
        roll: 0,
        y: 2,
    });

    // 描画
    gl.clear();
    this.worldChunk.draw(gl, mvp);
  }
}
