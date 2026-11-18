import { createHighlands } from "../src/scene/Highlands.js";
import { createWingMountain } from "../src/scene/WingRidge.js";
import { createPassOutcrops } from "../src/scene/PassOutcrops.js";
import {
  highCourtFinial,
  createSummitStorm,
} from "../src/scene/SummitStorm.js";
import {
  presetPose,
  screenExtent,
  verticalFov,
} from "../src/camera/Framing.js";
import test from "node:test";
import assert from "node:assert/strict";
import * as T from "three";
import { createCastle } from "../src/scene/Castle.js";
import { createTerrain } from "../src/scene/Terrain.js";
import { createWorldDepth } from "../src/scene/WorldDepth.js";
import { createWinterCoast } from "../src/scene/WinterCoast.js";
import {
  CameraController,
  LOCATIONS,
  alpineApproach,
} from "../src/camera/CameraController.js";
const scene = new T.Scene();
const mats = {};
for (const key of [
  "stone",
  "trim",
  "dark",
  "roof",
  "rock",
  "ground",
  "wood",
  "metal",
  "gold",
  "glass",
  "black",
  "leaf",
  "snow",
  "water",
])
  mats[key] = new T.MeshStandardMaterial();
const valley = createHighlands(scene, mats),
  distantHeight = createWorldDepth(scene, mats);
const ground = (x, z) =>
  Math.max(valley.userData.heightAt(x, z), distantHeight(x, z));
const terrain = createTerrain(scene, mats, ground),
  castle = createCastle(scene, mats);
castle.colliders.push(...createWinterCoast(scene, mats, terrain));
terrain.heightAt = ground;
terrain.wing = createWingMountain(scene);
terrain.pass = createPassOutcrops(scene);
scene.updateMatrixWorld(true);
const controller = Object.create(CameraController.prototype);
controller.terrain = terrain;
controller.boxes = castle.colliders.map(
  (c) =>
    new T.Box3(
      new T.Vector3(...c.min).addScalar(-2),
      new T.Vector3(...c.max).addScalar(2),
    ),
);
controller.tmp = new T.Vector3();
test("all twelve region destinations are outside terrain and architecture", () => {
  assert.equal(LOCATIONS.length, 12);
  assert.equal(new Set(LOCATIONS.map((l) => l.id)).size, 12);
  for (const l of LOCATIONS)
    assert.equal(controller.blocked(new T.Vector3(...l.view)), false, l.id);
});
test("swept collision rejects tunnelling through the keep and valley floor", () => {
  assert.equal(
    controller.segmentSafe(
      new T.Vector3(-100, 80, 0),
      new T.Vector3(100, 80, 0),
    ),
    false,
  );
  assert.equal(controller.blocked(new T.Vector3(0, 30, 0)), true);
  assert.equal(controller.blocked(new T.Vector3(200, 0, 200)), true);
  assert.equal(
    controller.segmentSafe(
      new T.Vector3(170, 140, 220),
      new T.Vector3(150, 120, 210),
    ),
    true,
  );
});
test("all camera transition paths can be traversed without penetrating colliders", () => {
  for (const a of LOCATIONS)
    for (const b of LOCATIONS) {
      let prev = new T.Vector3(...a.view);
      const lift = controller.flightLift(prev, new T.Vector3(...b.view));
      for (let i = 1; i <= 150; i++) {
        const p = i / 150,
          e = p * p * (3 - 2 * p),
          next = new T.Vector3().lerpVectors(
            new T.Vector3(...a.view),
            new T.Vector3(...b.view),
            e,
          );
        next.y += Math.sin(p * Math.PI) * lift;
        assert.equal(
          controller.segmentSafe(prev, next),
          true,
          `${a.id} -> ${b.id} at ${p}`,
        );
        prev = next;
      }
    }
});
test("all generated positions are finite and all indexed triangles reference real vertices", () => {
  scene.traverse((o) => {
    if (!o.geometry) return;
    const g = o.geometry,
      p = g.attributes.position;
    for (const v of p.array) assert.ok(Number.isFinite(v));
    if (g.index) for (const i of g.index.array) assert.ok(i < p.count);
  });
});
test("cliff faces point outward so visible coast does not disappear", () => {
  const mesh = scene.children.find((o) => o.isMesh && o.material === mats.rock);
  const p = mesh.geometry.attributes.position,
    n = mesh.geometry.attributes.normal;
  let good = 0;
  for (let i = 0; i < p.count; i++)
    if (p.getX(i) * n.getX(i) + p.getZ(i) * n.getZ(i) > 0) good++;
  assert.ok(good / p.count > 0.95);
});
test("repeated foliage uses actual instancing with a distance LOD", () => {
  assert.ok(terrain.forest.isLOD);
  assert.equal(terrain.forest.levels.length, 2);
  assert.ok(terrain.forest.levels[0].object.isInstancedMesh);
  assert.ok(
    terrain.forest.levels[1].object.count <
      terrain.forest.levels[0].object.count,
  );
});
test("each region has authored world lore and a distinct camera target", () => {
  for (const l of LOCATIONS) {
    assert.ok(l.story.length > 50);
    assert.equal(l.point.length, 3);
    assert.notDeepEqual(l.point, l.view);
  }
});
test("curtain walls stop lateral entry and leave the sky traversable", () => {
  assert.equal(controller.blocked(new T.Vector3(54, 100, 0)), true);
  assert.equal(
    controller.segmentSafe(
      new T.Vector3(80, 100, 0),
      new T.Vector3(40, 100, 0),
    ),
    false,
  );
  assert.equal(
    controller.segmentSafe(
      new T.Vector3(-150, 440, 0),
      new T.Vector3(150, 440, 0),
    ),
    true,
  );
});
test("light passes between the stone ribs of both west spires", () => {
  const ray = new T.Raycaster(new T.Vector3(), new T.Vector3(0, 0, -1), 0, 20);
  const stonework = scene.children.filter(
    (mesh) =>
      mesh.material === mats.stone ||
      mesh.material === mats.trim ||
      mesh.material === mats.roof,
  );
  for (const x of [-15, 15]) {
    let clear = 0,
      stone = 0;
    for (const y of [160.2, 163.1, 166.3])
      for (let dx = -3.6; dx <= 3.7; dx += 0.6) {
        ray.ray.origin.set(x + dx, y, 31);
        if (ray.intersectObjects(stonework, false).length) stone++;
        else clear++;
      }
    assert.ok(
      clear > 6 && stone > 3,
      `tower ${x}: ${clear} clear, ${stone} stone`,
    );
    assert.equal(controller.blocked(new T.Vector3(x, 190, 21)), true);
  }
});
test("the complete glacial approach clears the ice headlands", () => {
  const path = alpineApproach();
  let last = path.getPoint(0);
  for (let i = 1; i <= 180; i++) {
    const next = path.getPoint(i / 180);
    assert.ok(controller.segmentSafe(last, next));
    last = next;
  }
});
test("the entire wing and high court share a frame on wide, square and portrait screens", () => {
  const l = LOCATIONS.find((l) => l.id === "wing");
  for (const [w, h] of [
    [1440, 760],
    [934, 941],
    [390, 844],
  ]) {
    const cam = new T.PerspectiveCamera(verticalFov(w / h), w / h, 0.5, 4000);
    const { eye, target } = presetPose(l, cam);
    cam.position.copy(eye);
    cam.lookAt(target);
    cam.updateMatrixWorld();
    assert.equal(controller.blocked(eye), false);
    const wing = screenExtent(terrain.wing.mesh, cam, w, h),
      court = screenExtent(scene.getObjectByName("thunder-court"), cam, w, h);
    for (const extent of [wing, court]) {
      assert.ok(
        extent.left > 0 &&
          extent.right < w &&
          extent.top > 0 &&
          extent.bottom < h,
      );
    }
    assert.ok(wing.width / court.width > 7);
    assert.ok(wing.width > w * 0.4 && court.width > 20);
  }
});
test("the wing is supported by the massif and its overhanging tip has navigable air beneath", () => {
  const mesh = terrain.wing.mesh,
    box = mesh.geometry.boundingBox;
  assert.ok(box.max.x - box.min.x > 630 && box.max.y - box.min.y > 515);
  const p = mesh.geometry.attributes.position,
    v = new T.Vector3();
  let buried = 0,
    high = 0;
  for (let i = 0; i < p.count; i += 13) {
    v.fromBufferAttribute(p, i);
    if (v.x > -220 && v.y < ground(v.x, v.z)) buried++;
    if (v.x < -595 && v.y - ground(v.x, v.z) > 180) high++;
  }
  assert.ok(buried > 10 && high > 20);
  const tip = new T.Vector3(-781, 757, -467);
  assert.ok(terrain.wing.contains(tip));
  assert.equal(
    controller.blocked(tip.clone().add(new T.Vector3(0, -85, 0))),
    false,
  );
});
test("both switchback pavements clear the triangulated terrain at center and shoulders", () => {
  const roads = scene.children.filter((m) => m.name === "pilgrim-road");
  assert.equal(roads.length, 2);
  for (const road of roads) {
    const pos = road.geometry.attributes.position;
    for (let i = 0; i < pos.count - 2; i += 2) {
      for (const across of [0.05, 0.5, 0.95]) {
        const current = new T.Vector3()
          .fromBufferAttribute(pos, i)
          .lerp(new T.Vector3().fromBufferAttribute(pos, i + 1), across);
        const next = new T.Vector3()
          .fromBufferAttribute(pos, i + 2)
          .lerp(new T.Vector3().fromBufferAttribute(pos, i + 3), across);
        for (const t of [0, 0.5, 1]) {
          const p = current.clone().lerp(next, t);
          assert.ok(
            p.y - ground(p.x, p.z) > 0.04,
            `buried pavement at ${p.toArray()}`,
          );
        }
      }
    }
  }
});
test("switchbacks keep distinct bevels and turning platforms on both approaches", () => {
  for (const road of scene.children.filter((m) => m.name === "pilgrim-road")) {
    const p = road.geometry.attributes.position;
    let prows = 0;
    for (let i = 0; i < p.count; i += 2)
      if (
        Math.hypot(p.getX(i) - p.getX(i + 1), p.getZ(i) - p.getZ(i + 1)) > 8.7
      )
        prows++;
    assert.ok(prows >= 2);
  }
});
test("summit lightning connects to the highest modeled tower and fades after discharge", () => {
  const storm = createSummitStorm(scene),
    point = highCourtFinial();
  const box = new T.Box3().setFromObject(
    scene.getObjectByName("thunder-court"),
    true,
  );
  assert.ok(Math.abs(box.max.y - point.y) < 0.01);
  storm.strike();
  storm.update(1.4);
  const bolt = scene.getObjectByName("summit-lightning");
  assert.deepEqual(bolt.position.toArray(), point.toArray());
  assert.ok(storm.active && storm.count === 1);
  const pos = bolt.geometry.attributes.position;
  assert.equal(pos.getY(0), 0);
  assert.ok(pos.getY(pos.count - 1) > 95);
  storm.update(3);
  assert.equal(storm.active, false);
});
