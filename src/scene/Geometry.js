import * as T from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
export class Builder {
  constructor(scene) {
    this.scene = scene;
    this.groups = new Map();
    this.temp = new T.Object3D();
  }
  add(g, m, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0) {
    g = g.index ? g.toNonIndexed() : g;
    g.deleteAttribute("color");
    this.temp.position.set(x, y, z);
    this.temp.rotation.set(rx, ry, rz);
    this.temp.scale.set(1, 1, 1);
    this.temp.updateMatrix();
    g.applyMatrix4(this.temp.matrix);
    if (!this.groups.has(m)) this.groups.set(m, []);
    this.groups.get(m).push(g);
  }
  box(x, y, z, w, h, d, m, ry = 0) {
    const g = new T.BoxGeometry(w, h, d);
    const uv = g.attributes.uv;
    for (let i = 0; i < uv.count; i++) {
      const face = Math.floor(i / 4);
      uv.setXY(
        i,
        (uv.getX(i) * (face < 2 ? d : w)) / 12,
        (uv.getY(i) * (face === 2 || face === 3 ? d : h)) / 12,
      );
    }
    this.add(g, m, x, y, z, 0, ry);
  }
  cyl(x, y, z, r1, r2, h, m, n = 16) {
    const g = new T.CylinderGeometry(r1, r2, h, n);
    const uv = g.attributes.uv;
    for (let i = 0; i < uv.count; i++)
      uv.setXY(
        i,
        (uv.getX(i) * Math.PI * (r1 + r2)) / 12,
        (uv.getY(i) * h) / 12,
      );
    this.add(g, m, x, y, z);
  }
  sphere(x, y, z, r, m, sx = 1, sy = 1, sz = 1) {
    const g = new T.SphereGeometry(r, 10, 8);
    g.scale(sx, sy, sz);
    this.add(g, m, x, y, z);
  }
  beam(a, b, r, m) {
    const va = new T.Vector3(...a),
      vb = new T.Vector3(...b),
      g = new T.CylinderGeometry(r, r, va.distanceTo(vb), 6),
      q = new T.Quaternion().setFromUnitVectors(
        new T.Vector3(0, 1, 0),
        vb.clone().sub(va).normalize(),
      );
    g.applyQuaternion(q);
    const p = va.add(vb).multiplyScalar(0.5);
    this.add(g, m, p.x, p.y, p.z);
  }
  finish() {
    for (const [mat, gs] of this.groups) {
      const geo = mergeGeometries(gs, false);
      gs.forEach((g) => g.dispose());
      if (!geo) continue;
      if (mat.vertexColors && !geo.hasAttribute("color")){
        const colors=new Float32Array(geo.attributes.position.count*3).fill(1);
        geo.setAttribute("color",new T.BufferAttribute(colors,3));
      }
      const mesh = new T.Mesh(geo, mat);
      mesh.castShadow = mat !== this.scene.userData.glass;
      mesh.receiveShadow = true;
      this.scene.add(mesh);
    }
    this.groups.clear();
  }
}
export function archShape(w, h) {
  const s = new T.Shape();
  s.moveTo(-w / 2, 0);
  s.lineTo(w / 2, 0);
  s.lineTo(w / 2, h * 0.62);
  s.quadraticCurveTo(w * 0.42, h * 0.86, 0, h);
  s.quadraticCurveTo(-w * 0.42, h * 0.86, -w / 2, h * 0.62);
  s.closePath();
  return s;
}
export function archGeo(w, h, depth = 0.25, frame = 0) {
  const s = archShape(w, h);
  if (frame) {
    const hole = archShape(w - frame * 2, h - frame * 1.5);
    hole.translate = undefined;
    const pts = hole.getPoints(18).map((p) => new T.Vector2(p.x, p.y + frame));
    s.holes.push(new T.Path(pts));
  }
  return new T.ExtrudeGeometry(s, {
    depth,
    bevelEnabled: frame > 0,
    bevelSize: 0.07,
    bevelThickness: 0.07,
    bevelSegments: 1,
    steps: 1,
    curveSegments: 10,
  });
}
