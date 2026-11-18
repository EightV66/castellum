import * as T from "three";

// Geological coordinates: span runs west from the spur, rise is relative to
// its root, sweep runs north. The broad upper bed shelters the split strata.
export const WING_ROOT = Object.freeze({ x: -157, y: 356, z: -328 });
// start [span,rise,sweep], tip [span,rise,sweep], half-thickness, half-depth,
// camber and fold. Each bed parts company with the backbone at a different fold.
const beds = [
  [[-12, 11, 10], [624, 401, 139], 31, 51, 7, 16],
  [[67, 39, 24], [566, 312, 114], 36, 48, 2, 17],
  [[146, 82, 21], [541, 260, 82], 24, 39, 16, 4],
  [[2, 1, -7], [456, 191, 63], 44, 61, -8, -12],
  [[133, 43, -6], [482, 144, 26], 32, 49, 22, 11],
  [[43, -4, -21], [388, 91, 13], 43, 50, 7, -19],
  [[98, 12, -30], [414, 51, -9], 27, 32, 17, -12],
  [[3, -13, -11], [333, 28, 23], 42, 49, -8, 9],
  [[12, -21, -26], [305, -7, -11], 31, 32, -5, 14],
  [[66, -23, -19], [237, -35, 2], 21, 30, -9, 8],
  [[-6, -24, 9], [188, -47, 28], 28, 40, 14, -9],
  [[-8, -140, 10], [151, 43, 40], 28, 44, 12, 6],
  [[7, -112, -8], [205, 64, 19], 19, 34, 14, -2],
];
// Seven flanks with sharp cleavage edges, instead of circular cross-sections.
const bevel = [
  [-0.25, 1],
  [0.44, 0.72],
  [1, 0.12],
  [0.59, -0.27],
  [0.02, -1],
  [-0.57, -0.48],
  [-0.92, 0.21],
];
const colors = [
  0xb5dce5, 0x719ecb, 0x354e99, 0x332e6b, 0x222f50, 0x394b76, 0x6590aa,
];

function bedPoint(bed, t, k, index) {
  const [start, tip, thickness, depth, camber, fold] = bed;
  const face = Math.floor(k / 4),
    v = (k % 4) / 4;
  const next = (face + 1) % bevel.length;
  const z = T.MathUtils.lerp(bevel[face][0], bevel[next][0], v);
  const y = T.MathUtils.lerp(bevel[face][1], bevel[next][1], v);
  const curve = Math.sin(t * Math.PI),
    span = T.MathUtils.lerp(start[0], tip[0], t);
  // The strata pinch to a buried fold at both ends. Bedding breaks obliquely
  // across the cleavage planes and twists gradually around the long axis.
  const rise =
    T.MathUtils.lerp(start[1], tip[1], t ** 1.44) + (camber - 7) * curve;
  const sweep = T.MathUtils.lerp(start[2], tip[2], t) + (fold - 15) * curve;
  const gauge =
    Math.pow(Math.max(0, Math.sin(Math.PI * t)), 0.6) * (1.37 - 0.59 * t);
  const grain =
    0.073 * Math.sin(t * 16 + z * 3.2 - y * 4.2 + index) +
    0.032 * Math.sin(t * 42 - z * 7.6 + y * 6 + index * 3);
  const cleavage =
    0.092 * Math.tanh(Math.sin(t * 20 + z * 2 + y * 3 + index) * 3);
  const angularFault = 1 + grain + cleavage;
  const twist = (0.22 + 0.24 * Math.sin(index * 2.17 + t * 4.2)) * curve;
  return [
    WING_ROOT.x - span + gauge * (z * 14 + 7 * grain),
    WING_ROOT.y + rise + (y + z * twist) * thickness * gauge * angularFault,
    WING_ROOT.z - sweep + (z - y * twist) * depth * gauge * angularFault,
  ];
}

// A continuous syncline binds the upper blades into one massive outcrop.
// Its cut ribs run through the rock below the high court into the outer beds.
function spinePoint(t, k) {
  const a = (k * Math.PI * 2) / 28;
  const span = -14 + 563 * t;
  const top = 16 + 338 * Math.pow(t, 1.39);
  const width = Math.pow(Math.max(0, Math.sin(t * Math.PI)), 0.68);
  const bottom = top - 133 * width;
  const knurl =
    width *
    (5.5 * Math.sin(31 * t + 2 * Math.sin(a * 3)) +
      4 * Math.sin(a * 9 + 21 * t));
  return [
    WING_ROOT.x - span + width * Math.sin(a) * 8,
    WING_ROOT.y +
      (top + bottom) / 2 +
      Math.cos(a) * ((top - bottom) / 2 + knurl) -
      77 * (1 - t) ** 6,
    WING_ROOT.z - 107 * t - 17 * width + Math.sin(a) * width * (44 + knurl),
  ];
}

export function createWingMountain(scene) {
  const positions = [],
    normals = [],
    texcoords = [],
    tints = [],
    collision = [];
  const N = 58,
    sides = 28,
    a = new T.Vector3(),
    b = new T.Vector3(),
    origin = new T.Vector3(),
    normal = new T.Vector3();
  const color = new T.Color();
  function tri(vertices, uv, shade, variation) {
    origin.fromArray(vertices[0]);
    a.fromArray(vertices[1]).sub(origin);
    b.fromArray(vertices[2]).sub(origin);
    normal.crossVectors(a, b).normalize();
    color.set(shade).multiplyScalar(variation);
    for (let j = 0; j < 3; j++) {
      positions.push(...vertices[j]);
      normals.push(normal.x, normal.y, normal.z);
      texcoords.push(...uv[j]);
      tints.push(color.r, color.g, color.b);
    }
  }
  for (let i = 0; i <= beds.length; i++) {
    const core = i === beds.length,
      bed = beds[i],
      distance = core ? 563 : bed[1][0] - bed[0][0];
    const sample = core ? spinePoint : (t, k) => bedPoint(bed, t, k, i);
    for (let j = 0; j < N; j++) {
      const t = j / N,
        u = (j + 1) / N;
      const bbox = new T.Box3();
      for (let k = 0; k < sides; k++) {
        const n = (k + 1) % sides;
        const v0 = sample(t, k),
          v1 = sample(t, n);
        const v2 = sample(u, n),
          v3 = sample(u, k);
        const shade = colors[Math.floor(k / 4)],
          variation =
            0.89 +
            0.12 * Math.sin(i * 1.8 + t * 13) +
            0.07 * Math.sin(k * 1.9 + i + t * 48);
        const s0 = (t * distance) / 84 + i * 0.57,
          s1 = (u * distance) / 84 + i * 0.57;
        const v = k * 0.064 + i * 0.39;
        // Repeated longitudinal vertices preserve the edge between strata.
        if (j > 0)
          tri(
            [v0, v3, v1],
            [
              [s0, v],
              [s1, v],
              [s0, v + 0.064],
            ],
            shade,
            variation,
          );
        if (j < N - 1)
          tri(
            [v1, v3, v2],
            [
              [s0, v + 0.064],
              [s1, v],
              [s1, v + 0.064],
            ],
            shade,
            variation,
          );
        for (const vertex of [v0, v3]) bbox.expandByPoint(a.fromArray(vertex));
      }
      collision.push(bbox);
    }
  }
  const g = new T.BufferGeometry();
  g.setAttribute("position", new T.Float32BufferAttribute(positions, 3));
  g.setAttribute("normal", new T.Float32BufferAttribute(normals, 3));
  g.setAttribute("color", new T.Float32BufferAttribute(tints, 3));
  g.setAttribute("uv", new T.Float32BufferAttribute(texcoords, 2));
  const mat = new T.MeshStandardMaterial({
    vertexColors: true,
    side: T.DoubleSide,
    roughness: 0.48,
    metalness: 0.13,
  });
  mat.userData.highAltitudeHaze = 0.47;
  const mesh = new T.Mesh(g, mat);
  mesh.name = "frozen-wing-ridge";
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  g.computeBoundingBox();
  scene.add(mesh);
  const union = g.boundingBox.clone().expandByScalar(3);
  // Broad phase keeps ordinary movement around the citadel inexpensive.
  for (const box of collision) box.expandByScalar(2);
  return {
    mesh,
    contains(point) {
      return (
        union.containsPoint(point) &&
        collision.some((box) => box.containsPoint(point))
      );
    },
    setSlate(texture) {
      mat.map = texture;
      mat.bumpMap = texture;
      mat.bumpScale = 1.85;
      mat.needsUpdate = true;
      mat.onBeforeCompile = (shader) => {
        shader.vertexShader =
          "varying vec3 bedWorld;varying float upperFace;\n" +
          shader.vertexShader.replace(
            "#include <begin_vertex>",
            "#include <begin_vertex>\nbedWorld=position;upperFace=normal.y;",
          );
        shader.fragmentShader =
          "varying vec3 bedWorld;varying float upperFace;\n" +
          shader.fragmentShader
            .replace(
              "#include <map_fragment>",
              `
          vec3 slate=texture2D(map,vMapUv*vec2(.72,1.68)).rgb;
          float scaleLine=texture2D(map,vMapUv*vec2(.21,2.8)+vec2(.2,.7)).g;
          float plate=texture2D(map,vMapUv*.47+bedWorld.y*.003).g;
          diffuseColor.rgb*=.39+2.7*sqrt(slate)+.36*scaleLine;
        `,
            )
            .replace(
              "#include <color_fragment>",
              `
          #include <color_fragment>
          float rootIce=smoothstep(-456.,-163.,bedWorld.x);
          float deposition=smoothstep(-.47,.80,upperFace+.32*scaleLine);
          diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.21,.35,.42)*(.40+1.8*sqrt(slate)),rootIce*(.58+.36*deposition));
          diffuseColor.rgb+=vec3(.055,.096,.12)*deposition*(.42+.58*rootIce);
        `,
            )
            .replace(
              "#include <opaque_fragment>",
              `
          float drift=bedWorld.y*.033+bedWorld.x*.013+bedWorld.z*.026;
          float cut=abs(fract(drift+sin(bedWorld.x*.014)*.63+slate.g*1.6+scaleLine*.9)-.52);
          float crystals=(1.-smoothstep(.012,.19,cut))*(.22+.78*smoothstep(.06,.39,plate));
          float rim=pow(1.-abs(dot(normalize(vViewPosition),normal)),2.4);
          vec3 blueIce=mix(vec3(.023,.053,.21),vec3(.062,.34,.58),clamp(slate.b*2.8+.19,0.,1.));
          outgoingLight+=blueIce*(crystals*.74+rim*.30)+vec3(.012,.016,.036)*plate;
          #include <opaque_fragment>`,
            );
      };
    },
  };
}
