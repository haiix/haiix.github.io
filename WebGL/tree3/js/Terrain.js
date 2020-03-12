export default class Terrain {
  constructor (geom) {
    geom.addMesh({
      unum: 40,
      vnum: 40,
      uloop: false,
      shape(attribute) {
        const p = attribute.position;

        attribute.color[0] = 96;
        attribute.color[1] = 160;
        attribute.color[2] = 96;
        attribute.color[3] = 255;

        vec3.scale(p, p, 10);
        vec3.rotateX(p, p, vec3.create(), Math.PI / -2);
      },
    });
  }
}