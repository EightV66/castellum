import * as T from "three";
export function createAmbientLife(scene, m) {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 128;
  const c = canvas.getContext("2d");
  for (let i = 0; i < 38; i++) {
    const x = 25 + Math.random() * 206,
      y = 36 + Math.random() * 56,
      r = 15 + Math.random() * 35,
      g = c.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, "rgba(144,171,184,.035)");
    g.addColorStop(1, "rgba(144,171,184,0)");
    c.fillStyle = g;
    c.fillRect(x - r, y - r, r * 2, r * 2);
  }
  const texture = new T.CanvasTexture(canvas),
    fog = [];
  for (let i = 0; i < 12; i++) {
    const sp = new T.Sprite(
      new T.SpriteMaterial({
        map: texture,
        opacity: i < 6 ? 0.6 : 0.32,
        depthWrite: false,
        transparent: true,
      }),
    );
    sp.position.set(
      -260 + i * 49,
      i < 6 ? 20 : 80 + (i % 3) * 15,
      -95 + (i % 3) * 70,
    );
    sp.scale.set(180, 35, 1);
    scene.add(sp);
    fog.push({ sprite: sp, x: sp.position.x });
  }
  const birds = [];
  for (let i = 0; i < 13; i++) {
    const g = new T.BufferGeometry();
    g.setAttribute(
      "position",
      new T.Float32BufferAttribute(
        [-1.5, 0, 0, 0, 0, 0.3, 0, 0.25, 0, 0, 0.25, 0, 0, 0, 0.3, 1.5, 0, 0],
        3,
      ),
    );
    const mesh = new T.Mesh(
      g,
      new T.MeshBasicMaterial({ color: 0x171f26, side: T.DoubleSide }),
    );
    scene.add(mesh);
    birds.push(mesh);
  }
  return {
    update(t) {
      fog.forEach((o, i) => {
        o.sprite.position.x = o.x + Math.sin(t * 0.025 + i) * 15;
        o.sprite.material.rotation = Math.sin(t * 0.02 + i) * 0.02;
      });
      birds.forEach((bird, i) => {
        const a = t * 0.045 + i * 0.48,
          r = 80 + (i % 4) * 16;
        bird.position.set(
          Math.sin(a) * r,
          100 + Math.sin(a * 2 + i) * 17,
          -10 + Math.cos(a) * r,
        );
        bird.rotation.y = -a;
        bird.rotation.z = Math.sin(t * 3 + i) * 0.13;
        bird.scale.y = 0.4 + Math.sin(t * 5 + i) * 0.35;
      });
    },
  };
}
