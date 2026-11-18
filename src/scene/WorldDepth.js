import * as T from "three";
import { Builder } from "./Geometry.js";
import { seeded } from "./Materials.js";
import { heightSampler } from "./Heightfield.js";

function terrainNoise(x, z, seed) {
  function hash(i, j) {
    let v = Math.imul(i, 374761393) + Math.imul(j, 668265263) + seed;
    v = Math.imul(v ^ (v >>> 13), 1274126177);
    return ((v ^ (v >>> 16)) >>> 0) / 4294967296;
  }
  const i = Math.floor(x),
    j = Math.floor(z);
  let u = x - i,
    v = z - j;
  u *= u * (3 - 2 * u);
  v *= v * (3 - 2 * v);
  return T.MathUtils.lerp(
    T.MathUtils.lerp(hash(i, j), hash(i + 1, j), u),
    T.MathUtils.lerp(hash(i, j + 1), hash(i + 1, j + 1), u),
    v,
  );
}

export function createWorldDepth(scene, m) {
  const ranges = [];
  // Asymmetric horns fracture the skyline of each range at a different scale.
  const horns = [
    [-1065, 108, 93, 34],
    [-795, 76, 56, 28],
    [-569, 122, 88, 34],
    [-352, 69, 55, 21],
    [-184, 114, 72, 31],
    [70, 93, 69, 29],
    [318, 127, 95, 39],
    [511, 77, 60, 24],
    [772, 136, 97, 38],
    [1036, 95, 74, 26],
  ];
  const random = seeded(319),
    b = new Builder(scene);
  // Separate mountain ranges keep their own skyline, depth and snow line.
  for (let layer = 0; layer < 3; layer++) {
    const nx = 280,
      nz = 40,
      p = [],
      colors = [],
      uv = [],
      idx = [],
      color = new T.Color(),
      snowColor = new T.Color(0xdbe9ee);
    for (let j = 0; j <= nz; j++)
      for (let i = 0; i <= nx; i++) {
        const x = -1350 + (i / nx) * 2700,
          z = -330 - layer * 270 - (j / nz) * 250;
        const seed = 813 + layer * 19,
          warp = terrainNoise(x * 0.008, z * 0.009, seed),
          t = j / nz,
          crest = 0.43 + 0.23 * warp,
          envelope = Math.max(
            0,
            1 - Math.abs(t - crest) / (t < crest ? crest : 1 - crest),
          ),
          fault = Math.abs(
            terrainNoise(x * 0.013 + warp * 0.9, z * 0.011, seed + 2) - 0.51,
          ),
          spine = Math.max(0, 1 - fault * 2.7),
          ribs =
            1 -
            2 *
              Math.abs(
                terrainNoise(x * 0.037 + warp, z * 0.029, seed + 3) - 0.5,
              ),
          grit = terrainNoise(x * 0.082, z * 0.067, seed + 4),
          ordinary =
            -11 +
            Math.pow(envelope, 0.92) *
              (38 +
                layer * 20 +
                Math.pow(spine, 2.4) * (75 + layer * 32) +
                ribs * 31 +
                grit * 10);
        let tooth = 0;
        for (const [center, up, left, right] of horns) {
          const along = x - center - layer * 97 - (t - crest) * 131;
          tooth = Math.max(
            tooth,
            up * (1 - Math.abs(along) / (along < 0 ? left : right)),
          );
        }
        const h = ordinary + tooth * envelope ** 1.6 * (0.68 + 0.2 * layer);
        const snow = T.MathUtils.smoothstep(
          h + ribs * 33 + grit * 18 - fault * 77,
          67 + layer * 4,
          111 + layer * 4,
        );
        color.set(layer === 0 ? 0x50616b : 0x718491);
        color.lerp(snowColor, snow);
        color.multiplyScalar(0.63 + 0.34 * ribs + 0.2 * grit);
        p.push(x, h, z);
        colors.push(color.r, color.g, color.b);
        uv.push(i / 10, j / 6);
      }
    for (let j = 0; j < nz; j++)
      for (let i = 0; i < nx; i++) {
        const a = j * (nx + 1) + i;
        idx.push(a, a + 1, a + nx + 1, a + 1, a + nx + 2, a + nx + 1);
      }
    const g = new T.BufferGeometry();
    g.setAttribute("position", new T.Float32BufferAttribute(p, 3));
    g.setAttribute("color", new T.Float32BufferAttribute(colors, 3));
    g.setAttribute("uv", new T.Float32BufferAttribute(uv, 2));
    g.setIndex(idx);
    g.computeVertexNormals();
    const normals = g.attributes.normal,
      surface = g.attributes.color;
    const exposedRock = new T.Color(0x41576b);
    for (let i = 0; i < normals.count; i++) {
      const x = p[i * 3],
        y = p[i * 3 + 1],
        z = p[i * 3 + 2];
      const fissure = terrainNoise(x * 0.066 + y * 0.022, z * 0.051, 234);
      const slope = normals.getY(i) + 0.22 * normals.getX(i);
      const exposed =
        1 - T.MathUtils.smoothstep(slope + (fissure - 0.5) * 0.62, 0.36, 0.8);
      color.fromBufferAttribute(surface, i).lerp(exposedRock, exposed * 0.77);
      color.multiplyScalar(0.85 + fissure * 0.21);
      surface.setXYZ(i, color.r, color.g, color.b);
    }
    const mesh = new T.Mesh(
      g,
      new T.MeshStandardMaterial({ vertexColors: true, roughness: 1 }),
    );
    mesh.userData.rockScale = 0.028;
    ranges.push(heightSampler(g, nx + 1));
    scene.add(mesh);
  }
  // Wind-shaped old trees and broken branches around the conifer margin.
  for (let i = 0; i < 22; i++) {
    const x = -210 + random() * 65,
      z = -110 + random() * 60,
      h = 8 + random() * 8;
    b.beam([x, 30, z], [x + 1, 30 + h, z], 0.38, m.wood);
    for (let k = 0; k < 4; k++) {
      const a = k * 2.3 + i;
      const root = [x + 0.5, 34 + k * 2, z],
        tip = [x + Math.sin(a) * 4, 38 + k * 2, z + Math.cos(a) * 4];
      b.beam(root, tip, 0.13, m.wood);
      for (const turn of [-1, 1])
        b.beam(
          tip,
          [
            tip[0] + Math.sin(a + turn * 0.6) * 1.8,
            tip[1] + 2.2,
            tip[2] + Math.cos(a + turn * 0.6) * 1.8,
          ],
          0.06,
          m.wood,
        );
    }
  }
  b.finish();
  return (x, z) => Math.max(ranges[0](x, z), ranges[1](x, z), ranges[2](x, z));
}
