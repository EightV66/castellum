import * as T from "three";
import { archGeo } from "./Geometry.js";

// Local +Z faces the gate. Heights are measured from the courtyard pavement.
const tau = Math.PI * 2;
const towerZ = 21;
const towerXs = [-15, 15];
const plinth = 65;
const crownHeight = 36;

function relief(b, shape, material, x, y, z, depth, rotation = 0) {
  const geo = new T.ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: false,
    curveSegments: 8,
  });
  // ExtrudeGeometry projects UVs in units of one metre; match the wall masonry.
  const uv = geo.attributes.uv;
  for (let i = 0; i < uv.count; i++)
    uv.setXY(i, uv.getX(i) / 12, uv.getY(i) / 12);
  b.add(geo, material, x, y, z, 0, rotation);
}

function rib(b, points, radius, material, steps = 10) {
  const curve = new T.CatmullRomCurve3(points.map((p) => new T.Vector3(...p)));
  b.add(new T.TubeGeometry(curve, steps, radius, 6, false), material);
}

function finial(b, m, x, y, z, r, h) {
  const profile = [
    [1, 0],
    [1, 0.06],
    [0.74, 0.1],
    [0.8, 0.23],
    [0.57, 0.27],
    [0.32, 0.65],
    [0.39, 0.69],
    [0.13, 0.85],
    [0.05, 1],
  ];
  b.add(
    new T.LatheGeometry(
      profile.map(([w, t]) => new T.Vector2(w * r, h * t)),
      8,
    ),
    m.trim,
    x,
    y,
    z,
  );
}

// No core or horizontal caps inside the spire. Each bay is bounded by inclined
// arrises, a stone ring and two rising arches. The ray tests exercise the voids.
function openSpire(b, m, x, y, z) {
  const tiers = [
    [0, 6.7],
    [0.3, 4.5],
    [0.55, 2.95],
    [0.76, 1.72],
    [0.9, 0.79],
    [1, 0.13],
  ];
  function corner(i, t, r) {
    const a = ((i + 0.5) * tau) / 8;
    return [x + r * Math.sin(a), y + t * crownHeight, z + r * Math.cos(a)];
  }
  for (let j = 0; j < tiers.length - 1; j++) {
    const [t, r] = tiers[j],
      [u, s] = tiers[j + 1];
    for (let i = 0; i < 8; i++) {
      const A = corner(i, t, r),
        B = corner(i + 1, t, r),
        C = corner(i, u, s),
        D = corner(i + 1, u, s);
      const thickness = 0.09 + 0.055 * r;
      b.beam(A, C, thickness, m.trim);
      b.beam(A, B, thickness * 0.83, m.stone);
      if (j < 4) {
        const mid = C.map((v, k) => (v + D[k]) / 2);
        for (const [start, end] of [
          [A, C],
          [B, D],
        ]) {
          const foot = start.map((v, k) => T.MathUtils.lerp(v, end[k], 0.24));
          const spring = start.map((v, k) => T.MathUtils.lerp(v, end[k], 0.53));
          const shoulder = spring.map((v, k) =>
            T.MathUtils.lerp(v, mid[k], 0.37),
          );
          shoulder[1] += 0.14 * (u - t) * crownHeight;
          rib(b, [foot, spring, shoulder, mid], thickness * 0.61, m.trim, 6);
        }
        if (j < 3) {
          const c = corner(i, t + (u - t) * 0.53, (r + s) * 0.5 + 0.17);
          finial(b, m, ...c, thickness * 0.94, 0.65 + 0.12 * r);
        }
      }
    }
  }
  finial(b, m, x, y + crownHeight - 0.4, z, 0.62, 2.3);
  b.beam(
    [x, y + crownHeight + 1.6, z],
    [x, y + crownHeight + 3.7, z],
    0.095,
    m.gold,
  );
  b.beam(
    [x - 0.68, y + crownHeight + 2.8, z],
    [x + 0.68, y + crownHeight + 2.8, z],
    0.085,
    m.gold,
  );
}

function westTower(b, m, base, x) {
  const z = towerZ;
  // A square masonry base becomes an open belfry and then an octagonal crown.
  b.box(x, base + 19, z, 10.7, 38, 10.7, m.stone);
  for (const [y, w, h] of [
    [1, 12.5, 2],
    [16, 11.3, 0.65],
    [34, 11.1, 0.75],
    [38, 11.5, 1.3],
    [54, 10.8, 1],
    [64.7, 12.1, 1.2],
  ])
    b.box(x, base + y, z, w, h, w, m.trim);
  for (const sx of [-1, 1])
    for (const sz of [-1, 1]) {
      const px = x + sx * 4.72,
        pz = z + sz * 4.72;
      b.box(px, base + 20, pz, 2.9, 40, 2.9, m.stone);
      b.box(px, base + 50.1, pz, 1.95, 24, 1.95, m.stone);
      for (const [dx, dz] of [
        [sx * 0.91, sz * 0.53],
        [sx * 0.53, sz * 0.91],
      ]) {
        b.cyl(px + dx, base + 31, pz + dz, 0.29, 0.46, 61, m.trim, 8);
      }
      finial(b, m, px + sx * 0.24, base + 60, pz + sz * 0.24, 1.25, 11);
    }
  for (let i = 0; i < 4; i++) {
    const a = (i * Math.PI) / 2,
      sn = Math.sin(a),
      cs = Math.cos(a);
    const arch = (w, h, y, offset, frame, mat, depth = 0.35) => {
      b.add(
        archGeo(w, h, depth, frame),
        mat,
        x + sn * offset,
        base + y,
        z + cs * offset,
        0,
        a,
      );
    };
    arch(5.9, 15.1, 18, 5.36, 0, m.black);
    arch(4.95, 14.1, 18.2, 5.74, 0, m.glass, 0.12);
    arch(6.25, 15.8, 17.7, 5.79, 0.41, m.trim);
    for (const f of [-1, 1]) {
      const d = f * 1.18;
      b.add(
        archGeo(2.38, 10.3, 0.28, 0.19),
        m.dark,
        x + cs * d + sn * 5.97,
        base + 18.25,
        z - sn * d + cs * 5.97,
        0,
        a,
      );
      const jamb = f * 3.42;
      b.cyl(
        x + cs * jamb + sn * 5.5,
        base + 18.25,
        z - sn * jamb + cs * 5.5,
        0.35,
        0.49,
        35.6,
        m.trim,
        8,
      );
      b.cyl(
        x + cs * jamb + sn * 5.5,
        base + 33.25,
        z - sn * jamb + cs * 5.5,
        0.52,
        0.36,
        0.64,
        m.trim,
        8,
      );
    }
    b.add(
      new T.TorusGeometry(0.83, 0.17, 6, 24),
      m.dark,
      x + sn * 6.0,
      base + 29.3,
      z + cs * 6.0,
      0,
      a,
    );
    for (const [y, h, w] of [
      [38.5, 15.0, 7.9],
      [54.2, 10.25, 7.4],
    ]) {
      arch(w, h, y, 4.7, 0.72, m.stone, 0.85);
      arch(w - 0.85, h - 0.65, y + 0.28, 5.5, 0.21, m.trim, 0.24);
      for (const side of [-1, 1]) {
        const d = side * w * 0.2;
        b.add(
          archGeo(w * 0.405, h * 0.78, 0.45, 0.27),
          m.trim,
          x + cs * d + sn * 5.16,
          base + y + 0.3,
          z - sn * d + cs * 5.16,
          0,
          a,
        );
      }
    }
  }
  const bellProfile = [
    [0.23, 0],
    [1.25, 0.14],
    [1.26, 0.31],
    [1.01, 0.52],
    [0.76, 1.45],
    [0.5, 1.8],
    [0.18, 1.9],
  ];
  b.add(
    new T.LatheGeometry(
      bellProfile.map(([r, y]) => new T.Vector2(r, y)),
      18,
    ),
    m.gold,
    x,
    base + 45.4,
    z,
  );
  b.beam([x - 4.25, base + 47.6, z], [x + 4.25, base + 47.6, z], 0.31, m.wood);
  b.beam([x, base + 45.1, z], [x, base + 47.8, z], 0.14, m.metal);
  b.sphere(x, base + 45.14, z, 0.28, m.metal);
  b.cyl(x, base + 64.9, z, 6.9, 6.4, 1.35, m.trim, 8);
  openSpire(b, m, x, base + plinth, z);
}

function entrance(b, m, base, x, w, h) {
  const back = 19.05;
  b.add(archGeo(w, h, 0.25), m.wood, x, base + 0.5, back);
  b.box(x, base + h * 0.31, back + 0.3, 0.12, h * 0.57, 0.13, m.black);
  for (const s of [-1, 1])
    for (const f of [0.21, 0.4])
      b.box(
        x + s * w * 0.24,
        base + h * f,
        back + 0.36,
        w * 0.41,
        0.18,
        0.12,
        m.metal,
      );
  // Cut open the projecting porch on the front and recess the doors behind it.
  for (let i = 0; i < 4; i++) {
    const spread = 0.87 * i;
    b.add(
      archGeo(w + spread, h + spread * 0.56, 0.64, 0.4),
      i % 2 ? m.stone : m.trim,
      x,
      base + 0.28,
      back + 0.5 + i * 0.58,
    );
    for (const s of [-1, 1])
      b.cyl(
        x + s * (w + spread) * 0.5,
        base + h * 0.3,
        back + 0.9 + i * 0.58,
        0.22,
        0.29,
        h * 0.59,
        m.trim,
        8,
      );
  }
  const gable = new T.Shape();
  const half = w * 0.5 + 1.6,
    sill = h * 0.78;
  gable.moveTo(-half, sill);
  gable.lineTo(0, h + 4.5);
  gable.lineTo(half, sill);
  gable.lineTo(half - 0.35, sill - 0.35);
  gable.lineTo(0, h + 3.55);
  gable.lineTo(-half + 0.35, sill - 0.35);
  gable.closePath();
  relief(b, gable, m.trim, x, base, back + 3.0, 0.72);
  finial(b, m, x, base + h + 4.45, back + 3.32, 0.37, 2.25);
}

function roseWindow(b, m, base) {
  const r = 6.1,
    y = base + 33.5,
    z = 19.7;
  b.add(new T.CircleGeometry(r, 96), m.roseGlass ?? m.glass, 0, y, z);
  for (const [radius, thick, mat] of [
    [6.55, 0.42, m.stone],
    [6.13, 0.26, m.trim],
    [5.85, 0.16, m.dark],
    [1.1, 0.17, m.trim],
  ]) {
    b.add(new T.TorusGeometry(radius, thick, 8, 64), mat, 0, y, z + 0.24);
  }
  for (let i = 0; i < 12; i++) {
    const a = (i * tau) / 12;
    const xy = (u, v) => [
      u * Math.cos(a) + v * Math.sin(a),
      y - u * Math.sin(a) + v * Math.cos(a),
      z + 0.28,
    ];
    for (const s of [-1, 1]) {
      rib(
        b,
        [
          xy(0, 1.05),
          xy(s * 0.37, 2.25),
          xy(s * 0.99, 3.9),
          xy(s * 0.78, 4.87),
          xy(0, 5.8),
        ],
        0.123,
        m.trim,
      );
    }
    const p = xy(0, 5.04);
    b.add(new T.TorusGeometry(0.37, 0.1, 5, 14), m.dark, ...p);
  }
}

function flyingAisle(b, m, base, side) {
  // Single-pitch aisle roofs leave a clear air gap below each stone flyer.
  const section = new T.Shape();
  const points = [
    [14.4, 28.7],
    [32.5, 16.4],
    [32.5, 15.8],
    [14.4, 27.4],
  ];
  points.forEach(([x, y], i) => section[i ? "lineTo" : "moveTo"](side * x, y));
  section.closePath();
  relief(b, section, m.roof, 0, base, -18.3, 35);
  b.box(side * 23.1, base + 8, 0, 18.1, 16, 34, m.stone);
  for (const z of [-15.6, -7.8, 0, 7.8, 15.6]) {
    const spring = 39.6,
      outer = 35;
    b.box(side * outer, base + 10, z, 3.0, 20, 3, m.stone);
    b.box(side * outer, base + 21, z, 2.1, 8.6, 2.25, m.trim);
    finial(b, m, side * outer, base + 25.1, z, 1.38, 7);
    const flyer = new T.Shape();
    flyer.moveTo(side * 14.2, spring + 2);
    flyer.lineTo(side * (outer + 0.2), 25.5);
    flyer.lineTo(side * (outer + 0.2), 18.0);
    flyer.quadraticCurveTo(side * 31, 29.7, side * 14.2, spring - 0.7);
    flyer.closePath();
    relief(b, flyer, m.stone, 0, base, z - 0.66, 1.32);
    b.beam(
      [side * 14.2, base + spring + 2.07, z],
      [side * outer, base + 25.58, z],
      0.34,
      m.trim,
    );
    b.box(side * 14.4, base + 36, z, 1.1, 12.2, 1.25, m.trim);
    if (z < 15) {
      const center = z + 3.9,
        a = (side * Math.PI) / 2;
      for (const [x, y, w, h] of [
        [14.55, 29.4, 5.8, 11.1],
        [32.22, 4.1, 4.75, 9.8],
      ]) {
        b.add(archGeo(w, h, 0.18), m.glass, side * x, base + y, center, 0, a);
        b.add(
          archGeo(w + 0.4, h + 0.4, 0.34, 0.36),
          m.trim,
          side * (x + 0.2),
          base + y - 0.1,
          center,
          0,
          a,
        );
        b.box(
          side * (x + 0.38),
          base + y + h * 0.41,
          center,
          0.32,
          h * 0.82,
          0.24,
          m.stone,
        );
      }
    }
  }
}

function radialChapels(b, m, base) {
  const z = -20;
  for (let i = 0; i < 5; i++) {
    const a = Math.PI + ((i - 2) * Math.PI) / 5,
      sn = Math.sin(a),
      cs = Math.cos(a);
    const x = sn * 12,
      cz = z + cs * 12;
    b.cyl(x, base + 7.4, cz, 5.0, 5.35, 14.8, m.stone, 8);
    b.cyl(x, base + 15.0, cz, 5.4, 5.4, 0.75, m.trim, 8);
    b.cyl(x, base + 18.8, cz, 0.24, 5.75, 7.4, m.roof, 8);
    finial(b, m, x, base + 22.35, cz, 0.35, 1.8);
    for (const offset of [-Math.PI / 4, 0, Math.PI / 4]) {
      const normal =
        Math.round((a + offset - Math.PI / 8) / (Math.PI / 4)) * (Math.PI / 4) +
        Math.PI / 8;
      const dx = Math.sin(normal),
        dz = Math.cos(normal);
      b.add(
        archGeo(2.6, 7.7, 0.14),
        m.glass,
        x + dx * 4.88,
        base + 4,
        cz + dz * 4.88,
        0,
        normal,
      );
      b.add(
        archGeo(3.0, 8.0, 0.24, 0.23),
        m.trim,
        x + dx * 5.05,
        base + 3.9,
        cz + dz * 5.05,
        0,
        normal,
      );
    }
  }
}

export function buildCrownChapel(b, m, base, colliders) {
  for (const x of towerXs) {
    westTower(b, m, base, x);
    colliders.push({
      min: [x - 6.8, base, towerZ - 6.8],
      max: [x + 6.8, base + plinth + crownHeight + 3.7, towerZ + 6.8],
    });
  }
  for (const side of [-1, 1]) flyingAisle(b, m, base, side);
  for (let i = 0; i < 5; i++)
    b.box(
      0,
      base + 0.11 + i * 0.16,
      25.8 - i * 0.72,
      23.5 - i * 0.17,
      0.26,
      1.85,
      m.stone,
    );
  entrance(b, m, base + 0.7, 0, 6.65, 13.4);
  for (const s of [-1, 1]) entrance(b, m, base + 0.7, s * 7.4, 3.7, 9.0);
  for (let i = -3; i <= 3; i++) {
    const x = i * 2.55;
    b.add(archGeo(2.32, 5.3, 0.26), m.black, x, base + 19.9, 18.96);
    b.add(archGeo(2.58, 5.62, 0.42, 0.27), m.trim, x, base + 19.75, 19.25);
  }
  roseWindow(b, m, base);
  const gable = new T.Shape();
  gable.moveTo(-10.8, 40.4);
  gable.lineTo(0, 55.2);
  gable.lineTo(10.8, 40.4);
  gable.closePath();
  relief(b, gable, m.stone, 0, base, 16.7, 2.5);
  for (const s of [-1, 1]) {
    b.beam(
      [s * 11.1, base + 40.4, 19.4],
      [0, base + 55.65, 19.4],
      0.29,
      m.trim,
    );
    for (let j = 0; j < 5; j++) {
      const t = (j + 0.6) / 5;
      finial(b, m, s * 11 * (1 - t), base + 40.4 + 15.25 * t, 19.4, 0.32, 1.2);
    }
  }
  for (const x of [-4, 0, 4]) {
    const h = x ? 4.2 : 8.0;
    b.add(archGeo(2.4, h, 0.16), m.black, x, base + 41.5, 19.22);
    b.add(archGeo(2.7, h + 0.45, 0.27, 0.22), m.trim, x, base + 41.3, 19.45);
  }
  finial(b, m, 0, base + 55.3, 19.4, 0.58, 3);
  radialChapels(b, m, base);
}
