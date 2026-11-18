import { createWorldDepth } from "./WorldDepth.js";
import { addValleyMist } from "./SeaMist.js";
import { createHighlands } from "./Highlands.js";
import { verticalFov } from "../camera/Framing.js";
import { createWingMountain } from "./WingRidge.js";
import { createPassOutcrops } from "./PassOutcrops.js";
import { glacialRock } from "./GlacialRock.js";
import { createWinterCoast, frostSurface } from "./WinterCoast.js";
import { createAmbientLife } from "./AmbientLife.js";
import * as T from "three";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { SSAOPass } from "three/addons/postprocessing/SSAOPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import { ShaderPass } from "three/addons/postprocessing/ShaderPass.js";
import { FXAAShader } from "three/addons/shaders/FXAAShader.js";
import { createMaterials } from "./Materials.js";
import { createCastle } from "./Castle.js";
import { createTerrain } from "./Terrain.js";
import { createWaterfalls } from "./Waterfall.js";
import { createAtmosphere } from "./Atmosphere.js";
export class SceneManager {
  constructor(canvas) {
    this.scene = new T.Scene();
    this.camera = new T.PerspectiveCamera(
      43,
      innerWidth / innerHeight,
      0.5,
      4000,
    );
    this.renderer = new T.WebGLRenderer({
      canvas,
      antialias: false,
      powerPreference: "high-performance",
    });
    this.renderer.info.autoReset = false;
    this.renderer.outputColorSpace = T.SRGBColorSpace;
    this.renderer.toneMapping = T.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.24;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = T.PCFSoftShadowMap;
    this.renderer.shadowMap.autoUpdate = false;
    this.lastShadowUpdate = -Infinity;
    this.materials = createMaterials();
    for (const [key, slope, cover] of [
      ["roof", 0.51, 0.83],
      ["stone", 0.56, 0.91],
      ["dark", 0.56, 0.78],
      ["trim", 0.57, 0.97],
      ["rock", 0.48, 0.98],
      ["ground", 0.39, 0.89],
    ])
      frostSurface(this.materials[key], slope, cover);
    this.quality = "high";
    this.disposed = false;
  }
  async build(progress) {
    const tick = () => new Promise((r) => setTimeout(r, 20));
    progress(12, "雕刻古老的岩层");
    const rangesAt = createWorldDepth(this.scene, this.materials);
    const valley = createHighlands(this.scene, this.materials);
    const ground = (x, z) =>
      Math.max(valley.userData.heightAt(x, z), rangesAt(x, z));
    this.terrain = createTerrain(this.scene, this.materials, ground);
    this.terrain.heightAt = ground;
    this.terrain.wing = createWingMountain(this.scene);
    this.terrain.pass = createPassOutcrops(this.scene);
    const extraColliders = createWinterCoast(
      this.scene,
      this.materials,
      this.terrain,
    );
    await tick();
    progress(36, "筑起王国的九座尖塔");
    this.castle = createCastle(this.scene, this.materials);
    this.castle.colliders.push(...extraColliders);
    await tick();
    progress(61, "铺设山脊古道与冰川");
    this.falls = createWaterfalls(this.scene);
    await tick();
    progress(77, "点亮风暴中的灯火");
    const loader = new T.TextureLoader();
    const [skyAtlas, slate] = await Promise.all(
      ["winter-sky.jpg", "glacial-slate.jpg"].map((name) =>
        loader.loadAsync(import.meta.env.BASE_URL + name),
      ),
    );
    slate.colorSpace = T.SRGBColorSpace;
    slate.wrapS = slate.wrapT = T.MirroredRepeatWrapping;
    slate.anisotropy = 4;
    this.slate = slate;
    this.terrain.wing.setSlate(slate);
    this.terrain.pass.material.bumpMap = slate;
    this.terrain.pass.material.bumpScale = 0.85;
    this.terrain.pass.material.map = slate;
    this.terrain.pass.material.onBeforeCompile = (shader) => {
      shader.fragmentShader = shader.fragmentShader.replace(
        "#include <map_fragment>",
        "diffuseColor.rgb*=.59+1.78*sqrt(texture2D(map,vMapUv).rgb);",
      );
    };
    valley.userData.rockScale = 0.02;
    valley.material.userData.highAltitudeHaze = 0.77;
    const treated = new Set();
    this.scene.traverse((mesh) => {
      const scale =
        mesh.userData.rockScale ||
        (mesh.material === this.materials.rock ? 0.059 : 0);
      if (scale && !treated.has(mesh.material)) {
        glacialRock(mesh.material, slate, scale);
        treated.add(mesh.material);
      }
    });
    skyAtlas.colorSpace = T.SRGBColorSpace;
    skyAtlas.wrapS = T.RepeatWrapping;
    this.atmosphere = createAtmosphere(this.scene, this.materials, skyAtlas);
    this.life = createAmbientLife(this.scene, this.materials);
    addValleyMist(this.scene);
    this.setupPost();
    this.resize();
    await tick();
    progress(90, "等待最后一缕暮光");
  }
  setupPost() {
    this.composer = new EffectComposer(this.renderer);
    this.composer.addPass(new RenderPass(this.scene, this.camera));
    this.ao = new SSAOPass(this.scene, this.camera, innerWidth, innerHeight);
    this.ao.kernelRadius = 3;
    this.ao.minDistance = 0.001;
    this.ao.maxDistance = 0.07;
    this.composer.addPass(this.ao);
    this.bloom = new UnrealBloomPass(
      new T.Vector2(innerWidth, innerHeight),
      0.26,
      0.5,
      1.05,
    );
    this.composer.addPass(this.bloom);
    this.grade = new ShaderPass({
      uniforms: {
        tDiffuse: { value: null },
        vignette: { value: 0.22 },
        focus: { value: 0 },
        resolution: { value: new T.Vector2(innerWidth, innerHeight) },
      },
      vertexShader:
        "varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}",
      fragmentShader:
        "uniform sampler2D tDiffuse;uniform float vignette,focus;uniform vec2 resolution;varying vec2 vUv;void main(){vec3 col=texture2D(tDiffuse,vUv).rgb;float blur=focus*smoothstep(.24,.53,abs(vUv.y-.5));vec2 px=1./resolution;vec3 soft=(texture2D(tDiffuse,vUv+px*2.).rgb+texture2D(tDiffuse,vUv-px*2.).rgb+texture2D(tDiffuse,vUv+vec2(px.x,-px.y)*2.).rgb+texture2D(tDiffuse,vUv+vec2(-px.x,px.y)*2.).rgb)*.25;col=mix(col,soft,blur*.65);col*=vec3(.97,1.,1.025);float v=1.-vignette*pow(length((vUv-.5)*1.35),2.);gl_FragColor=vec4(col*v,1.);}",
    });
    this.composer.addPass(this.grade);
    this.composer.addPass(new OutputPass());
    this.fxaa = new ShaderPass(FXAAShader);
    this.composer.addPass(this.fxaa);
  }
  setQuality(q) {
    this.quality = q;
    const low = q === "low";
    this.ao.enabled = q === "ultra";
    this.bloom.enabled = !low;
    this.renderer.shadowMap.enabled = !low;
    this.renderer.shadowMap.needsUpdate = true;
    const size = q === "ultra" ? 4096 : 2048;
    this.atmosphere.sun.shadow.mapSize.set(size, size);
    this.atmosphere.sun.shadow.map?.dispose();
    this.atmosphere.sun.shadow.map = null;
    this.terrain.forest.visible = true;
    this.resize();
  }
  resize() {
    const w = innerWidth,
      h = innerHeight;
    this.camera.aspect = w / h;
    this.camera.fov = verticalFov(this.camera.aspect);
    this.camera.updateProjectionMatrix();
    const ratio = Math.min(
      devicePixelRatio,
      this.quality === "ultra" ? 1.75 : this.quality === "high" ? 1.35 : 1,
    );
    this.renderer.setPixelRatio(ratio);
    this.renderer.setSize(w, h);
    this.composer?.setPixelRatio(ratio);
    this.composer?.setSize(w, h);
    this.fxaa?.uniforms.resolution.value.set(1 / (w * ratio), 1 / (h * ratio));
    this.grade?.uniforms.resolution.value.set(w * ratio, h * ratio);
  }
  update(t, dt, onThunder) {
    if (this.renderer.shadowMap.enabled && t - this.lastShadowUpdate > 0.14) {
      this.renderer.shadowMap.needsUpdate = true;
      this.lastShadowUpdate = t;
    }
    this.castle.update(t);
    this.life.update(t);
    this.terrain.update(t);
    this.falls.update(t);
    this.atmosphere.update(t, dt, onThunder);
    this.atmosphere.sky.position.copy(this.camera.position);
  }
  render() {
    this.renderer.info.reset();
    this.composer.render();
  }
  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    this.slate?.dispose();
    const geometries = new Set(),
      materials = new Set(),
      textures = new Set();
    this.scene.traverse((o) => {
      if (o.geometry) geometries.add(o.geometry);
      if (o.material)
        (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) =>
          materials.add(m),
        );
    });
    Object.values(this.materials).forEach((m) => materials.add(m));
    materials.forEach((m) => {
      Object.values(m).forEach((v) => {
        if (v?.isTexture) textures.add(v);
      });
      if (m.uniforms)
        Object.values(m.uniforms).forEach((u) => {
          if (u.value?.isTexture) textures.add(u.value);
        });
    });
    geometries.forEach((g) => g.dispose());
    textures.forEach((t) => t.dispose());
    materials.forEach((m) => m.dispose());
    this.composer.passes.forEach((p) => p.dispose?.());
    this.composer.dispose();
    this.renderer.dispose();
  }
}
