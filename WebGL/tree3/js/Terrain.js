export default class Terrain {
  constructor (geom) {
    const mesh = geom.createMesh(40, 40);
    mesh.transform(attribute => {
      const p = attribute.position;

      attribute.color[0] = 96;
      attribute.color[1] = 160;
      attribute.color[2] = 96;
      attribute.color[3] = 255;

      vec3.scale(p, p, 10);
      vec3.rotateX(p, p, vec3.create(), Math.PI / -2);
    });
  }
}