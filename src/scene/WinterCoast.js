import * as T from "three";
import { Builder, archGeo } from "./Geometry.js";
import { seeded } from "./Materials.js";
import { gabledRoof } from "./ArchitecturalDetails.js";
import { SUMMITS, highlandHeight } from "./Highlands.js";
import { cliffRadius } from "./CliffProfile.js";

// World-space deposition keeps cornices white and wind-scoured faces exposed.
// Reuse the material's regular PBR lighting, shadows and fog at every quality.
export function frostSurface(material, slope, cover) {
  material.customProgramCacheKey = () => `winter-${slope}-${cover}`;
  material.onBeforeCompile = (shader) => {
    shader.uniforms.snowSlope = { value: slope };
    shader.uniforms.snowCover = { value: cover };
    const varying = "varying vec3 vSnowPosition; varying vec3 vSnowNormal;\n";
    shader.vertexShader =
      varying +
      shader.vertexShader.replace(
        "#include <project_vertex>",
        `
      vSnowPosition=(modelMatrix*vec4(transformed,1.)).xyz;
      vSnowNormal=normalize(mat3(modelMatrix)*objectNormal);
      #include <project_vertex>`,
      );
    shader.fragmentShader =
      varying +
      `uniform float snowSlope,snowCover;
      float frostHash(vec2 p){return fract(sin(dot(p,vec2(23.7,117.1)))*31841.71);}
      float frostNoise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);
        return mix(mix(frostHash(i),frostHash(i+vec2(1,0)),f.x),mix(frostHash(i+vec2(0,1)),frostHash(i+1.),f.x),f.y);}
    ` +
      shader.fragmentShader.replace(
        "#include <color_fragment>",
        `
      #include <color_fragment>
      vec3 snowNormal=normalize(vSnowNormal);
      vec2 ledge=vSnowPosition.xz+vSnowPosition.y*vec2(.21,.08);
      float pack=frostNoise(ledge*.23)*.72+frostNoise(ledge*.87)*.28;
      float facing=snowNormal.y+.09*snowNormal.x+.24*(pack-.5);
      float frost=smoothstep(snowSlope-.12,snowSlope+.12,facing)*snowCover;
      diffuseColor.rgb=mix(diffuseColor.rgb, mix(vec3(.32,.48,.60),vec3(.80,.90,.94),pack),frost);
    `,
      );
  };
}

// A fractured, leaning prism. Differently oriented faces catch the sky light
// independently; the asymmetric tip gives the windward ice its swept profile.
function iceBlade(b, mat, x, y, z, width, height, leanX, leanZ, angle, random) {
  const count = 5,
    pts = [],
    uv = [];
  const rings = [
    [0, 1],
    [0.32, 0.82],
    [0.76, 0.36],
    [1, 0.012],
  ];
  const irregular = Array.from({ length: count }, () => 0.7 + random() * 0.5);
  function corner(i, [t, r]) {
    const a = (i * 2 * Math.PI) / count,
      u = Math.cos(a) * width * irregular[i] * r;
    const v = Math.sin(a) * width * 0.5 * irregular[i] * r;
    return [
      x + u * Math.cos(angle) + v * Math.sin(angle) + leanX * t * t,
      y + height * t,
      z - u * Math.sin(angle) + v * Math.cos(angle) + leanZ * t * t,
    ];
  }
  for (let j = 0; j < rings.length - 1; j++)
    for (let i = 0; i < count; i++) {
      const k = (i + 1) % count;
      const a = corner(i, rings[j]),
        c = corner(k, rings[j]),
        d = corner(k, rings[j + 1]),
        e = corner(i, rings[j + 1]);
      const face = height > 0 ? [a, d, c, a, e, d] : [a, c, d, a, d, e];
      for (const p of face) {
        pts.push(...p);
        uv.push(p[0] / 10, p[1] / 10);
      }
    }
  const g = new T.BufferGeometry();
  g.setAttribute("position", new T.Float32BufferAttribute(pts, 3));
  g.setAttribute("uv", new T.Float32BufferAttribute(uv, 2));
  g.computeVertexNormals();
  b.add(g, mat);
}

function promontory(scene, x, z, rx, rz, top, seed) {
  const n = 84,
    layers = 27,
    isPeak = top > 100;
  const vertices = [],
    colors = [],
    indices = [],
    tint = new T.Color();
  const bedrock = new T.Color(0x385064),
    glacier = new T.Color(0x92bdcc);
  function surface(a, t) {
    const shoulder = (1 - t) * 0.18 * Math.max(0, Math.sin(3 * a + 0.6 * seed));
    const footprint =
      1 +
      0.1 * Math.sin(3 * a + seed) +
      0.085 * Math.cos(7 * a - seed) +
      0.043 * Math.sin(17 * a + 0.7 * seed);
    const fluting =
      Math.abs(
        Math.sin(5 * a + 0.65 * Math.sin(8 * a + seed) + t * 1.6 + seed),
      ) ** 0.55;
    const shelf =
      (isPeak ? 0.95 - 0.57 * t - 0.19 * t * t : 0.99 - 0.31 * t) + shoulder;
    const joint =
      (0.094 * Math.sin(12 * a + t * 2.1) +
        0.046 * Math.sin(23 * a - t * 4.2)) *
      Math.sin(t * Math.PI);
    const ledge =
      Math.exp(
        -Math.pow((t - 0.52 - 0.12 * Math.sin(3 * a + seed)) / 0.052, 2),
      ) * 0.055;
    const radius = footprint * shelf * (0.77 + 0.27 * fluting) + joint + ledge;
    const h =
      -8 +
      (top + 8) * t +
      (isPeak ? top * 0.085 : top * 0.063) *
        Math.sin(t * Math.PI) *
        Math.sin(6 * a + 0.8 * seed + t * 3);
    return [
      x + rx * (Math.sin(a) * radius + t * 0.075),
      h,
      z + rz * Math.cos(a) * radius,
    ];
  }
  for (let j = 0; j <= layers; j++)
    for (let i = 0; i < n; i++) {
      const a = (i * 2 * Math.PI) / n,
        t = j / layers,
        point = surface(a, t);
      vertices.push(...point);
      const seam =
        0.5 +
        0.5 * Math.sin(a * 16 + 1.8 * Math.sin(a * 7 + t * 2 + seed) + t * 4);
      const stratum =
        0.5 + 0.5 * Math.sin(point[1] * 0.16 + 2 * Math.sin(a * 7));
      tint
        .copy(bedrock)
        .lerp(glacier, 0.13 + t * 0.25 + 0.16 * seam + 0.08 * stratum);
      colors.push(tint.r, tint.g, tint.b);
    }
  for (let j = 0; j < layers; j++)
    for (let i = 0; i < n; i++) {
      const a = j * n + i,
        c = j * n + ((i + 1) % n);
      indices.push(a, c, a + n, c, c + n, a + n);
    }
  const center = vertices.length / 3;
  vertices.push(x + rx * 0.075, top + 1, z);
  colors.push(0.64, 0.82, 0.9);
  for (let i = 0; i < n; i++)
    indices.push(center, layers * n + i, layers * n + ((i + 1) % n));
  const g = new T.BufferGeometry();
  g.setAttribute("position", new T.Float32BufferAttribute(vertices, 3));
  g.setAttribute("color", new T.Float32BufferAttribute(colors, 3));
  g.setIndex(indices);
  g.computeVertexNormals();
  const material = new T.MeshStandardMaterial({
    vertexColors: true,
    roughness: 0.9,
  });
  frostSurface(material, 0.63, 0.88);
  const mesh = new T.Mesh(g, material);
  mesh.userData.rockScale = 0.055;
  mesh.receiveShadow = true;
  mesh.castShadow = true;
  scene.add(mesh);
  return surface;
}

function bareTree(b, mat, x, y, z, size, seed, rime) {
  const random = seeded(seed);
  function branch(p, length, radius, azimuth, lift, depth) {
    const bend = azimuth + 0.3 * (random() - 0.5);
    const end = [
      p[0] + Math.cos(bend) * length * Math.cos(lift),
      p[1] + length * Math.sin(lift),
      p[2] + Math.sin(bend) * length * Math.cos(lift),
    ];
    const v = new T.Vector3(end[0] - p[0], end[1] - p[1], end[2] - p[2]);
    const g = new T.CylinderGeometry(radius * 0.63, radius, v.length(), 6, 1);
    g.applyQuaternion(
      new T.Quaternion().setFromUnitVectors(
        new T.Vector3(0, 1, 0),
        v.normalize(),
      ),
    );
    b.add(
      g,
      mat,
      (p[0] + end[0]) / 2,
      (p[1] + end[1]) / 2,
      (p[2] + end[2]) / 2,
    );
    if (rime && depth < 4) {
      const lip = radius * 0.46;
      b.beam(
        [p[0] + lip, p[1] + lip, p[2]],
        [end[0] + lip * 0.5, end[1] + lip * 0.8, end[2]],
        Math.max(0.06, lip * 0.84),
        rime,
      );
    }
    if (depth > 0) {
      branch(
        end,
        length * (0.69 + random() * 0.14),
        radius * 0.62,
        bend + 0.12 + random() * 0.61,
        lift * 0.83 + 0.05,
        depth - 1,
      );
      branch(
        end,
        length * (0.59 + random() * 0.21),
        radius * 0.55,
        bend - 0.6 - random() * 0.95,
        0.32 + random() * 0.73,
        depth - 1,
      );
    }
  }
  branch([x, y, z], size, 0.095 * size, -2.25, 1.15, 4);
}

export function createWinterCoast(scene, m, terrain) {
  const random = seeded(5109),
    b = new Builder(scene);
  const ice = new T.MeshStandardMaterial({
    color: 0x8ac5d2,
    roughness: 0.31,
    metalness: 0.12,
    flatShading: true,
  });
  const deepIce = new T.MeshStandardMaterial({
    color: 0x5684a3,
    roughness: 0.38,
    metalness: 0.16,
    flatShading: true,
  });
  function shelf(x, z, rx, rz, h, seed) {
    const profile = promontory(scene, x, z, rx, rz, h, seed);
    terrain.islands.push({ x, z, rx, rz, height: h });
    const count = h > 100 ? 37 : 15;
    for (let j = 0; j < count; j++) {
      const a = random() * Math.PI * 2,
        t = 0.77 + random() * 0.23;
      const [px, y, pz] = profile(a, t);
      const length = (0.08 + random() * 0.16) * h;
      iceBlade(
        b,
        j % 3 ? ice : deepIce,
        px,
        y,
        pz,
        1.2 + random() * 2.4,
        -length,
        Math.sin(a) * length * 0.38,
        Math.cos(a) * length * 0.38,
        a,
        random,
      );
    }
  }
  // The two near sentries frame the valley entrance from either side.
  // All coordinates are fixed in the landscape: orbiting reveals their backs.
  const colliders = [];
  function sentry(x, y, z, scale, ruined = false) {
    const n = 6,
      r = 4.3 * scale,
      h = 18 * scale;
    b.cyl(x, y + h * 0.5, z, r, r * 1.22, h, m.dark, n);
    for (const [level, width] of [
      [0.08, 1.25],
      [0.44, 1.13],
      [0.81, 1.07],
      [0.93, 1.07],
    ])
      b.cyl(
        x,
        y + h * level,
        z,
        r * width,
        r * (width + 0.055),
        0.53 * scale,
        m.trim,
        n,
      );
    b.cyl(x, y + h, z, r * 1.19, r * 1.04, 1.2 * scale, m.trim, n);
    for (let i = 0; i < n; i++) {
      const a = ((i + 0.5) * 2 * Math.PI) / n,
        px = x + Math.sin(a) * r,
        pz = z + Math.cos(a) * r;
      const face = (i * 2 * Math.PI) / n,
        fx = Math.sin(face),
        fz = Math.cos(face);
      b.add(
        archGeo(1.46 * scale, 6.1 * scale, 0.18 * scale),
        m.black,
        x + fx * r * 0.96,
        y + 8.5 * scale,
        z + fz * r * 0.96,
        0,
        face,
      );
      b.add(
        archGeo(1.85 * scale, 6.55 * scale, 0.26 * scale, 0.24 * scale),
        m.trim,
        x + fx * r * 0.98,
        y + 8.25 * scale,
        z + fz * r * 0.98,
        0,
        face,
      );
      b.box(
        x + fx * r * 0.99,
        y + 11.6 * scale,
        z + fz * r * 0.99,
        0.23 * scale,
        4.7 * scale,
        0.18 * scale,
        m.glass,
        face,
      );
      b.beam(
        [x + fx * r * 1.32, y + 1.2 * scale, z + fz * r * 1.32],
        [x + fx * r * 1.1, y + 7.2 * scale, z + fz * r * 1.1],
        0.57 * scale,
        m.stone,
      );
      if (ruined && i === 4) continue;
      b.cyl(
        px,
        y + h + 4.3 * scale,
        pz,
        0.46 * scale,
        0.64 * scale,
        8.6 * scale,
        m.stone,
        8,
      );
      b.add(
        archGeo(3.85 * scale, 8.35 * scale, 0.61 * scale, 0.39 * scale),
        m.trim,
        x + Math.sin(face) * r * 0.89,
        y + h + 0.5 * scale,
        z + Math.cos(face) * r * 0.89,
        0,
        face,
      );
    }
    const capY = y + 26.9 * scale;
    b.cyl(x, capY, z, r * 1.16, r * 1.26, 1.1 * scale, m.trim, n);
    const roof = new T.LatheGeometry(
      [
        [r * 1.3, 0],
        [r * 0.95, 1.5 * scale],
        [r * 0.39, 7.6 * scale],
        [0.08, 13.8 * scale],
      ].map((v) => new T.Vector2(...v)),
      n,
    );
    b.add(roof, m.roof, x, capY + 0.4 * scale, z);
    for (let i = 0; i < n; i++) {
      const a = (i * 2 * Math.PI) / n,
        dx = Math.sin(a),
        dz = Math.cos(a);
      const mid = [x + dx * r * 0.39, capY + 8 * scale, z + dz * r * 0.39];
      b.beam(
        [x + dx * r * 1.27, capY + 0.49 * scale, z + dz * r * 1.27],
        mid,
        0.13 * scale,
        m.metal,
      );
      b.beam(mid, [x, capY + 14.1 * scale, z], 0.09 * scale, m.metal);
    }
    b.beam(
      [x, capY + 13.7 * scale, z],
      [x, capY + 16 * scale, z],
      0.15 * scale,
      m.gold,
    );
    colliders.push({
      min: [x - r * 1.4, y, z - r * 1.4],
      max: [x + r * 1.4, capY + 16 * scale, z + r * 1.4],
    });
  }
  function summitKeep(x, y, z, grand) {
    const group = new T.Group();
    group.name = grand ? "thunder-court" : "ridge-fort";
    scene.add(group);
    const b = new Builder(group);
    const s = grand ? 1.32 : 0.83;
    const outline = [
      [-23, -6],
      [-19, -15],
      [-6, -19],
      [6, -17],
      [17, -12],
      [23, -1],
      [20, 8],
      [11, 14],
      [0, 17],
      [-14, 13],
      [-23, 5],
    ];
    const apron = [],
      tex = [];
    for (let i = 0; i < outline.length; i++) {
      const vert = ([u, v]) => [x + u * s, y + 0.55 * s, z + v * s];
      const a = vert(outline[i]),
        c = vert(outline[(i + 1) % outline.length]);
      const foot = (p) => [
        p[0],
        Math.min(y - 2 * s, highlandHeight(p[0], p[2]) - 1.8 * s),
        p[2],
      ];
      const d = foot(a),
        e = foot(c);
      for (const p of [a, [x, y + 0.55 * s, z], c, a, c, d, c, e, d]) {
        apron.push(...p);
        tex.push((p[0] + p[2]) * 0.11, p[1] * 0.11);
      }
      if (i === outline.length - 1) continue;
      const heading = Math.atan2(c[2] - a[2], c[0] - a[0]);
      const dx = c[0] - a[0],
        dz = c[2] - a[2],
        length = Math.hypot(dx, dz);
      b.box(
        (a[0] + c[0]) / 2,
        y + 1.52 * s,
        (a[2] + c[2]) / 2,
        length,
        2.3 * s,
        1.4 * s,
        m.stone,
        -heading,
      );
      const crenels = Math.max(2, Math.round(length / (3.3 * s)));
      for (let k = 0; k < crenels; k++)
        b.box(
          a[0] + (dx * (k + 0.35)) / crenels,
          y + 3.04 * s,
          a[2] + (dz * (k + 0.35)) / crenels,
          1.4 * s,
          1.25 * s,
          1.43 * s,
          m.trim,
          -heading,
        );
      if (i % 2 === 0) {
        b.cyl(a[0], y + 0.47 * s, a[2], 1.43 * s, 1.97 * s, 6.3 * s, m.dark, 7);
        b.cyl(a[0], y + 4.9 * s, a[2], 0.1, 1.6 * s, 3.0 * s, m.roof, 7);
      }
    }
    const paving = new T.BufferGeometry();
    paving.setAttribute("position", new T.Float32BufferAttribute(apron, 3));
    paving.setAttribute("uv", new T.Float32BufferAttribute(tex, 2));
    paving.computeVertexNormals();
    b.add(paving, m.dark);
    b.box(x, y + 6 * s, z, 28 * s, 12 * s, 15 * s, m.stone);
    gabledRoof(b, m, x, y + 12 * s, z, 16 * s, 29 * s, 8 * s, Math.PI / 2);
    const towers = grand
      ? [
          [-15, -1, 24, 3.4],
          [14, 3, 17, 3.1],
          [-4, -6, 39, 3.7],
          [7, -9, 27, 2.8],
        ]
      : [
          [-14, 1, 14, 4.1],
          [11, -3, 23, 3.2],
        ];
    for (const [dx, dz, h, r] of towers) {
      const tx = x + dx * s,
        tz = z + dz * s;
      const open = grand && h >= 24,
        shaft = open ? h - 6 : h;
      b.cyl(
        tx,
        y + shaft * s * 0.5,
        tz,
        r * s,
        r * s * 1.16,
        shaft * s,
        m.stone,
        8,
      );
      if (open) {
        b.cyl(tx, y + shaft * s, tz, r * s * 1.12, r * s, 0.8 * s, m.trim, 8);
        for (let i = 0; i < 8; i++) {
          const ang = (i * Math.PI) / 4,
            nx = Math.sin(ang),
            nz = Math.cos(ang);
          b.cyl(
            tx + nx * r * 0.88 * s,
            y + (h - 3) * s,
            tz + nz * r * 0.88 * s,
            s * 0.35,
            s * 0.41,
            s * 6,
            m.stone,
            8,
          );
          if (h === 39 && i % 2 === 0) {
            b.cyl(
              tx + nx * r * s,
              y + (h + 3) * s,
              tz + nz * r * s,
              0,
              s * 0.72,
              s * 7.3,
              m.trim,
              6,
            );
            b.beam(
              [tx + nx * r * 1.32 * s, y + h * s, tz + nz * r * 1.32 * s],
              [tx, y + (h + 14) * s, tz],
              0.16 * s,
              m.trim,
            );
          }
        }
      }
      b.cyl(tx, y + h * s, tz, r * s * 1.19, r * s, 0.9 * s, m.trim, 8);
      b.cyl(tx, y + (h + 7) * s, tz, 0.06, r * s * 1.45, 14 * s, m.roof, 8);
      if (grand && h === 39)
        b.cyl(tx, y + (h + 15.2) * s, tz, 0.025, 0.22 * s, 2.4 * s, m.metal, 8);
      b.add(
        archGeo(1.5 * s, 5.6 * s, 0.22),
        m.glass,
        tx,
        y + (shaft - 7) * s,
        tz + r * s,
      );
    }
    for (let i = -3; i <= 3; i++) {
      b.add(
        archGeo(2.5 * s, 6.9 * s, 0.22),
        m.glass,
        x + i * 3.7 * s,
        y + 2.3 * s,
        z + 7.52 * s,
      );
      b.add(
        archGeo(3 * s, 7.4 * s, 0.36, 0.34),
        m.trim,
        x + i * 3.7 * s,
        y + 2.1 * s,
        z + 7.8 * s,
      );
    }
    if (grand) {
      for (const sign of [-1, 1]) {
        const bx = x + sign * 9.6 * s,
          bz = z + 12.4 * s;
        b.box(bx, y + 3.4 * s, bz, 2.1 * s, 7.8 * s, 2.7 * s, m.stone);
        b.cyl(bx, y + 9 * s, bz, 0, 1.15 * s, 4.4 * s, m.trim, 5);
        b.beam(
          [bx, y + 6.3 * s, bz],
          [bx, y + 11 * s, z + 7.4 * s],
          0.55 * s,
          m.trim,
        );
      }
      b.box(x + 8 * s, y + 4 * s, z + 8 * s, 9 * s, 8 * s, 11 * s, m.stone);
      gabledRoof(b, m, x + 8 * s, y + 8 * s, z + 8 * s, 10 * s, 12 * s, 8 * s);
      b.add(
        archGeo(4.4 * s, 6.5 * s, 0.28 * s, 0.46 * s),
        m.trim,
        x + 8 * s,
        y + 0.3 * s,
        z + 13.6 * s,
      );
      b.add(
        archGeo(3.4 * s, 5.9 * s, 0.2 * s),
        m.wood,
        x + 8 * s,
        y + 0.4 * s,
        z + 13.51 * s,
      );
    }
    b.finish();
    colliders.push({
      min: [x - 25 * s, y - 5, z - 25 * s],
      max: [x + 25 * s, y + 54 * s, z + 25 * s],
    });
  }
  for (const [i, peak] of SUMMITS.entries())
    summitKeep(peak.x, peak.h, peak.z, i === 1);
  shelf(-6, 316, 54, 44, 61, 177);
  shelf(179, 278, 57, 48, 57, 258);
  sentry(-6, 62, 316, 1.9);
  sentry(184, 58, 277, 1.2, true);
  gabledRoof(b, m, -23, 79, 325, 16, 24, 11);
  b.box(-23, 70, 325, 15, 18, 23, m.dark);
  gabledRoof(b, m, 197, 69, 286, 16, 23, 13);
  b.box(197, 62, 286, 15, 14, 23, m.dark);
  const rime = new T.MeshStandardMaterial({
    color: 0x98e6ef,
    emissive: 0x63bfd5,
    emissiveIntensity: 0.68,
    roughness: 0.56,
  });
  bareTree(b, m.wood, 12, 61, 315, 10.9, 6, rime);
  bareTree(b, m.wood, 164, 57, 269, 8.7, 7, rime);
  for (const [x, y, z, size] of [
    [-2, 61, 324, 4.1],
    [0, 61, 321, 3.3],
    [177, 57, 275, 5.2],
    [180, 57, 272, 3.8],
  ])
    bareTree(b, rime, x, y, z, size, Math.round(z));
  shelf(142, 183, 25, 20, 40, 91);
  shelf(-24, 224, 34, 21, 38, 129);
  bareTree(b, m.wood, -18, 38, 222, 5.6, 3);
  // Fracture fans climb out of the sea in the direction of the prevailing wind.
  for (const [x, z, reach, sweep] of [
    [148, 187, 31, -1],
    [-27, 223, 23, 1],
    [-205, -170, 47, 1],
    [225, -140, 37, -1],
  ]) {
    const y = z > 0 ? 38 : 0;
    for (let j = 0; j < 11; j++) {
      const t = j / 10,
        len = reach * (1 - t * 0.72) * (0.85 + random() * 0.2);
      iceBlade(
        b,
        j % 3 ? deepIce : ice,
        x + sweep * (t * 18 - 9),
        y - 3,
        z + t * 8 - 4,
        2.2 + random() * 2.8,
        len,
        sweep * len * 0.7,
        -len * 0.38,
        t * 1.3,
        random,
      );
    }
  }
  // Frozen runoff follows specific seams in the main island's actual coast.
  for (const [center, spread] of [
    [0.48, 0.23],
    [1.28, 0.24],
    [-0.96, 0.29],
    [2.45, 0.37],
    [-2.13, 0.32],
  ]) {
    for (let j = 0; j < 17; j++) {
      const a = center + (j / 16 - 0.5) * spread,
        r = cliffRadius(a, 1, 2);
      const length = 2.4 + random() * 12 + (1 - Math.abs(j / 8 - 1)) * 9;
      iceBlade(
        b,
        j % 4 ? ice : deepIce,
        Math.sin(a) * 62 * r,
        91.15,
        Math.cos(a) * 56 * r,
        1.4 + random() * 1.1,
        -length,
        Math.sin(a) * 2.8,
        Math.cos(a) * 2.8,
        a,
        random,
      );
    }
  }
  b.finish();
  return colliders;
}
