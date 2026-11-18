import * as T from "three";
import { Builder, archGeo } from "./Geometry.js";
import { seeded } from "./Materials.js";

// A longitudinal ridge and steep paired roof planes replace pyramidal placeholders.
export function gabledRoof(b, m, x, y, z, w, d, h, rot = 0) {
  const g = new T.BufferGeometry();
  const a=[-w/2,0,-d/2], c=[w/2,0,-d/2], ridge=[0,h,-d/2];
  const e=[-w/2,0,d/2], f=[w/2,0,d/2], peak=[0,h,d/2];
  // Duplicate vertices at the ridge and gables for hard masonry/slate edges.
  const faces=[[a,ridge,c],[e,f,peak],[a,e,peak],[a,peak,ridge],[c,ridge,peak],[c,peak,f]];
  const vertices=[], uvs=[];
  for(const [index,face] of faces.entries()) for(const [px,py,pz] of face) {
    vertices.push(px,py,pz);
    uvs.push(index<2 ? (px+w/2)/12 : (pz+d/2)/12, py/12);
  }
  g.setAttribute("position",new T.Float32BufferAttribute(vertices,3));
  g.setAttribute("uv",new T.Float32BufferAttribute(uvs,2));
  g.computeVertexNormals();
  b.add(g,m.roof,x,y,z,0,rot);
  const world = (px, py, pz) => [
    x + px * Math.cos(rot) + pz * Math.sin(rot),
    y + py,
    z - px * Math.sin(rot) + pz * Math.cos(rot),
  ];
  b.beam(world(0, h, -d / 2 - 0.5), world(0, h, d / 2 + 0.5), 0.19, m.metal);
  for (const zz of [-d / 2, d / 2])
    for (const side of [-1, 1])
      b.beam(world((side * w) / 2, 0, zz), world(0, h, zz), 0.19, m.trim);
  for (let zz = -d / 2 + 2; zz < d / 2; zz += 3) {
    const p = world(0, h + 0.6, zz);
    b.cyl(p[0], p[1], p[2], 0, 0.35, 1.3, m.gold, 6);
  }
  // Lead seams, independently modelled dormers, and stone ridge finials.
  for (const side of [-1, 1])
    for (let zz = -d / 2 + 4; zz < d / 2 - 2; zz += 7) {
      const p = world(side * w * 0.3, h * 0.37, zz);
      b.box(p[0], p[1], p[2], 2.5, 3.2, 2.7, m.dark, rot);
      b.add(
        archGeo(1.25, 2.3, 0.12, 0.22),
        m.trim,
        p[0] + side * Math.cos(rot) * 1.4,
        p[1] - 0.8,
        p[2] - side * Math.sin(rot) * 1.4,
        0,
        rot + side * Math.PI / 2,
      );
      const cap = new T.ConeGeometry(2.2, 3.5, 4);
      cap.rotateY(Math.PI / 4);
      b.add(cap, m.roof, p[0], p[1] + 3.2, p[2], 0, rot);
    }
}

export function createArchitecturalDetails(scene, m, base) {
  const b = new Builder(scene),
    rand = seeded(612);
  const local = (x, y, z, a, px, py, pz) => [
    x + Math.cos(a) * px + Math.sin(a) * pz,
    y + py,
    z - Math.sin(a) * px + Math.cos(a) * pz,
  ];
  function gargoyle(x, y, z, a) {
    const add = (g, mat, px, py, pz) => {
      const p = local(x, y, z, a, px, py, pz);
      b.add(g, mat, ...p, 0, a);
    };
    const body = new T.IcosahedronGeometry(1, 1);
    body.scale(0.55, 0.8, 1.2);
    add(body, m.dark, 0, 0, 0.4);
    const head = new T.IcosahedronGeometry(0.64, 1);
    head.scale(0.8, 0.9, 1.3);
    add(head, m.trim, 0, 0.75, 1.25);
    for (const s of [-1, 1]) {
      const horn = new T.ConeGeometry(0.18, 0.95, 6);
      add(horn, m.dark, s * 0.38, 1.5, 1.13);
      const shape = new T.Shape();
      shape.moveTo(s * 0.3, 0);
      shape.lineTo(s * 2.2, 1.2);
      shape.lineTo(s * 1.65, -0.25);
      shape.lineTo(s * 0.9, 0.1);
      shape.lineTo(s * 0.5, -0.4);
      shape.closePath();
      add(
        new T.ExtrudeGeometry(shape, { depth: 0.13, bevelEnabled: false }),
        m.dark,
        0,
        0.4,
        0.2,
      );
      const p = local(x, y, z, a, s * 0.45, -0.6, 1);
      b.box(...p, 0.28, 0.35, 1.1, m.trim, a);
    }
    const p = local(x, y, z, a, 0, 0.5, 1.9);
    b.box(...p, 0.55, 0.22, 0.65, m.dark, a);
  }
  // Projecting masonry has varied courses and avoids the actual lancet openings.
  for (let row = 0; row < 42; row++)
    for (let col = 0; col < 12; col++) {
      const x = -13.4 + col * 2.35 + (row % 2) * 1.12,
        y = base + 0.7 + row * 0.92;
      if (x > 14) continue;
      // Keep the new portal reveals, gallery and recessed rose free of facing stones.
      const portal = y < base + 17 && Math.abs(x) < 10.7;
      const gallery = y > base + 19 && y < base + 25.6 && Math.abs(x) < 9.5;
      if (portal || gallery || Math.hypot(x, y - (base + 33.5)) < 6.9) continue;
      b.box(
        x,
        y,
        18.61 + rand() * 0.1,
        2.2 - rand() * 0.16,
        0.78,
        0.52,
        rand() > 0.83 ? m.dark : m.stone,
      );
    }
  // Multiple orders of recessed portal mouldings, archivolts, jamb columns and voussoirs.
  for (let i = 0; i < 4; i++)
    b.add(
      archGeo(11.8 + i * 1.1, 16.8 + i * 0.75, 0.32, 0.28),
      i % 2 ? m.dark : m.trim,
      0,
      base - 0.4,
      52.1 - i * 0.23,
    );
  for (const s of [-1, 1])
    for (let i = 0; i < 3; i++) {
      b.cyl(
        s * (6.1 + i * 0.5),
        base + 4.8,
        52 - i * 0.3,
        0.22,
        0.3,
        10,
        m.trim,
        10,
      );
      b.cyl(
        s * (6.1 + i * 0.5),
        base + 10,
        52 - i * 0.3,
        0.55,
        0.35,
        0.7,
        m.trim,
        10,
      );
    }
  for (let i = 0; i < 17; i++) {
    const a = (i / 16) * Math.PI,
      p = [Math.cos(a) * 6.8, base + 9 + Math.sin(a) * 8.5, 52.2];
    b.box(...p, 0.72, 1.1, 0.7, m.trim, 0);
  }
  // A tracery screen crowns the nave, rather than another flat wall band.
  for (let x = -11; x <= 11; x += 2.2) {
    b.add(archGeo(1.8, 3.1, 0.32, 0.23), m.trim, x, base + 42, 14.3);
    b.cyl(x, base + 46, 14.3, 0, 0.35, 1.6, m.trim, 6);
  }
  for (const s of [-1, 1])
    for (const z of [-15.6, 0, 15.6])
      gargoyle(s * 35, base + 23.6, z, (s * Math.PI) / 2);
  for (let i = 0; i < 30; i++) {
    const a = (i / 30) * Math.PI * 2,
      x = Math.sin(a) * 56,
      z = Math.cos(a) * 56;
    b.add(
      new T.ConeGeometry(0.85, 1.1, 4),
      m.trim,
      x,
      base + 5.3,
      z,
      0,
      a + Math.PI / 4,
    );
    // Machicolations have projecting stone brackets under the parapet.
    b.box(x, base + 2.6, z, 1.1, 2.6, 2.2, m.trim, a);
  }
  // Asymmetric polygonal apse and a lower chapter house create an inhabited rear silhouette.
  b.cyl(0, base + 13, -29, 9, 10, 26, m.stone, 7);
  b.cyl(0, base + 31, -29, 0, 11, 12, m.roof, 7);
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * Math.PI * 2;
    const x = Math.sin(a) * 10,
      z = -29 + Math.cos(a) * 10;
    b.box(x, base + 11, z, 1, 24, 1.7, m.trim, a);
    b.cyl(x, base + 25, z, 0, 0.8, 4, m.trim, 6);
  }
  // Royal coat of arms above the gate, with stone shield, sword and flanking carved reliefs.
  const shield = new T.Shape();
  shield.moveTo(-1.8, 2);
  shield.lineTo(1.8, 2);
  shield.lineTo(1.6, -0.5);
  shield.lineTo(0, -2);
  shield.lineTo(-1.6, -0.5);
  shield.closePath();
  b.add(
    new T.ExtrudeGeometry(shield, {
      depth: 0.35,
      bevelEnabled: true,
      bevelSize: 0.12,
      bevelThickness: 0.1,
      bevelSegments: 2,
    }),
    m.dark,
    0,
    base + 18,
    53,
  );
  b.box(0, base + 18, 53.5, 0.18, 2.7, 0.15, m.gold);
  b.box(0, base + 18.5, 53.5, 1.6, 0.15, 0.15, m.gold);
  gargoyle(-7, base + 19, 52, 0);
  gargoyle(7, base + 19, 52, 0);
  b.finish();
}
