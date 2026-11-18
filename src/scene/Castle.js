import { buildCrownChapel } from "./CrownChapel.js";
import {
  createArchitecturalDetails,
  gabledRoof,
} from "./ArchitecturalDetails.js";
import * as T from "three";
import { Builder, archGeo } from "./Geometry.js";
export function createCastle(scene, m) {
  const b = new Builder(scene),
    flags = [],
    torches = [],
    colliders = [];
  scene.userData.glass = m.glass;
  const base = 92;
  function box(x, y, z, w, h, d, mat = m.stone, rot = 0) {
    b.box(x, y, z, w, h, d, mat, rot);
  }
  function win(x, y, z, w, h, rot = 0) {
    const f = (g, mat, offset = 0) =>
      b.add(
        g,
        mat,
        x + Math.sin(rot) * offset,
        y,
        z + Math.cos(rot) * offset,
        0,
        rot,
      );
    f(archGeo(w + 0.5, h + 0.5, 0.28), m.black);
    f(archGeo(w, h, 0.06), m.glass, 0.34);
    f(archGeo(w + 0.75, h + 0.65, 0.4, 0.32), m.trim, 0.24);
    const dx = Math.cos(rot),
      dz = -Math.sin(rot);
    for (let k = -1; k <= 1; k++)
      box(
        x + dx * k * w * 0.24 + Math.sin(rot) * 0.4,
        y + h * 0.36,
        z + dz * k * w * 0.24 + Math.cos(rot) * 0.4,
        0.12,
        h * 0.72,
        0.18,
        m.dark,
        rot,
      );
    box(
      x + Math.sin(rot) * 0.43,
      y + h * 0.32,
      z + Math.cos(rot) * 0.43,
      w,
      0.13,
      0.18,
      m.dark,
      rot,
    );
  }
  function spire(x, z, y, r, h) {
    const profile = [
      [0, r],
      [0.1, r * 1.06],
      [0.18, r * 0.83],
      [0.58, r * 0.44],
      [0.72, r * 0.31],
      [0.8, r * 0.34],
      [1, 0.025],
    ].map(([t, rr]) => new T.Vector2(rr, t * h));
    b.add(new T.LatheGeometry(profile, 16), m.roof, x, y, z);
    for (let k = 0; k < 8; k++) {
      const a = (k * Math.PI) / 4;
      const path = new T.CatmullRomCurve3(
        profile.map(
          (p) =>
            new T.Vector3(
              x + Math.sin(a) * p.x,
              y + p.y,
              z + Math.cos(a) * p.x,
            ),
        ),
      );
      b.add(new T.TubeGeometry(path, 12, 0.075, 4, false), m.metal);
    }
    for (let k = 1; k < 5; k++)
      for (let j = 0; j < 4; j++) {
        const a = (j * Math.PI) / 2,
          rr = r * (1 - k / 6);
        b.sphere(
          x + Math.sin(a) * rr,
          y + (h * k) / 6,
          z + Math.cos(a) * rr,
          0.17,
          m.trim,
          1,
          1.7,
          1,
        );
      }
    for (let i = 1; i < 6; i++)
      b.cyl(
        x,
        y + (h * i) / 7,
        z,
        r * (1 - i / 7) + 0.12,
        r * (1 - i / 7) + 0.12,
        0.19,
        m.metal,
        12,
      );
    b.beam([x, y + h, z], [x, y + h + 3, z], 0.08, m.gold);
    box(x, y + h + 2.2, z, 2.2, 0.12, 0.1, m.gold);
  }
  function flag(x, y, z, scale = 1) {
    b.beam([x, y - 3, z], [x, y + 5 * scale, z], 0.1, m.metal);
    const g = new T.PlaneGeometry(5.8 * scale, 3 * scale, 20, 8);
    g.translate(2.9 * scale, -1.5 * scale, 0);
    const mat = m.banner
      ? m.banner.clone()
      : new T.MeshStandardMaterial({
          color: 0x641c26,
          side: T.DoubleSide,
          roughness: 0.9,
        });
    mat.onBeforeCompile = (s) => {
      s.uniforms.uTime = { value: 0 };
      s.vertexShader = "uniform float uTime;\n" + s.vertexShader;
      s.vertexShader = s.vertexShader.replace(
        "#include <begin_vertex>",
        "#include <begin_vertex>\ntransformed.z += sin(position.x*1.7-uTime*3.5+position.y)*.45*(position.x/5.8)+sin(position.x*3.1-uTime*5.)*.18*(position.x/5.8);",
      );
      flags.push(s.uniforms.uTime);
    };
    const mesh = new T.Mesh(g, mat);
    mesh.position.set(x, y + 4 * scale, z);
    mesh.castShadow = true;
    scene.add(mesh);
  }

  function tower(x, z, r, h, type = "spire") {
    const variant = Math.abs(Math.round(x + z)) % 3;
    const shaft = [
      [r * 1.08, 0],
      [r * 1.08, 2],
      [r, 3],
      [r, h * 0.45],
      [r * 0.88, h * 0.48],
      [r * 0.88, h * 0.82],
      [r * 0.98, h * 0.84],
      [r * 0.98, h],
    ].map(([rr, yy]) => new T.Vector2(rr, yy));
    const shaftGeo = new T.LatheGeometry(shaft, variant === 0 ? 12 : 20);
    const shaftUV = shaftGeo.attributes.uv;
    for (let i = 0; i < shaftUV.count; i++)
      shaftUV.setXY(
        i,
        (shaftUV.getX(i) * Math.PI * r) / 6,
        (shaftUV.getY(i) * h) / 12,
      );
    b.add(shaftGeo, m.stone, x, base, z);
    b.cyl(x, base + 1, z, r + 1.2, r + 1.8, 2, m.dark, 20);
    for (let k = 1; k < (h > 40 ? 4 : 2); k++) {
      b.cyl(x, base + (h * k) / 4, z, r * 1.02, r * 1.02, 0.7, m.trim, 20);
      for (let i = 0; i < 6; i++) {
        const a = (i * Math.PI) / 3;
        win(
          x + Math.sin(a) * (r + 0.04),
          base + (h * k) / 4 + 1,
          z + Math.cos(a) * (r + 0.04),
          1.15,
          3.8,
          -(-a),
        );
      }
    }
    for (let i = 0; i < 8; i++) {
      const a = (i * Math.PI) / 4;
      box(
        x + Math.cos(a) * r,
        base + h / 2,
        z + Math.sin(a) * r,
        0.65,
        h,
        0.65,
        m.trim,
        a,
      );
    }
    b.cyl(x, base + h, z, r + 1, r, 0.9, m.trim, 20);
    if (type === "spire") {
      spire(x, z, base + h + 0.5, r + 1.3, r * (3.2 + variant * 0.55));
      for (let i = 0; i < 4; i++) {
        const a = (i * Math.PI) / 2;
        const tx = x + Math.sin(a) * (r + 0.5),
          tz = z + Math.cos(a) * (r + 0.5);
        b.cyl(tx, base + h + 1.8, tz, 0.75, 0.85, 5, m.trim, 8);
        spire(tx, tz, base + h + 4.2, 1.15, 5);
      }
    } else {
      b.cyl(x, base + h + 0.5, z, r + 0.8, r + 0.8, 0.7, m.dark, 20);
      for (let i = 0; i < 14; i++) {
        const a = (i * Math.PI) / 7;
        box(
          x + Math.sin(a) * r,
          base + h + 1.7,
          z + Math.cos(a) * r,
          1.8,
          2.7,
          1.5,
          m.stone,
          a,
        );
      }
      flag(x, base + h + 2, z, 0.8);
    }
    colliders.push({
      min: [x - r - 1, base, z - r - 1],
      max: [x + r + 1, base + h + r * 4, z + r + 1],
    });
  }
  // Terraced citadel and articulated cathedral keep.
  b.cyl(0, base - 1, 0, 56, 58, 5, m.dark, 60);
  b.cyl(0, base + 1, 0, 52, 54, 1, m.ground, 60);
  box(0, base + 21, 0, 29, 42, 37);
  box(0, base + 44, -5, 23, 9, 27, m.dark);
  gabledRoof(b, m, 0, base + 48, -5, 29, 39, 18);
  // Strong horizontal cornices and vertical buttress rhythm.
  for (const y of [base + 1, base + 12, base + 26, base + 41])
    box(0, y, 0, 30, 0.8, 38, m.trim);
  buildCrownChapel(b, m, base, colliders);
  // Long swallowtail standards mark the royal entrance, with the top edge
  // fastened to an iron crossbar and a free, wind-driven lower hem.
  const standardTime = { value: 0 };
  flags.push(standardTime);
  const standardMat = (m.banner ?? m.wood).clone();
  standardMat.side = T.DoubleSide;
  standardMat.onBeforeCompile = shader => {
    shader.uniforms.uPennonTime = standardTime;
    shader.vertexShader = "uniform float uPennonTime;\n"+shader.vertexShader;
    shader.vertexShader = shader.vertexShader.replace("#include <begin_vertex>",
      `#include <begin_vertex>
       float hanging = 1.0 - uv.y;
       transformed.z += hanging*(.65+.45*sin(uv.y*8.+uPennonTime*2.1)+.22*cos(uv.x*7.+uv.y*9.-uPennonTime*2.7));
       transformed.x += .46*hanging*hanging*sin(uv.y*5.+uPennonTime*1.8);`);
  };
  for (const s of [-1,1]) {
    const x=s*18.8,z=27.65,y=base+36.3;
    b.beam([x-1.65,y,z],[x+1.65,y,z],.105,m.gold);
    for(const d of [-1,1]) b.beam([x+d,y-.55,z-1.2],[x+d,y,z],.11,m.metal);
    const cloth=new T.PlaneGeometry(2.65,12,12,18);
    const p=cloth.attributes.position,uv=cloth.attributes.uv;
    for(let i=0;i<p.count;i++){
      const v=uv.getY(i),u=uv.getX(i);
      p.setY(i,p.getY(i)-6+1.8*(1-Math.abs(2*u-1))*Math.pow(1-v,6));
      p.setZ(i,.12*Math.cos(u*Math.PI*6));
    }
    cloth.computeVertexNormals();
    const mesh=new T.Mesh(cloth,standardMat);
    mesh.position.set(x,y,z);
    mesh.castShadow=true;
    scene.add(mesh);
  }
  tower(-16, -20, 5.5, 60);
  tower(15, -20, 5, 68);
  tower(2, -6, 3.8, 65);
  tower(-35, -12, 4.6, 43);
  tower(34, -19, 5.1, 48);
  tower(32, 15, 4, 38);
  tower(-30, 22, 4.4, 33);
  flag(-16, base + 83, -20, 1);
  flag(2, base + 80, -6, 1.2);
  // Clock tower: actual dial and hands.
  box(-34, base + 24, 3, 10, 48, 10);
  spire(-34, 3, base + 48, 8, 25);
  b.add(new T.CircleGeometry(3.3, 48), m.black, -34, base + 40, 8.11);
  b.add(new T.TorusGeometry(3.3, 0.22, 6, 48), m.gold, -34, base + 40, 8.2);
  for (let i = 0; i < 12; i++) {
    const a = (i * Math.PI) / 6;
    box(
      -34 + Math.sin(a) * 2.8,
      base + 40 + Math.cos(a) * 2.8,
      8.3,
      0.16,
      0.43,
      0.1,
      m.gold,
    );
  }
  b.beam([-34, base + 40, 8.4], [-34, base + 42.2, 8.4], 0.09, m.gold);
  b.beam([-34, base + 40, 8.4], [-32.2, base + 39.3, 8.4], 0.12, m.gold);
  // Two rings of curtain walls with a central gate left open.
  for (const [r, y, h] of [
    [50, base + 5, 11],
    [56, base - 1, 8],
  ])
    for (let i = 0; i < 36; i++) {
      const a = (i * Math.PI * 2) / 36;
      if (Math.abs(Math.sin(a)) < 0.17 || (i===19 && Math.cos(a)<0)) continue;
      const x = Math.sin(a) * r,
        z = Math.cos(a) * r;
      box(x, y, z, 10.2, h, 2.5, m.stone, a);
      box(x, y + h / 2 + 0.3, z, 10.2, 0.5, 3.3, m.trim, a);
      for (let j = -1; j <= 1; j++)
        box(
          x + Math.cos(a) * j * 3.2,
          y + h / 2 + 1.6,
          z - Math.sin(a) * j * 3.2,
          1.7,
          2.5,
          2.7,
          m.stone,
          a,
        );
    }
  for (const a of [-0.7, 0.7, 1.65, -1.65, 2.6, -2.6])
    tower(Math.sin(a) * 51, Math.cos(a) * 51, 5.7, 16, "defense");
  tower(-8, 49, 4.4, 23, "defense");
  tower(8, 49, 4.4, 23, "defense");
  b.add(archGeo(13.8,12,2.4,1.25),m.trim,-3.5,base-1,-51.2,0,.15);
  b.add(archGeo(11, 15, 5, 1.2), m.trim, 0, base - 1, 47.5);
  box(0, base + 16, 50, 10, 5, 5);
  for (let x = -3.5; x <= 3.5; x += 0.7)
    box(x, base + 8.8, 50, 0.13, 10, 0.16, m.metal);
  box(0, base + 0.1, 59, 9, 0.7, 15, m.wood);
  const ramp=new T.BoxGeometry(8.8,.62,13.7);
  b.add(ramp,m.wood,0,90.25,72.6,.256);
  for (const x of [-4, 4])
    b.beam([x, base + 10, 51], [x, base + 1, 65], 0.09, m.metal);
  // Gargoyles, sculptural corbels and chains of ivy.
  for (let i = 0; i < 16; i++) {
    const a = (i * Math.PI) / 8,
      x = Math.sin(a) * 50,
      z = Math.cos(a) * 50;
    b.sphere(x, base + 11, z, 1, m.dark, 0.6, 0.8, 1.5);
    b.beam(
      [x, base + 11, z],
      [x + Math.sin(a) * 3, base + 11.8, z + Math.cos(a) * 3],
      0.28,
      m.dark,
    );
  }
  for (let i = 0; i < 95; i++) {
    const a = i * 2.399,
      x = Math.sin(a) * 55.9,
      z = Math.cos(a) * 55.9,
      y = base + 1 + Math.sin(i * 7) * 4;
    b.sphere(x, y, z, 0.6, m.leaf, 1, 0.6, 0.25);
  }
  // Royal garden, fountain and colonnade.
  for (const x of [24, 38]) box(x, base + 1.2, 30, 2, 2, 16, m.leaf);
  for (const z of [23, 37]) box(31, base + 1.2, z, 15, 2, 2, m.leaf);
  b.cyl(31, base + 1, 30, 3.4, 3.7, 1.6, m.trim, 24);
  b.cyl(31, base + 1.9, 30, 3, 3, 0.1, m.water, 24);
  b.cyl(31, base + 3, 30, 0.4, 0.6, 3, m.trim, 10);
  b.sphere(31, base + 4.8, 30, 0.7, m.gold);
  for (const [x, z] of [
    [-6, 56],
    [6, 56],
    [-19, 22],
    [19, 22],
  ]) {
    b.beam([x, base + 2, z], [x, base + 5, z], 0.16, m.metal);
    const flame = new T.Mesh(new T.SphereGeometry(0.45, 8, 8), m.glass);
    flame.position.set(x, base + 5, z);
    flame.scale.y = 2;
    scene.add(flame);
    const light = new T.PointLight(0xff8935, 65, 19, 2);
    light.position.copy(flame.position);
    scene.add(light);
    torches.push({ flame, light });
  }
  colliders.push({ min: [-33, base - 3, -27], max: [34, base + 60, 22] });
  colliders.push({ min: [-17.5, base, -41], max: [17.5, base + 38, -18] });
  colliders.push({ min: [-36, base, -22], max: [45, base + 53, 17] });
  b.finish();
  createArchitecturalDetails(scene, m, base);
  return {
    flags,
    torches,
    colliders,
    update(t) {
      flags.forEach((u) => (u.value = t));
      torches.forEach(({ flame, light }, i) => {
        const flicker =
          1 + Math.sin(t * 13 + i) * 0.14 + Math.sin(t * 19) * 0.08;
        flame.scale.y = flicker * 2;
        light.intensity = 65 * flicker;
      });
    },
  };
}
