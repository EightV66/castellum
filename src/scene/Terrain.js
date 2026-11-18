import * as T from "three";
import { Builder, archGeo } from "./Geometry.js";
import { seeded } from "./Materials.js";
import { cliffRadius } from "./CliffProfile.js";
import { highlandHeight, onPilgrimRoad } from "./Highlands.js";
export function createTerrain(scene, m, surfaceHeight = highlandHeight) {
  const rand = seeded(847),
    b = new Builder(scene),
    islands = [];
  function cliff(x, z, rx, rz, height, seed) {
    const n = 160,
      layers = 28,
      pos = [],
      uv = [],
      col = [],
      idx = [];
    const color = new T.Color();
    for (let j = 0; j <= layers; j++) {
      const f = j / layers,
        y = -13 + f * (height + 13);
      for (let i = 0; i <= n; i++) {
        const a = (i / n) * Math.PI * 2;
        const joint =
          Math.sin(a * 9 + seed + f * 1.9) +
          0.63 * Math.sin(a * 14 - f * 3.6 + seed);
        const ledge = Math.max(
          0,
          1 - Math.abs(f - 0.5 - 0.16 * Math.sin(a * 3 + seed)) * 14,
        );
        const split = Math.max(0, 1 - Math.abs(joint) * 3.0);
        const r = cliffRadius(a, f, seed);
        pos.push(x + Math.sin(a) * rx * r, y, z + Math.cos(a) * rz * r);
        uv.push(((i / n) * rx) / 6, ((j / layers) * height) / 12);
        color.setHSL(
          0.56,
          0.055,
          0.54 + 0.15 * f - split * 0.055 + ledge * 0.041 + rand() * 0.04,
        );
        col.push(color.r, color.g, color.b);
      }
    }
    for (let j = 0; j < layers; j++)
      for (let i = 0; i < n; i++) {
        const a = j * (n + 1) + i,
          c = a + n + 1;
        idx.push(a, a + 1, c, c, a + 1, c + 1);
      }
    const g = new T.BufferGeometry();
    g.setAttribute("position", new T.Float32BufferAttribute(pos, 3));
    g.setAttribute("uv", new T.Float32BufferAttribute(uv, 2));
    g.setAttribute("color", new T.Float32BufferAttribute(col, 3));
    g.setIndex(idx);
    g.computeVertexNormals();
    const mesh = new T.Mesh(g, m.rock);
    mesh.castShadow = mesh.receiveShadow = true;
    scene.add(mesh);
    const top = new T.CircleGeometry(1, n);
    top.rotateX(-Math.PI / 2);
    top.scale(rx, height, rz);
    const tp = top.attributes.position;
    for (let i = 1; i < tp.count; i++) {
      const px = tp.getX(i),
        pz = tp.getZ(i),
        a = Math.atan2(px / rx, pz / rz),
        v = cliffRadius(a, 1, seed);
      tp.setXYZ(i, px * v, 0, pz * v);
    }
    b.add(top, m.ground, x, height, z);
    islands.push({ x, z, rx, rz, height });
    for (let i = 0; i < 28; i++) {
      const a = rand() * Math.PI * 2,
        y = rand() * height * 0.85,
        r = (1.23 - (0.23 * (y + 13)) / (height + 13)) * 0.94,
        g = new T.IcosahedronGeometry(1, 0);
      g.scale(3 + rand() * 5, 5 + rand() * 12, 3 + rand() * 5);
      b.add(g, m.rock, x + Math.sin(a) * rx * r, y, z + Math.cos(a) * rz * r);
    }
  }
  cliff(0, 0, 62, 56, 91, 2);
  cliff(-112, 83, 48, 57, 18, 6);
  cliff(12, 148, 33, 67, 28, 13);
  cliff(-151, -113, 90, 72, 30, 9);
  // Four pointed barrel vaults span the channel; the deep cutwaters reach sea level.
  b.box(0, 88, 99, 10, 1.6, 80, m.trim);
  for (let span = 0; span < 4; span++) {
    const z = 68 + span * 18.2,
      face = new T.Shape();
    face.moveTo(-9.1, 0);
    face.lineTo(-9.1, 40);
    face.lineTo(9.1, 40);
    face.lineTo(9.1, 0);
    face.lineTo(7.7, 0);
    face.lineTo(7.7, 12);
    face.quadraticCurveTo(7.55, 25, 0, 34.6);
    face.quadraticCurveTo(-7.55, 25, -7.7, 12);
    face.lineTo(-7.7, 0);
    face.closePath();
    const vault = new T.ExtrudeGeometry(face, {
      depth: 8.5,
      bevelEnabled: false,
      curveSegments: 12,
    });
    const uv = vault.attributes.uv;
    for (let i = 0; i < uv.count; i++)
      uv.setXY(i, uv.getX(i) / 12, uv.getY(i) / 12);
    b.add(vault, m.stone, -4.25, 47, z, 0, Math.PI / 2);
    for (const dx of [-4.55, 4.15])
      b.add(
        archGeo(16.4, 35.6, 0.42, 0.63),
        m.trim,
        dx,
        46.9,
        z,
        0,
        Math.PI / 2,
      );
  }
  for (let i = 0; i <= 4; i++) {
    const z = 58.9 + i * 18.2;
    b.box(0, 23, z, 8.7, 49, 3.4, m.stone);
    const nose = new T.CylinderGeometry(1, 1.56, 49, 4);
    nose.scale(5.8, 1, 2.35);
    b.add(nose, m.dark, 0, 22.8, z);
    b.box(0, 47, z, 10.4, 1.15, 4.6, m.trim);
  }
  for (const x of [-5, 5]) {
    b.box(x, 90, 99, 0.7, 3.2, 80, m.dark);
    for (let z = 63; z < 139; z += 3) b.box(x, 92, z, 0.9, 1.6, 1, m.stone);
  }
  // Village with timber framing, steep roof pitches and chimneys.
  function house(x, z, s, ry) {
    const y = Math.max(18, surfaceHeight(x, z));
    b.box(x, y + 3 * s, z, 7 * s, 6 * s, 8 * s, m.stone, ry);
    const roof = new T.CylinderGeometry(0, 1, 1, 4);
    roof.rotateY(Math.PI / 4);
    roof.scale(6 * s, 5 * s, 7 * s);
    b.add(roof, m.roof, x, y + 8 * s, z, 0, ry);
    for (const dx of [-2.8, 0, 2.8])
      b.box(x + dx * s, y + 3 * s, z + 4.04 * s, 0.24, 6 * s, 0.2, m.wood);
    for (const yy of [y + 1, y + 5.5 * s])
      b.box(x, yy, z + 4.08 * s, 7 * s, 0.25, 0.2, m.wood);
    b.add(
      archGeo(1.3 * s, 2 * s, 0.1),
      m.glass,
      x - 1.8 * s,
      y + 2.7 * s,
      z + 4.15 * s,
    );
    b.add(
      archGeo(1.3 * s, 2 * s, 0.1),
      m.glass,
      x + 1.8 * s,
      y + 2.7 * s,
      z + 4.15 * s,
    );
    b.box(x + 2 * s, y + 9 * s, z, 1 * s, 5 * s, 1 * s, m.dark);
  }
  for (let i = 0; i < 24; i++) {
    const a = i * 2.4,
      r = 10 + Math.sqrt(i) * 6;
    house(
      -112 + Math.sin(a) * r,
      83 + Math.cos(a) * r,
      0.65 + rand() * 0.55,
      0,
    );
  }
  cliff(106, 54, 12, 10, 13, 18);
  b.cyl(106, 31, 54, 3.5, 5.3, 36, m.trim, 16);
  for (const y of [20, 30, 40]) b.cyl(106, y, 54, 4.4, 4.4, 0.6, m.dark, 16);
  b.cyl(106, 50, 54, 4.2, 4.2, 5, m.glass, 12);
  b.cyl(106, 54, 54, 0, 6, 5, m.roof, 12);
  const beacon = new T.SpotLight(0xffdb9f, 1500, 260, 0.12, 0.7, 1);
  beacon.position.set(106, 51, 54);
  scene.add(beacon, beacon.target);
  // Ruins and coastal overlook.
  for (let i = 0; i < 7; i++) {
    const a = i * 0.65;
    b.cyl(
      -153 + Math.cos(a) * 12,
      34,
      -115 + Math.sin(a) * 12,
      1,
      1.3,
      8 + rand() * 6,
      m.stone,
      8,
    );
  }
  b.cyl(-45, 96, 30, 6, 7, 3, m.trim, 20);
  for (let i = 0; i < 12; i++) {
    const a = (i * Math.PI) / 6;
    b.box(
      -45 + Math.sin(a) * 5.5,
      99,
      30 + Math.cos(a) * 5.5,
      0.6,
      4,
      0.6,
      m.trim,
    );
  }
  b.finish();
  // Instanced conifers with trunk and three overlapping irregular foliage crowns.
  const needleGeometry = new T.ConeGeometry(1, 1, 9, 7);
  const np = needleGeometry.attributes.position;
  for (let i = 0; i < np.count; i++) {
    const y = np.getY(i),
      f = y + 0.5,
      factor =
        (Math.round(f * 7) % 2 ? 0.72 : 1.14) * (1 + Math.sin(i * 13) * 0.1);
    np.setX(i, np.getX(i) * factor);
    np.setZ(i, np.getZ(i) * factor);
  }
  needleGeometry.computeVertexNormals();
  const count = 830,
    trunks = new T.InstancedMesh(
      new T.CylinderGeometry(0.3, 0.65, 1, 5),
      m.wood,
      count,
    ),
    leaves = new T.InstancedMesh(needleGeometry, m.leaf.clone(), count * 3),
    o = new T.Object3D(),
    color = new T.Color();
  const groves = [
    [-255, -183, 31, 34],
    [-258, -260, 39, 31],
    [120, -116, 31, 49],
    [92, 63, 21, 44],
    [-87, 188, 24, 33],
    [-194, -6, 44, 33],
    [96, -41, 22, 26],
  ];
  const farMatrices = new Float32Array(count * 16);
  for (let i = 0; i < count; i++) {
    const a = rand() * Math.PI * 2,
      r = Math.sqrt(rand()) * 0.92;
    let x = -151 + Math.sin(a) * 85 * r,
      z = -113 + Math.cos(a) * 65 * r,
      y = 30;
    if (i < 90) {
      x = -112 + Math.sin(a) * 44;
      z = 83 + Math.cos(a) * 52;
      y = 18;
    }
    y = Math.max(y, surfaceHeight(x, z));
    if (i >= 460) {
      const [cx, cz, rx, rz] = groves[i % groves.length];
      x = cx + Math.sin(a) * rx * r;
      z = cz + Math.cos(a) * rz * r;
      y = surfaceHeight(x, z);
      const slope = Math.hypot(
        surfaceHeight(x + 1, z) - y,
        surfaceHeight(x, z + 1) - y,
      );
      if (
        slope > 0.9 ||
        onPilgrimRoad(x, z, 9) ||
        Math.hypot(x - 106, z - 54) < 10
      ) {
        i--;
        continue;
      }
    }
    const h = i >= 460 ? 3.8 + rand() * 7 : 6 + rand() * 11;
    o.position.set(x, y + h * 0.53, z);
    o.scale.set(h * 0.28, h * 1.1, h * 0.28);
    o.rotation.y = a;
    o.updateMatrix();
    o.matrix.toArray(farMatrices, i * 16);
    o.position.set(x, y + h * 0.4, z);
    o.scale.set(1, h * 0.8, 1);
    o.updateMatrix();
    trunks.setMatrixAt(i, o.matrix);
    for (let k = 0; k < 3; k++) {
      o.position.y = y + h * (0.4 + k * 0.21);
      o.scale.set(h * (0.3 - k * 0.06), h * 0.65, h * (0.3 - k * 0.06));
      o.rotation.y = a;
      o.updateMatrix();
      leaves.setMatrixAt(i * 3 + k, o.matrix);
      color.setHSL(
        0.5 + rand() * 0.06,
        0.09 + rand() * 0.1,
        0.19 + k * 0.12 + rand() * 0.16,
      );
      leaves.setColorAt(i * 3 + k, color);
    }
  }
  leaves.castShadow = true;
  trunks.castShadow = true;
  const distant = new T.InstancedMesh(
      new T.ConeGeometry(1, 1, 5),
      leaves.material,
      count,
    ),
    matrix = new T.Matrix4();
  for (let i = 0; i < count; i++) {
    matrix.fromArray(farMatrices, i * 16);
    distant.setMatrixAt(i, matrix);
    leaves.getColorAt(i * 3, color);
    distant.setColorAt(i, color);
  }
  const forestLOD = new T.LOD();
  forestLOD.addLevel(leaves, 0);
  forestLOD.addLevel(distant, 380);
  scene.add(trunks, forestLOD);
  leaves.material.onBeforeCompile = (s) => {
    s.uniforms.wind = { value: 0 };
    scene.userData.treeWind = s.uniforms.wind;
    s.vertexShader = "uniform float wind;\n" + s.vertexShader;
    s.vertexShader = s.vertexShader.replace(
      "#include <begin_vertex>",
      "#include <begin_vertex>\ntransformed.x+=sin(wind+instanceMatrix[3].x*.07)*.025*(position.y+.5);",
    );
    s.vertexShader =
      "varying float vBranchSnow;\n" +
      s.vertexShader.replace(
        "#include <begin_vertex>",
        "#include <begin_vertex>\nvBranchSnow=smoothstep(.06,.59,position.y+.5)*(.7+.3*sin(position.x*16.+position.z*13.));",
      );
    s.fragmentShader =
      "varying float vBranchSnow;\n" +
      s.fragmentShader.replace(
        "#include <color_fragment>",
        "#include <color_fragment>\ndiffuseColor.rgb=mix(diffuseColor.rgb,vec3(.40,.59,.68),vBranchSnow*.73);",
      );
  };
  return {
    islands,
    beacon,
    forest: forestLOD,
    update(t) {
      if (scene.userData.treeWind) scene.userData.treeWind.value = t;
      beacon.target.position.set(
        106 + Math.cos(t * 0.16) * 180,
        8,
        54 + Math.sin(t * 0.16) * 180,
      );
    },
  };
}

export function createMountains(scene) {
  const hash = (x, z) => {
    const n = Math.sin(x * 127.1 + z * 311.7) * 43758.5453;
    return n - Math.floor(n);
  };
  const noise = (x, z) => {
    const a = Math.floor(x),
      b = Math.floor(z);
    let u = x - a,
      v = z - b;
    u = u * u * (3 - 2 * u);
    v = v * v * (3 - 2 * v);
    return T.MathUtils.lerp(
      T.MathUtils.lerp(hash(a, b), hash(a + 1, b), u),
      T.MathUtils.lerp(hash(a, b + 1), hash(a + 1, b + 1), u),
      v,
    );
  };
  const fbm = (x, z) => {
    let sum = 0,
      amp = 0.5;
    for (let i = 0; i < 6; i++) {
      sum += noise(x, z) * amp;
      x *= 2.07;
      z *= 2.07;
      amp *= 0.5;
    }
    return sum;
  };
  const nx = 230,
    nz = 100,
    p = [],
    uv = [],
    colors = [],
    idx = [],
    c = new T.Color();
  for (let j = 0; j <= nz; j++)
    for (let i = 0; i <= nx; i++) {
      const x = -1100 + (i / nx) * 2200,
        z = -1100 + (j / nz) * 900;
      const front = T.MathUtils.smoothstep(-z, 220, 420);
      const ridge = Math.pow(
        1 - Math.abs(fbm(x * 0.003, z * 0.003) * 2 - 1),
        2,
      );
      const peaks =
        0.55 + 0.45 * Math.sin(x * 0.009 + Math.sin(z * 0.007) * 2) ** 2;
      const h =
        front * (30 + ridge * peaks * 230 + fbm(x * 0.017, z * 0.017) * 40) -
        14;
      const snow = h > 155 + noise(x * 0.025, z * 0.025) * 45;
      c.set(snow ? 0xb6c5cb : 0x687a83);
      c.multiplyScalar(0.62 + fbm(x * 0.03, z * 0.03) * 0.5);
      p.push(x, h, z);
      uv.push((i / nx) * 15, (j / nz) * 9);
      colors.push(c.r, c.g, c.b);
    }
  for (let j = 0; j < nz; j++)
    for (let i = 0; i < nx; i++) {
      const a = j * (nx + 1) + i;
      idx.push(a, a + nx + 1, a + 1, a + 1, a + nx + 1, a + nx + 2);
    }
  const g = new T.BufferGeometry();
  g.setAttribute("position", new T.Float32BufferAttribute(p, 3));
  g.setAttribute("uv", new T.Float32BufferAttribute(uv, 2));
  g.setAttribute("color", new T.Float32BufferAttribute(colors, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  const mesh = new T.Mesh(
    g,
    new T.MeshStandardMaterial({ vertexColors: true, roughness: 1 }),
  );
  scene.add(mesh);
}
