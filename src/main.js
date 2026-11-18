import * as T from "three";
import "./styles/main.css";
import { SceneManager } from "./scene/SceneManager.js";
import { CameraController, LOCATIONS } from "./camera/CameraController.js";
import { screenExtent } from "./camera/Framing.js";
import { Interface } from "./ui/Interface.js";
import { AudioManager } from "./audio/AudioManager.js";
const canvas = document.getElementById("world");
let world,
  camera,
  ui,
  raf = 0,
  last = 0,
  elapsed = 0,
  frames = 0,
  fps = 0,
  frameTime = 0,
  disposed = false;
const audio = new AudioManager();
function fatal(error) {
  console.error(error);
  document
    .getElementById("app")
    .insertAdjacentHTML(
      "beforeend",
      `<div id="fatal"><h1>王国暂时隐入迷雾</h1><p>无法启动 WebGL 2 场景。请使用开启硬件加速的新版 Edge、Chrome 或 Firefox。若页面曾正常运行，请重新载入。</p><button onclick="location.reload()">重新进入</button><p id="error-detail"></p></div>`,
    );
  document.getElementById("error-detail").textContent = error.message;
}
function selectLocation(id, instant = false) {
  const l = LOCATIONS.find((v) => v.id === id);
  if (!l) return;
  camera.go(l, instant);
  ui.select(l);
  if (location.hash !== "#" + id) history.replaceState(null, "", "#" + id);
  if (id === "bell") audio.bell();
}
ui = new Interface({
  location: selectLocation,
  time: (k) => world.atmosphere.setTime(k),
  weather: (k) => world.atmosphere.setWeather(k),
  mode: (m) => {
    camera.setMode(m);
    if (m === "cinematic") {
      ui.select(LOCATIONS[0]);
      history.replaceState(null, "", location.pathname + location.search);
    }
  },
  sound: async () => {
    try {
      ui.sound(await audio.toggle());
    } catch (e) {
      ui.toast(e.message);
    }
  },
  quality: (q) => {
    world.setQuality(q);
    document.getElementById("ao").checked = world.ao.enabled;
    ui.toast(
      {
        low: "流畅画质：降低分辨率与后期开销",
        high: "高画质：山体纹理与动态阴影",
        ultra: "极致画质：开启 SSAO 与高精度阴影",
      }[q],
    );
  },
  bloom: (v) => {
    world.bloom.strength = v;
    world.bloom.enabled = v > 0;
  },
  ao: (v) => (world.ao.enabled = v),
  focus: (v) => (world.grade.uniforms.focus.value = v ? 1 : 0),
  volume: (k, v) => audio.setVolume(k, v),
  bell: async () => {
    if (!audio.enabled) ui.sound(await audio.toggle());
    audio.bell();
  },
});
try {
  world = new SceneManager(canvas);
  await world.build((n, s) => ui.progress(n, s));
  camera = new CameraController(
    world.camera,
    canvas,
    world.terrain,
    world.castle.colliders,
    (m) => ui.mode(m),
  );
  world.setQuality(
    matchMedia("(pointer: coarse)").matches && navigator.hardwareConcurrency < 6
      ? "low"
      : "high",
  );
  document.getElementById("quality").value = world.quality;
  if (matchMedia("(prefers-reduced-motion: reduce)").matches)
    camera.setMode("explore");
  const params = new URLSearchParams(location.search);
  if (params.has("time")) ui.setTime(params.get("time"));
  if (params.has("weather")) ui.setWeather(params.get("weather"));
  world.atmosphere.update(0, 0, undefined, true);
  if (params.get("ui") === "0") ui.toggleUI(true);
  const openHash = () => {
    if (location.hash) selectLocation(location.hash.slice(1), true);
  };
  openHash();
  window.addEventListener("hashchange", openHash);
  const raycaster = new T.Raycaster(),
    mouse = new T.Vector2(),
    proxyGeo = new T.SphereGeometry(1, 8, 6),
    proxyMat = new T.MeshBasicMaterial(),
    proxies = LOCATIONS.map((l, i) => {
      const mesh = new T.Mesh(proxyGeo, proxyMat);
      mesh.position.set(...(l.id === "wing" ? [-358, 431, -370] : l.point));
      mesh.scale.setScalar([24, 11, 10, 11, 9, 30, 58, 17, 42, 10, 37, 18][i]);
      mesh.userData.location = l;
      mesh.updateMatrixWorld();
      return mesh;
    });
  let down = { x: 0, y: 0 },
    hoverAt = 0;
  const pick = (e) => {
    const rect = canvas.getBoundingClientRect();
    mouse.set(
      ((e.clientX - rect.left) / rect.width) * 2 - 1,
      (-(e.clientY - rect.top) / rect.height) * 2 + 1,
    );
    raycaster.setFromCamera(mouse, world.camera);
    const prox = raycaster.intersectObjects(proxies, false)[0];
    const ridge = raycaster.intersectObject(world.terrain.wing.mesh, false)[0];
    if (ridge && (!prox || ridge.distance < prox.distance))
      return LOCATIONS.find((l) => l.id === "wing");
    return prox?.object.userData.location;
  };
  const onDown = (e) => (down = { x: e.clientX, y: e.clientY });
  const onUp = (e) => {
    if (
      e.button !== 0 ||
      Math.hypot(e.clientX - down.x, e.clientY - down.y) > 5
    )
      return;
    const hit = pick(e);
    if (hit) selectLocation(hit.id);
  };
  const tooltip = document.getElementById("tooltip");
  const onMove = (e) => {
    if (performance.now() - hoverAt < 90) return;
    hoverAt = performance.now();
    const l = pick(e);
    canvas.style.cursor = l ? "pointer" : camera.auto ? "default" : "grab";
    tooltip.style.display = l && !ui.hidden ? "block" : "none";
    if (l) {
      tooltip.textContent = l.name + " · 点击探索";
      tooltip.style.left = e.clientX + 18 + "px";
      tooltip.style.top = e.clientY + 18 + "px";
    }
  };
  const leave = () => (tooltip.style.display = "none");
  canvas.addEventListener("pointerdown", onDown);
  canvas.addEventListener("pointerup", onUp);
  canvas.addEventListener("pointermove", onMove);
  canvas.addEventListener("pointerleave", leave);
  const resize = () => {
    world.resize();
    if (camera.framedLocation?.id === "wing")
      camera.go(camera.framedLocation, true);
  };
  const resumeClock = () => {
    last = performance.now();
  };
  document.addEventListener("visibilitychange", resumeClock);
  window.addEventListener("resize", resize);
  const onLost = (e) => {
    e.preventDefault();
    cancelAnimationFrame(raf);
    ui.toast("图形设备连接中断，请重新载入页面。");
  };
  canvas.addEventListener("webglcontextlost", onLost);
  let frameKey = "";
  function animate(now) {
    if (disposed) return;
    raf = requestAnimationFrame(animate);
    if (document.hidden) {
      last = now;
      return;
    }
    const rawDt = (now - (last || now)) / 1000;
    const dt = Math.min(rawDt, 2.7);
    last = now;
    elapsed += dt;
    // Collision sweeps keep their short integration steps while a low frame
    // rate still advances a 2.6-second camera flight in real time.
    const steps =
      camera.auto || camera.flight ? Math.max(1, Math.ceil(dt / 0.09)) : 1;
    for (let i = 0; i < steps; i++) camera.update(dt / steps);
    world.update(elapsed, dt, () => audio.thunder());
    audio.update(elapsed, world.atmosphere.pmat.uniforms.rain.value);
    world.render();
    if (window.__castellum) {
      canvas.dataset.state = JSON.stringify(window.__castellum.snapshot());
      canvas.dataset.settled =
        !camera.flight && !camera.intro && !camera.auto
          ? ui.selected.id
          : "moving";
      canvas.dataset.striking = String(world.atmosphere.strikeVisible);
      if (
        canvas.dataset.settled === "wing" &&
        camera.framedLocation?.id === "wing"
      ) {
        const key = innerWidth + "x" + innerHeight;
        if (key !== frameKey) {
          frameKey = key;
          const wing = screenExtent(
            world.terrain.wing.mesh,
            world.camera,
            innerWidth,
            innerHeight,
          );
          const court = screenExtent(
            world.scene.getObjectByName("thunder-court"),
            world.camera,
            innerWidth,
            innerHeight,
          );
          canvas.dataset.framing = JSON.stringify({
            viewport: key,
            wing,
            court,
            ratio: wing.width / court.width,
          });
        }
      } else {
        frameKey = "";
        delete canvas.dataset.framing;
      }
    }
    frames++;
    frameTime += rawDt;
    if (frameTime > 1) {
      fps = Math.round(frames / frameTime);
      frames = 0;
      frameTime = 0;
      const out = document.getElementById("scene-stats");
      if (out) out.textContent = fps + " FPS · " + world.quality.toUpperCase();
    }
  }
  world.renderer.compile(world.scene, world.camera);
  animate(performance.now());
  ui.ready();
  if (new URLSearchParams(location.search).has("test"))
    window.__castellum = {
      world,
      camera,
      ui,
      audio,
      locations: LOCATIONS,
      select: selectLocation,
      snapshot: () => ({
        ready: true,
        location: ui.selected.id,
        mode: camera.mode,
        weather: world.atmosphere.weather,
        time: world.atmosphere.time,
        quality: world.quality,
        audio: audio.enabled,
        fps,
        drawCalls: world.renderer.info.render.calls,
        triangles: world.renderer.info.render.triangles,
        position: world.camera.position.toArray(),
        blocked: camera.blocked(world.camera.position),
        hidden: ui.hidden,
        rain: world.atmosphere.pmat.uniforms.rain.value,
        snow: world.atmosphere.pmat.uniforms.snow.value,
        summitStrikes: world.atmosphere.strikes,
      }),
      project: (id) => {
        const l = LOCATIONS.find((x) => x.id === id),
          p = new T.Vector3(...l.point).project(world.camera);
        return {
          x: ((p.x + 1) * innerWidth) / 2,
          y: ((1 - p.y) * innerHeight) / 2,
        };
      },
    };
  const dispose = () => {
    if (disposed) return;
    disposed = true;
    cancelAnimationFrame(raf);
    window.removeEventListener("resize", resize);
    document.removeEventListener("visibilitychange", resumeClock);
    window.removeEventListener("hashchange", openHash);
    canvas.removeEventListener("pointerdown", onDown);
    canvas.removeEventListener("pointerup", onUp);
    canvas.removeEventListener("pointermove", onMove);
    canvas.removeEventListener("pointerleave", leave);
    canvas.removeEventListener("webglcontextlost", onLost);
    camera.dispose();
    ui.dispose();
    audio.dispose();
    world.dispose();
    proxyGeo.dispose();
    proxyMat.dispose();
  };
  window.addEventListener("pagehide", dispose, { once: true });
  if (import.meta.hot) import.meta.hot.dispose(dispose);
} catch (e) {
  fatal(e);
}
