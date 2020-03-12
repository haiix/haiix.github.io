export default class Tree {
  // 葉のテクスチャ
  static createLeafImage() {
      const imageData = document.createElement('canvas').getContext('2d').createImageData(32, 32);
      const b = new Uint32Array(imageData.data.buffer);
      for (let idx = 0; idx < 32; idx++) {
        const r = idx * 2.4, cr = Math.cos(r), sr = Math.sin(r), len = Math.sqrt(idx) * 2.5, didx = idx / 32;
        for (let y = -2; y <= 2; y++) {
          for (let x = -2; x <= 2; x++) {
            let ox = x + didx, oy = y + didx;
            [ox, oy] = [ox * cr + oy * sr, oy * cr - ox * sr];
            if (ox * ox + oy * oy * 4 > 8) continue;
            const px = x + Math.floor(len * cr) + 16;
            const py = y + Math.floor(len * sr) + 16;
            const v = 96 << 0 | (idx * 2 + 128) << 8 | 0 << 16 | 255 << 24;
            b[px + py * imageData.width] = v;
          }
        }
      }
      return imageData;
  }

  constructor(treeGeom, leafGeom, treeAngle, treeScale, treePosition) {
    const X = 0, Y = 1, Z = 2, W = 3;

    const TREE_BRANCH_NUM = 15;           // 枝の数
    const TREE_BRANCH_THICKNESS = 3;        // 枝の太さ
    const TREE_BRANCH_REDUCTION_RATE = 0.65; // 次の枝の縮小率
    const TREE_BRANCH_EXPAND = 0.4;         // 枝の広がり具合

    function treeR(p, idx, m) {
      const q = idx & (m - 1);
      if (q === 0) return;
      vec3.rotateX(p, p, vec3.create(), TREE_BRANCH_EXPAND); // 枝の広がり
      vec3.rotateY(p, p, vec3.create(), idx - q);            // 枝の向き
      //vec3.rotateX(p, p, vec3.create(), TREE_BRANCH_EXPAND * 1.2); // 枝の広がり2
      vec3.scale(p, p, TREE_BRANCH_REDUCTION_RATE);          // 縮小
      vec3.add(p, p, vec3.fromValues(0, 1, 0));              // 移動
    }

    for (let idx = 2; idx <= TREE_BRANCH_NUM; idx += 2) {
      // 枝を追加
      treeGeom.addMesh({
        unum: 3,     // 横方向のメッシュ分割数
        vnum: 1,     // 縦方向のメッシュ分割数
        uloop: true, // メッシュの左端と右端が接続している (頂点数を削減)
        shape(attribute) {
          const X = 0, Y = 1, Z = 2, W = 3;
          const p = attribute.position;

          attribute.color[0] = 96;
          attribute.color[1] = 64;
          attribute.color[2] = 32;
          attribute.color[3] = 255;

          // メッシュを筒状に変換
          vec3.rotateY(p, vec3.fromValues(0, p[Y], (TREE_BRANCH_THICKNESS - p[Y]) / 32), vec3.create(), p[X] * Math.PI);
          // 位置とサイズを調整(原点が回転軸になるように)
          vec3.add(p, p, vec3.fromValues(0, 1, 0));
          vec3.scale(p, p, 2);

          // 再帰的な配置
          for (let m = 1; m <= TREE_BRANCH_NUM; m += m) {
            treeR(p, idx, m);
          }

          vec3.rotateY(p, p, vec3.create(), treeAngle);
          vec3.scale(p, p, treeScale);
          vec3.add(p, p, treePosition);
        },
      });
    }
    // 葉
    for (let idx = 1; idx <= TREE_BRANCH_NUM; idx += 1) {

      const op = vec3.fromValues(0, 4, 0);
      for (let m = 1; m <= TREE_BRANCH_NUM; m += m) {
        treeR(op, idx, m);
      }

      const r1 = Math.random() * Math.PI * 2;
      const r2 = Math.random() * Math.PI * 2;
      for (let leafID= 0; leafID < 3; leafID++) {
        const r3 = Math.random() * Math.PI * 2;
        leafGeom.addMesh({
          unum: 1,
          vnum: 1,
          uloop: false,
          shape: function (attribute) {
            var p = attribute.position;
            attribute.textureCoord[X] = (p[X] + 1) / 2;
            attribute.textureCoord[Y] = (p[Y] + 1) / 2;
            vec3.rotateZ(p, p, vec3.create(), r3);

            if (leafID === 1) {
              vec3.rotateX(p, p, vec3.create(), Math.PI / 2);
            } else if (leafID === 2) {
              vec3.rotateY(p, p, vec3.create(), Math.PI / 2);
            }

            vec3.rotateX(p, p, vec3.create(), r1);
            vec3.rotateZ(p, p, vec3.create(), r2);

            vec3.scale(p, p, 0.8);
            vec3.add(p, p, op);

            vec3.rotateY(p, p, vec3.create(), treeAngle);
            vec3.scale(p, p, treeScale);
            vec3.add(p, p, treePosition);
          },
        });
      }
    }
  }
}