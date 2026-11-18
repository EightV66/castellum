import * as T from "three";
import { SUMMITS } from "./Highlands.js";

// The tallest spire and the last vertex of each discharge share this anchor.
export function highCourtFinial() {
  const peak = SUMMITS[1],
    scale = 1.32;
  return new T.Vector3(
    peak.x - 4 * scale,
    peak.h + 55.4 * scale,
    peak.z - 6 * scale,
  );
}

export function createSummitStorm(scene) {
  const summit = highCourtFinial();
  const light = new T.PointLight(0x9bcfff, 0, 220, 2);
  light.position.copy(summit).y += 10;
  const segments = 13,
    forks = [3, 7, 10],
    floats = (segments + forks.length * 2) * 18;
  const geometry = new T.BufferGeometry();
  const positions = new T.Float32BufferAttribute(new Float32Array(floats), 3);
  positions.setUsage(T.DynamicDrawUsage);
  geometry.setAttribute("position", positions);
  const bolt = new T.Mesh(
    geometry,
    new T.MeshBasicMaterial({
      color: new T.Color(2.2, 3.5, 5.1),
      transparent: true,
      opacity: 0,
      side: T.DoubleSide,
      depthWrite: false,
      toneMapped: false,
      fog: false,
    }),
  );
  bolt.name = "summit-lightning";
  bolt.visible = false;
  // Local geometry also keeps the anchor independent of camera and weather.
  bolt.position.copy(summit);
  bolt.frustumCulled = false;
  scene.add(light, bolt);
  let count = 0,
    age = Infinity,
    amplitude = 0,
    fresh = false;
  let offset = 0;
  function branch(from, to, radius) {
    for (const [p, side] of [
      [from, -1],
      [from, 1],
      [to, 1],
      [from, -1],
      [to, 1],
      [to, -1],
    ]) {
      positions.setXYZ(offset++, p.x + side * radius, p.y, p.z);
    }
  }
  return {
    get count() {
      return count;
    },
    get active() {
      return bolt.visible;
    },
    strike(strength = 1) {
      age = 0;
      fresh = true;
      amplitude = strength;
      count++;
      offset = 0;
      const a = new T.Vector3(),
        b = new T.Vector3();
      for (let i = 0; i < segments; i++) {
        b.set(
          a.x + (Math.random() - 0.54) * 15,
          a.y + 7 + Math.random() * 4,
          a.z + (Math.random() - 0.5) * 8,
        );
        branch(a, b, 0.36 + 0.13 * strength);
        if (forks.includes(i)) {
          const dir = i === 7 ? -1 : 1;
          const fork = b.clone().add(new T.Vector3(dir * 10, -5, 3));
          branch(b, fork, 0.23);
          branch(fork, fork.clone().add(new T.Vector3(dir * 8, -10, 2)), 0.13);
        }
        a.copy(b);
      }
      positions.needsUpdate = true;
    },
    update(dt) {
      // An arriving strike is drawn once even if the previous render took
      // longer than the complete electrical discharge.
      if (!fresh) age += dt;
      fresh = false;
      const glow = amplitude * Math.exp(-age * 4.6);
      bolt.visible = glow > 0.012;
      bolt.material.opacity = Math.min(1, glow * 2.1);
      light.intensity = glow * 64000;
      return glow;
    },
  };
}
