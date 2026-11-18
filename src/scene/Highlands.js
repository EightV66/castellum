import * as T from "three";
import { Builder } from "./Geometry.js";
import { seeded } from "./Materials.js";
import { heightSampler } from "./Heightfield.js";

export const SUMMITS = [
  { x: 48, z: -168, h: 176, rx: 64, rz: 63 },
  { x: -124, z: -305, h: 301, rx: 111, rz: 96 },
];
const peaks = [...SUMMITS, { x: -191, z: -350, h: 354, rx: 67, rz: 64 }];
const roads = [
  [
    [-62, 12, 292],
    [-18, 18, 276],
    [58, 31, 257],
    [75, 34, 245],
    [37, 42, 225],
    [-49, 56, 204],
    [-59, 60, 192],
    [-21, 66, 177],
    [39, 76, 162],
    [46, 80, 154],
    [21, 85, 143],
    [0, 88, 139],
    [0, 88, 132],
  ],
  [
    [-18, 93, -35],
    [-4, 94, -48],
    [-5, 95, -58],
    [-42, 100, -72],
    [-51, 109, -90],
    [-26, 116, -108],
    [19, 126, -108],
    [61, 138, -105],
    [88, 150, -126],
    [77, 164, -151],
    [65, 172, -152],
    [54, 176, -147],
    [42, 177, -147],
    [30, 178, -155],
    [26, 180, -172],
    [33, 181, -186],
    [10, 190, -211],
    [-44, 201, -206],
    [-90, 214, -181],
    [-116, 223, -194],
    [-104, 234, -221],
    [-71, 246, -243],
    [-65, 253, -266],
    [-102, 265, -276],
    [-150, 277, -260],
    [-176, 286, -276],
    [-163, 296, -301],
    [-151, 301.8, -305],
    [-147, 302, -305],
  ],
];
// Short bevels preserve the individual survey legs of the road. Hairpins have
// a short turning court and a cut-stone prow on the exposed side.
function mountRoad(stations) {
  const pts = stations.map((p) => new T.Vector3(...p)),
    way = [pts[0]];
  for (let i = 1; i < pts.length - 1; i++) {
    const p = pts[i],
      a = pts[i - 1],
      b = pts[i + 1],
      incoming = p.clone().sub(a),
      outgoing = b.clone().sub(p);
    const cut = Math.min(
      4.6,
      incoming.length() * 0.21,
      outgoing.length() * 0.21,
    );
    const before = p.clone().addScaledVector(incoming.normalize(), -cut);
    const after = p.clone().addScaledVector(outgoing.normalize(), cut);
    const corner = before.clone().lerp(after, 0.5).lerp(p, 0.66);
    const cosine =
      (incoming.x * outgoing.x + incoming.z * outgoing.z) /
      (Math.hypot(incoming.x, incoming.z) * Math.hypot(outgoing.x, outgoing.z));
    if (cosine < 0.52)
      corner.prow = Math.sign(
        incoming.x * outgoing.z - incoming.z * outgoing.x,
      );
    way.push(before, corner, after);
  }
  way.push(pts.at(-1));
  const track = [way[0]];
  for (let i = 1; i < way.length; i++) {
    const a = way[i - 1],
      b = way[i],
      pieces = Math.ceil(a.distanceTo(b) / 3.8);
    for (let j = 1; j < pieces; j++) track.push(a.clone().lerp(b, j / pieces));
    track.push(b);
  }
  return track;
}
const tracks = roads.map(mountRoad);

// Surveyed arêtes. Each crest station gives x,z,elevation and half-width.
// Sharp cross sections extend deep into the flanks before the road is cut.
const ridgeChains = [
  [
    [-193, -349, 362, 27],
    [-223, -316, 321, 36],
    [-242, -288, 294, 33],
    [-257, -275, 235, 28],
    [-271, -253, 231, 25],
    [-337, -211, 54, 12],
  ],
  [
    [-289, -393, 293, 23],
    [-286, -366, 306, 34],
    [-320, -342, 292, 32],
    [-333, -319, 225, 26],
    [-355, -296, 216, 34],
    [-394, -249, 67, 18],
  ],
  [
    [-418, -416, 236, 28],
    [-418, -378, 247, 33],
    [-454, -357, 219, 26],
    [-487, -313, 171, 25],
    [-537, -269, 53, 16],
  ],
  [
    [-124, -305, 300, 22],
    [-110, -281, 286, 20],
    [-89, -259, 254, 30],
    [-83, -242, 217, 21],
    [-48, -225, 183, 24],
    [8, -187, 70, 12],
  ],
  [
    [-141, -298, 292, 16],
    [-168, -270, 272, 26],
    [-187, -247, 239, 27],
    [-175, -227, 225, 23],
    [-194, -206, 184, 23],
    [-217, -157, 33, 12],
  ],
  [
    [53, -171, 173, 18],
    [74, -158, 170, 23],
    [97, -141, 145, 19],
    [118, -128, 108, 18],
    [156, -90, 16, 9],
  ],
  [
    [45, -158, 167, 13],
    [52, -131, 151, 19],
    [37, -109, 123, 21],
    [47, -96, 102, 17],
    [70, -64, 22, 10],
  ],
  [
    [-30, -80, 101, 14],
    [-59, -72, 102, 17],
    [-79, -58, 82, 16],
    [-93, -42, 54, 11],
    [-104, -25, 18, 8],
  ],
];
const ribs = ridgeChains.flatMap((chain) =>
  chain.slice(1).map((b, i) => {
    const a = chain[i],
      dx = b[0] - a[0],
      dz = b[1] - a[1],
      reach = Math.max(a[3], b[3]) * 1.24;
    return {
      a,
      b,
      dx,
      dz,
      len2: dx * dx + dz * dz,
      xMin: Math.min(a[0], b[0]) - reach,
      xMax: Math.max(a[0], b[0]) + reach,
      zMin: Math.min(a[1], b[1]) - reach,
      zMax: Math.max(a[1], b[1]) + reach,
    };
  }),
);
const roadCells = new Map(),
  cell = 48;
for (const track of tracks)
  for (let i = 1; i < track.length; i++) {
    const a = track[i - 1],
      b = track[i],
      dx = b.x - a.x,
      dz = b.z - a.z,
      span = dx * dx + dz * dz;
    const margin = 78;
    for (
      let ix = Math.floor((Math.min(a.x, b.x) - margin) / cell);
      ix <= Math.floor((Math.max(a.x, b.x) + margin) / cell);
      ix++
    )
      for (
        let iz = Math.floor((Math.min(a.z, b.z) - margin) / cell);
        iz <= Math.floor((Math.max(a.z, b.z) + margin) / cell);
        iz++
      ) {
        const key = ix + "," + iz;
        if (!roadCells.has(key)) roadCells.set(key, []);
        roadCells.get(key).push({ a, dx, dz, span, dy: b.y - a.y });
      }
  }
function noise(x, z) {
  const h = (i, j) => {
    let n = Math.imul(i, 723367) + Math.imul(j, 92837111);
    n = Math.imul(n ^ (n >>> 16), 668265263);
    return ((n ^ (n >>> 13)) >>> 0) / 4294967296;
  };
  const i = Math.floor(x),
    j = Math.floor(z);
  let u = x - i,
    v = z - j;
  u *= u * (3 - 2 * u);
  v *= v * (3 - 2 * v);
  return T.MathUtils.lerp(
    T.MathUtils.lerp(h(i, j), h(i + 1, j), u),
    T.MathUtils.lerp(h(i, j + 1), h(i + 1, j + 1), u),
    v,
  );
}

export function onPilgrimRoad(x, z, clearance = 7) {
  const nearby = roadCells.get(
    Math.floor(x / cell) + "," + Math.floor(z / cell),
  );
  return (
    nearby?.some((seg) => {
      const t = T.MathUtils.clamp(
        ((x - seg.a.x) * seg.dx + (z - seg.a.z) * seg.dz) / seg.span,
        0,
        1,
      );
      return (
        (x - seg.a.x - seg.dx * t) ** 2 + (z - seg.a.z - seg.dz * t) ** 2 <
        clearance ** 2
      );
    }) ?? false
  );
}

export function highlandHeight(x, z) {
  const broad = noise(x * 0.008, z * 0.008),
    grain = noise(x * 0.031, z * 0.031);
  const cut = x - 32 - 42 * Math.sin(z * 0.008);
  let height =
    -6 +
    8 * broad +
    3 * grain +
    T.MathUtils.smoothstep(Math.abs(cut), 105, 310) * (15 + 50 * broad);
  // The western approach is a broad glacial trough. Its darker near shoulders
  // lead the eye towards the crown without raising the floor below the court.
  if (x < -140 && x > -770 && z > -245 && z < 590) {
    const axis = -405 + 46 * Math.sin(z * 0.006);
    const offset = Math.abs(x - axis);
    const apron = 1 - T.MathUtils.smoothstep(offset, 170, 322);
    const ends =
      T.MathUtils.smoothstep(z, -245, -70) *
      (1 - T.MathUtils.smoothstep(z, 420, 590));
    const ribs = Math.abs(Math.sin((x + 0.42 * z) * 0.019 + 2 * grain));
    const shoulder = T.MathUtils.smoothstep(offset, 25, 140);
    const drift = 58 + 24 * broad + 9 * grain + (39 + 29 * ribs) * shoulder;
    height = Math.max(
      height,
      drift * apron * ends * T.MathUtils.smoothstep(-x, 143, 291),
    );
  }
  for (const peak of peaks) {
    const xx = (x - peak.x) / peak.rx,
      zz = (z - peak.z) / peak.rz,
      a = Math.atan2(xx, zz);
    const r =
      Math.hypot(xx, zz) /
      (1 + 0.12 * Math.sin(3 * a) + 0.065 * Math.cos(9 * a));
    const fold = 1 - Math.abs(Math.sin(7 * a + 2.3 * r + 3.2 * broad));
    const bedding = Math.tanh(3.2 * Math.sin(24 * r + 5 * a + 3.1 * grain));
    const relief =
      (broad - 0.5) * 35 +
      (grain - 0.5) * 26 +
      35 * fold * fold +
      7 * bedding -
      9;
    if (r >= 1.9) continue;
    const flank = 1 - T.MathUtils.smoothstep(r, 0.17, 1.9);
    const terrace =
      0.24 * (1 - T.MathUtils.smoothstep(r, 0.31, 0.53)) +
      0.23 * (1 - T.MathUtils.smoothstep(r, 0.64, 0.84)) +
      0.53 * flank ** 1.45;
    const strata =
      relief *
      T.MathUtils.smoothstep(r, 0.17, 0.55) *
      (1 - T.MathUtils.smoothstep(r, 1.3, 1.9));
    height = Math.max(height, peak.h * terrace + strata);
  }
  // A single tilted massif climbs behind the high court. Its folded crest
  // underpins the wing root; the outermost cleaved beds overhang open air.
  if (x < -145 && x > -630 && z < -216 && z > -590) {
    const t = T.MathUtils.clamp((-x - 167) / 448, 0, 1);
    const spine =
      -345 - 93 * t - 16 * Math.sin(t * 7.2) + 9 * Math.sin(t * 34 + 2 * broad);
    const buttress =
      1 - Math.abs(Math.sin(x * 0.042 + z * 0.015 + 1.4 * grain));
    const dist =
      Math.abs(z - spine) /
      (76 + 35 * Math.sin(t * Math.PI) + 30 * buttress ** 2);
    const crest = 333 - 211 * t + 28 * Math.sin(2 * Math.PI * t) + 18 * grain;
    const face =
      0.72 * (1 - T.MathUtils.smoothstep(dist, 0.045, 1.24)) +
      0.28 * (1 - T.MathUtils.smoothstep(dist, 0.43, 0.69));
    const jag =
      26 * (1 - Math.abs(Math.sin(x * 0.042 + z * 0.019 + 2 * grain))) +
      12 * (grain - 0.5);
    const taper =
      T.MathUtils.smoothstep(-x, 145, 178) *
      (1 - T.MathUtils.smoothstep(-x, 552, 630));
    height = Math.max(
      height,
      (crest * face + (jag + 89 * buttress ** 2) * face * (1 - face)) * taper,
    );
  }
  for (const rib of ribs) {
    if (x < rib.xMin || x > rib.xMax || z < rib.zMin || z > rib.zMax) continue;
    const { a, b, dx, dz, len2 } = rib;
    const t = T.MathUtils.clamp(
      ((x - a[0]) * dx + (z - a[1]) * dz) / len2,
      0,
      1,
    );
    const ox = x - a[0] - t * dx,
      oz = z - a[1] - t * dz;
    const signed = oz * dx - ox * dz;
    const half = T.MathUtils.lerp(a[3], b[3], t) * (signed > 0 ? 0.77 : 1.24);
    const width = Math.hypot(ox, oz) / half;
    if (width >= 1) continue;
    const serration =
      (1 - Math.abs(2 * t - 1)) * 6 * Math.sin((a[0] + a[1]) * 0.37);
    const crest = T.MathUtils.lerp(a[2], b[2], t) + serration;
    height = Math.max(height, crest * (1 - width * 0.93) - width * width * 12);
  }
  for (const peak of SUMMITS) {
    const distance = Math.hypot(x - peak.x, z - peak.z),
      pad = peak === SUMMITS[1] ? 24 : 17;
    if (distance < pad + 14)
      height = T.MathUtils.lerp(
        peak.h - 1.3,
        height,
        T.MathUtils.smoothstep(distance, pad, pad + 14),
      );
  }
  // Grade the actual terrain to the nearest road bed; shoulders weather back
  // into the mountain. This is shared by rendering and camera collision.
  const nearby = roadCells.get(
    Math.floor(x / cell) + "," + Math.floor(z / cell),
  );
  if (nearby) {
    let best = Infinity,
      bed = 0;
    for (const seg of nearby) {
      const t = T.MathUtils.clamp(
        ((x - seg.a.x) * seg.dx + (z - seg.a.z) * seg.dz) / seg.span,
        0,
        1,
      );
      const d =
        (x - seg.a.x - seg.dx * t) ** 2 + (z - seg.a.z - seg.dz * t) ** 2;
      if (d < best) {
        best = d;
        bed = seg.a.y + seg.dy * t;
      }
    }
    const d = Math.sqrt(best);
    const shoulder = bed - 1.67 - Math.max(0, d - 4.3) * (1.27 + 0.29 * grain);
    // Fade the embankment inside the search margin; a grid boundary must
    // never leave a vertical seam in the valley on the far side of a bend.
    height = T.MathUtils.lerp(
      height,
      Math.max(height, shoulder),
      1 - T.MathUtils.smoothstep(d, 20, 63),
    );
    height = T.MathUtils.lerp(
      bed - 1.67,
      height,
      T.MathUtils.smoothstep(d, 6.4, 15.4),
    );
  }
  return height;
}

function roadMesh(scene, b, m, points) {
  const positions = [],
    uv = [],
    indices = [],
    sides = [],
    sideUv = [],
    rand = seeded(622);
  let length = 0,
    marker = 0,
    lamp = 0,
    previous = [];
  function stoneFace(a, c, d) {
    for (const p of [a, c, d]) {
      sides.push(...p);
      sideUv.push((p[0] + p[2]) * 0.11, p[1] * 0.13);
    }
  }
  for (let i = 0; i < points.length; i++) {
    const p = points[i],
      back = points[Math.max(0, i - 1)],
      next = points[Math.min(points.length - 1, i + 1)];
    const tx = next.x - back.x,
      tz = next.z - back.z,
      heading = Math.atan2(tx, tz);
    const d = Math.hypot(tx, tz),
      nx = tz / d,
      nz = -tx / d;
    if (i) length += p.distanceTo(back);
    const edges = [];
    for (const sign of [-1, 1]) {
      const half = 3.95 + (p.prow === sign ? 1 : 0);
      const edge = [p.x + sign * nx * half, p.y + 0.32, p.z + sign * nz * half];
      edges.push(edge);
      positions.push(...edge);
      uv.push((sign + 1) * 0.34, length / 9.4);
      if (i) {
        const prev = previous[sign === 1 ? 1 : 0];
        const foot = (v) => [
          v[0] + nx * sign * 0.35,
          v[1] - 2.7,
          v[2] + nz * sign * 0.35,
        ];
        const c = foot(prev),
          e = foot(edge);
        if (sign > 0) {
          stoneFace(prev, edge, c);
          stoneFace(edge, e, c);
        } else {
          stoneFace(prev, c, edge);
          stoneFace(edge, c, e);
        }
        const ax = edge[0] - prev[0],
          ay = edge[1] - prev[1],
          az = edge[2] - prev[2];
        const coping = new T.BoxGeometry(
          0.58,
          0.58,
          Math.hypot(ax, ay, az) + 0.08,
        );
        coping.rotateX(-Math.atan2(ay, Math.hypot(ax, az)));
        coping.rotateY(Math.atan2(ax, az));
        b.add(
          coping,
          m.trim,
          (edge[0] + prev[0]) / 2,
          (edge[1] + prev[1]) / 2 + 0.21,
          (edge[2] + prev[2]) / 2,
        );
      }
    }
    previous = edges;
    if (i) {
      const k = i * 2;
      indices.push(k - 2, k, k - 1, k - 1, k, k + 1);
    }
    if (length >= marker) {
      for (const e of edges)
        b.box(e[0], e[1] + 0.78, e[2], 0.88, 1.13, 1.18, m.stone, heading);
      marker += 9 + rand() * 2.5;
    }
    if (length >= lamp || p.prow) {
      const sign = p.prow || 1,
        e = edges[sign > 0 ? 1 : 0];
      const ex = e[0] + sign * nx * 0.65,
        ez = e[2] + sign * nz * 0.65;
      b.cyl(ex, p.y + 1.97, ez, 0.22, 0.41, 3.1, m.dark, 8);
      b.box(ex, p.y + 3.74, ez, 0.63, 0.9, 0.63, m.glass);
      b.cyl(ex, p.y + 4.37, ez, 0, 0.61, 0.53, m.roof, 4);
      if (length >= lamp) lamp += 44;
    }
    if (p.prow) {
      const sign = p.prow,
        tip = [p.x + nx * sign * 8.9, p.y + 0.22, p.z + nz * sign * 8.9],
        e = edges[sign > 0 ? 1 : 0];
      const a = [e[0] - (tx / d) * 3.8, e[1], e[2] - (tz / d) * 3.8],
        c = [e[0] + (tx / d) * 3.8, e[1], e[2] + (tz / d) * 3.8];
      const keel = [
        tip[0] - sign * nx * 1.5,
        p.y - 7.3,
        tip[2] - sign * nz * 1.5,
      ];
      const from = sign > 0 ? c : a,
        to = sign > 0 ? a : c;
      stoneFace(from, tip, to);
      stoneFace(from, keel, tip);
      stoneFace(tip, keel, to);
      for (const v of [a, c])
        b.cyl(v[0], p.y + 1.1, v[2], 0.06, 0.48, 1.65, m.trim, 5);
    }
  }
  const wall = new T.BufferGeometry();
  wall.setAttribute("position", new T.Float32BufferAttribute(sides, 3));
  wall.setAttribute("uv", new T.Float32BufferAttribute(sideUv, 2));
  wall.computeVertexNormals();
  b.add(wall, m.dark);
  const g = new T.BufferGeometry();
  g.setAttribute("position", new T.Float32BufferAttribute(positions, 3));
  g.setAttribute("uv", new T.Float32BufferAttribute(uv, 2));
  g.setIndex(indices);
  g.computeVertexNormals();
  const mat = m.stone.clone();
  mat.color.set(0x798592);
  mat.side = T.DoubleSide;
  const mesh = new T.Mesh(g, mat);
  mesh.name = "pilgrim-road";
  mesh.receiveShadow = true;
  scene.add(mesh);
}

export function createHighlands(scene, m) {
  // Fine sampling where the switchbacks lie, wider intervals near the horizon.
  const coords = [];
  for (
    let v = -1950;
    v < 1950;
    v += Math.abs(v) < 460 ? 4 : Math.abs(v) < 900 ? 14 : 40
  )
    coords.push(v);
  const p = [],
    uv = [],
    colors = [],
    idx = [],
    n = coords.length,
    c = new T.Color();
  for (let j = 0; j < n; j++)
    for (let i = 0; i < n; i++) {
      const x = coords[i],
        z = coords[j],
        y = highlandHeight(x, z);
      p.push(x, y, z);
      uv.push(x / 38, z / 38);
      const r = noise(x * 0.035, z * 0.016),
        f = noise(x * 0.009, z * 0.011);
      c.setRGB(
        0.23 + 0.42 * f + 0.08 * r,
        0.32 + 0.44 * f + 0.08 * r,
        0.42 + 0.42 * f + 0.07 * r,
      );
      colors.push(c.r, c.g, c.b);
      if (i < n - 1 && j < n - 1) {
        const k = j * n + i;
        idx.push(k, k + n, k + 1, k + n, k + n + 1, k + 1);
      }
    }
  const g = new T.BufferGeometry();
  g.setAttribute("position", new T.Float32BufferAttribute(p, 3));
  g.setAttribute("uv", new T.Float32BufferAttribute(uv, 2));
  g.setAttribute("color", new T.Float32BufferAttribute(colors, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  const snowfield = new T.Mesh(
    g,
    new T.MeshStandardMaterial({ vertexColors: true, roughness: 0.88 }),
  );
  snowfield.userData.heightAt = heightSampler(g, n);
  snowfield.name = "glacier-valley";
  snowfield.receiveShadow = true;
  scene.add(snowfield);
  const b = new Builder(scene);
  for (const track of tracks) roadMesh(scene, b, m, track);
  b.finish();
  return snowfield;
}
