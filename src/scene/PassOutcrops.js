import * as T from "three";
import { seeded } from "./Materials.js";
import { highlandHeight } from "./Highlands.js";

// Dark, tilted foreland beds surface along the two edges of the western pass.
// The buried end follows the ground; the exposed lips break into thinner plates.
export function createPassOutcrops(scene) {
  const random = seeded(4157),
    positions = [],
    colors = [],
    tex = [],
    bounds = [];
  const slate = new T.Color(),
    point = new T.Vector3();
  const banks = [
    [-510, 180, 1, 23],
    [-309, 181, -1, 25],
    [-466, 11, 1, 19],
    [-233, 9, -1, 18],
    [-563, -118, 1, 15],
    [-410, -171, 1, 17],
  ];
  for (const [bx, bz, sign, count] of banks) {
    for (let j = 0; j < count; j++) {
      const x = bx + sign * (random() - 0.46) * 72,
        z = bz + (random() - 0.5) * 97;
      const size = 13 + 29 * random(),
        dx = (sign * 0.91 + (random() - 0.5) * 0.42) * size;
      const dz = -(0.85 + random() * 0.8) * size,
        h = (0.41 + 0.58 * random()) * size;
      const thick = size * (0.16 + random() * 0.16),
        flare = random() * 4;
      const length = Math.hypot(dx, dz),
        nx = dz / length,
        nz = -dx / length;
      const start = highlandHeight(x, z) - 3,
        box = new T.Box3();
      function vertex(t, k) {
        const s = Math.sin(t * Math.PI),
          profile = [
            [-1, 0.18],
            [-0.16, 0.94],
            [0.48, 1],
            [1, -0.68],
            [-0.54, -0.86],
          ][k];
        const burst = (1 - t) ** 0.72 * (0.72 + 0.35 * s);
        const side = thick * profile[0] * burst;
        const px = x + t * dx + nx * side,
          pz = z + t * dz + nz * side;
        const shelf =
          start +
          t ** 1.32 * h +
          profile[1] * thick * burst +
          flare * s +
          thick * 0.13 * s * Math.sin(t * 19 + profile[0] * 3 + x);
        const y =
          k < 3
            ? shelf
            : T.MathUtils.lerp(
                highlandHeight(px, pz) - 2,
                shelf,
                T.MathUtils.smoothstep(t, 0.62, 1),
              );
        return [px, y, pz];
      }
      for (let i = 0; i < 8; i++)
        for (let k = 0; k < 5; k++) {
          const n = (k + 1) % 5,
            t = i / 8,
            u = (i + 1) / 8;
          const a = vertex(t, k),
            b = vertex(t, n),
            c = vertex(u, k),
            d = vertex(u, n);
          slate.set([0x293648, 0x8bafbf, 0x28384b, 0x201e32, 0x333446][k]);
          if (k === 3 && j % 4 === 0) slate.set(0x52353f);
          slate.multiplyScalar(0.83 + 0.16 * Math.sin(i * 1.83 + j));
          for (const p of [a, c, b, b, c, d]) {
            positions.push(...p);
            colors.push(slate.r, slate.g, slate.b);
            tex.push(p[0] / 26, (p[1] + p[2]) / 26);
            box.expandByPoint(point.fromArray(p));
          }
        }
      bounds.push(box.expandByScalar(1));
    }
  }
  const g = new T.BufferGeometry();
  g.setAttribute("position", new T.Float32BufferAttribute(positions, 3));
  g.setAttribute("color", new T.Float32BufferAttribute(colors, 3));
  g.setAttribute("uv", new T.Float32BufferAttribute(tex, 2));
  g.computeVertexNormals();
  g.computeBoundingBox();
  const m = new T.MeshStandardMaterial({
    vertexColors: true,
    side: T.DoubleSide,
    roughness: 0.69,
  });
  const mesh = new T.Mesh(g, m);
  mesh.name = "western-pass-schist";
  mesh.receiveShadow = true;
  scene.add(mesh);
  const broad = g.boundingBox.clone().expandByScalar(2);
  return {
    material: m,
    contains(p) {
      return (
        broad.containsPoint(p) && bounds.some((box) => box.containsPoint(p))
      );
    },
  };
}
