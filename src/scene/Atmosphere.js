import * as T from "three";
import { createSummitStorm } from "./SummitStorm.js";
const noise = `float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1.,0.)),f.x),mix(hash(i+vec2(0.,1.)),hash(i+1.),f.x),f.y);}float fbm(vec2 p){float v=0.,a=.5;for(int i=0;i<5;i++){v+=noise(p)*a;p=p*2.03+17.7;a*=.5;}return v;}`;
export const TIMES = {
  dawn: {
    name: "黎明",
    hour: "05:42",
    sky: 0x283e55,
    horizon: 0x9a8075,
    light: 1.7,
    ambient: 1.05,
    angle: 0.12,
    night: 0.55,
  },
  morning: {
    name: "上午",
    hour: "09:18",
    sky: 0x335d78,
    horizon: 0xa8b5bb,
    light: 3,
    ambient: 1.5,
    angle: 0.55,
    night: 0.13,
  },
  noon: {
    name: "正午",
    hour: "12:00",
    sky: 0x416c88,
    horizon: 0xb7c9ce,
    light: 3.8,
    ambient: 1.7,
    angle: 1.3,
    night: 0.04,
  },
  dusk: {
    name: "黄昏",
    hour: "18:47",
    sky: 0x304e69,
    horizon: 0x819eae,
    light: 3.16,
    ambient: 1.29,
    angle: 0.27,
    night: 0.7,
  },
  night: {
    name: "深夜",
    hour: "00:16",
    sky: 0x091321,
    horizon: 0x344d60,
    light: 1.1,
    ambient: 0.7,
    angle: 0.7,
    night: 1,
  },
};
export const WEATHERS = {
  clear: { name: "晴天", cloud: 0.33, fog: 0.0015, dim: 1, rain: 0, snow: 0 },
  cloudy: {
    name: "阴天",
    cloud: 0.68,
    fog: 0.00125,
    dim: 0.82,
    rain: 0,
    snow: 0,
  },
  fog: { name: "雾天", cloud: 0.7, fog: 0.0054, dim: 0.72, rain: 0, snow: 0 },
  rain: { name: "暴雨", cloud: 0.86, fog: 0.0036, dim: 0.6, rain: 1, snow: 0 },
  storm: {
    name: "雷暴",
    cloud: 0.94,
    fog: 0.0025,
    dim: 0.55,
    rain: 1,
    snow: 0,
  },
  snow: {
    name: "降雪",
    cloud: 0.76,
    fog: 0.00185,
    dim: 0.88,
    rain: 0,
    snow: 1,
  },
};
export function createAtmosphere(scene, m, skyAtlas) {
  const skyMat = new T.ShaderMaterial({
    side: T.BackSide,
    depthWrite: false,
    uniforms: {
      atlas: { value: skyAtlas },
      artLight: { value: 1.08 },
      time: { value: 0 },
      top: { value: new T.Color(TIMES.dusk.sky) },
      horizon: { value: new T.Color(TIMES.dusk.horizon) },
      cloud: { value: 0.68 },
      flash: { value: 0 },
      orbDirection: { value: new T.Vector3(-0.65, 0.5, -0.6) },
      night: { value: 0.7 },
    },
    vertexShader:
      "varying vec3 vWorld;void main(){vWorld=(modelMatrix*vec4(position,1.)).xyz;gl_Position=projectionMatrix*viewMatrix*vec4(vWorld,1.);}",
    fragmentShader: `
      varying vec3 vWorld;
      uniform float time,cloud,flash,night,artLight;
      uniform vec3 top,horizon,orbDirection;
      uniform sampler2D atlas;
      ${noise}
      void main() {
        vec3 dir=normalize(vWorld-cameraPosition);
        float elevation=asin(clamp(dir.y,-1.,1.));
        float angle=atan(dir.x,-dir.z)+.09;
        float u=fract(.5+(angle+.86*sin(angle))/6.2831853);
        float v=.105+elevation*1.43;
        vec2 flow=vec2(.00065*sin(time*.028+v*13.),.0014*cos(time*.034+u*19.));
        vec3 painted=texture2D(atlas,vec2(u,clamp(v,.01,.98))+flow).rgb;
        float lum=dot(painted,vec3(.2126,.7152,.0722));
        vec2 offset=(vec2(u,v)-vec2(.415,.54))*vec2(3.0,.73);
        float opening=exp(-dot(offset,offset)*11.);
        vec3 daylight=painted*artLight*mix(vec3(.29,.49,.67),vec3(1.06,.99,.85),opening);
        vec3 winterLight=lum*vec3(.48,.66,.85)*artLight+top*.16;
        daylight=mix(mix(winterLight,daylight,.30),daylight,smoothstep(.18,.58,night));
        float midnight=smoothstep(.77,.99,night);
        vec3 cloudLight=mix(daylight,lum*vec3(.075,.13,.24)+top*.14,midnight);
        float overcast=smoothstep(.72,.93,cloud);
        cloudLight=mix(cloudLight,(cloudLight*.24+lum*vec3(.045,.09,.14)),overcast*.86);
        vec3 gradient=mix(horizon,top,smoothstep(-.02,.85,dir.y));
        float mask=smoothstep(-.08,.035,elevation)*(1.-smoothstep(.58,.81,elevation));
        mask*=smoothstep(.0,.05,min(u,1.-u));
        float atlasWeight=.32+.68*smoothstep(.26,.59,cloud);
        vec3 col=mix(gradient,cloudLight,mask*atlasWeight);
        vec2 p=dir.xz/max(.16,dir.y+.13)*2.5+vec2(time*.005,time*.001);
        float veils=fbm(p), thinCloud=smoothstep(.43,.83,veils)*cloud;
        col=mix(col,col*.72+horizon*.17,thinCloud*.62);
        float disk=max(dot(dir,normalize(orbDirection)),0.);
        col+=pow(disk,1000.)*mix(vec3(.7,.67,.50),vec3(.45,.69,.95),night)*(1.-overcast)*max(midnight,1.-atlasWeight);
        col+=flash*.65;
        gl_FragColor=vec4(col,1.);
      }`,
  });
  const sky = new T.Mesh(new T.SphereGeometry(2200, 32, 20), skyMat);
  scene.add(sky);
  scene.fog = new T.FogExp2(0x344b56, 0.00125);
  const hemi = new T.HemisphereLight(0xc4e1ff, 0x556e78, 1.45);
  scene.add(hemi);
  const sun = new T.DirectionalLight(0xc9dded, 2.6);
  sun.position.set(-110, 210, 100);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, {
    left: -200,
    right: 200,
    top: 190,
    bottom: -150,
    near: 1,
    far: 600,
  });
  sun.shadow.normalBias = 0.2;
  sun.shadow.bias = -0.0002;
  scene.add(sun);
  sun.target.position.set(0, 40, 0);
  scene.add(sun.target);
  const rim = new T.DirectionalLight(0xa6defa, 1.6);
  rim.position.set(150, 165, -235);
  scene.add(rim);
  const flashLight = new T.DirectionalLight(0xbad8ff, 0);
  flashLight.position.set(-120, 180, -180);
  scene.add(flashLight);
  const storm = createSummitStorm(scene);
  const count = 3800,
    pos = new Float32Array(count * 3),
    rand = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    pos[i * 3] = (Math.random() - 0.5) * 450;
    pos[i * 3 + 1] = Math.random() * 230;
    pos[i * 3 + 2] = (Math.random() - 0.5) * 450;
    rand[i] = Math.random();
  }
  const g = new T.BufferGeometry();
  g.setAttribute("position", new T.BufferAttribute(pos, 3));
  g.setAttribute("seed", new T.BufferAttribute(rand, 1));
  const pmat = new T.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    uniforms: { time: { value: 0 }, rain: { value: 0 }, snow: { value: 0 } },
    vertexShader: `attribute float seed;uniform float time,rain,snow;varying float vSeed;
      void main(){vSeed=seed;vec3 span=vec3(450.,230.,450.);
        vec3 p=position+vec3(time*2.1+sin(time*.66+seed*70.)*3.,-time*(3.1+2.6*seed),0.);
        p=mod(p-cameraPosition+.5*span,span)-.5*span+cameraPosition;
        vec4 mv=viewMatrix*vec4(p,1.);gl_Position=projectionMatrix*mv;
        gl_PointSize=clamp(snow*3.*230./max(-mv.z,1.),1.,6.);}`,
    fragmentShader:
      "uniform float rain,snow;varying float vSeed;void main(){float d=length(gl_PointCoord-.5);float a=smoothstep(.5,.1,d)*max(snow,rain*.4);gl_FragColor=vec4(.78,.87,.92,a*(.3+vSeed*.6));}",
  });
  const particles = new T.Points(g, pmat);
  particles.frustumCulled = false;
  scene.add(particles);
  // Dedicated line particles make heavy rain read as streaks rather than snow.
  const rp = new Float32Array(1400 * 6);
  for (let i = 0; i < 1400; i++) {
    rp.set(
      [
        pos[i * 3],
        pos[i * 3 + 1],
        pos[i * 3 + 2],
        pos[i * 3] - 0.55,
        pos[i * 3 + 1] + 3.5,
        pos[i * 3 + 2],
      ],
      i * 6,
    );
  }
  const rg = new T.BufferGeometry();
  rg.setAttribute("position", new T.BufferAttribute(rp, 3));
  const rm = new T.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    uniforms: { time: pmat.uniforms.time, rain: pmat.uniforms.rain },
    vertexShader: `uniform float time;void main(){
        vec3 span=vec3(450.,230.,450.);
        vec3 tail=mod(float(gl_VertexID),2.)*vec3(-.55,3.5,0.);
        vec3 head=position-tail+vec3(time*13.,-time*89.,0.);
        head=mod(head-cameraPosition+.5*span,span)-.5*span+cameraPosition;
        gl_Position=projectionMatrix*viewMatrix*vec4(head+tail,1.);}`,
    fragmentShader:
      "uniform float rain;void main(){gl_FragColor=vec4(.55,.67,.75,rain*.22);}",
  });
  const rainLines = new T.LineSegments(rg, rm);
  rainLines.frustumCulled = false;
  scene.add(rainLines);
  let timeKey = "dusk",
    weatherKey = "cloudy",
    elapsed = 0,
    nextFlash = 13;
  const targetTop = new T.Color(),
    targetHorizon = new T.Color(),
    fogColor = new T.Color(),
    sunTint = new T.Color(),
    orb = new T.Vector3();
  return {
    sun,
    hemi,
    rim,
    sky,
    particles,
    pmat,
    get time() {
      return timeKey;
    },
    get weather() {
      return weatherKey;
    },
    get strikes() {
      return storm.count;
    },
    get strikeVisible() {
      return storm.active;
    },
    setTime(key) {
      if (TIMES[key]) timeKey = key;
    },
    setWeather(key) {
      if (WEATHERS[key]) {
        weatherKey = key;
        nextFlash = elapsed + (key === "storm" ? 1.45 : 20);
      }
    },
    lightning() {
      storm.strike();
    },
    update(t, dt, onThunder, initial = false) {
      elapsed += dt;
      const a = initial ? 1 : 1 - Math.exp(-dt * 1.1),
        tm = TIMES[timeKey],
        w = WEATHERS[weatherKey];
      skyMat.uniforms.artLight.value = T.MathUtils.lerp(
        skyMat.uniforms.artLight.value,
        (timeKey === "dawn"
          ? 0.84
          : timeKey === "morning"
            ? 1.24
            : timeKey === "noon"
              ? 1.42
              : 1.08) *
          (0.49 + 0.51 * w.dim),
        a,
      );
      targetTop.set(tm.sky).multiplyScalar(w.dim);
      targetHorizon.set(tm.horizon).multiplyScalar(w.dim);
      skyMat.uniforms.top.value.lerp(targetTop, a);
      skyMat.uniforms.horizon.value.lerp(targetHorizon, a);
      skyMat.uniforms.cloud.value = T.MathUtils.lerp(
        skyMat.uniforms.cloud.value,
        w.cloud,
        a,
      );
      skyMat.uniforms.time.value = t;
      orb.set(
        -Math.cos(tm.angle) * 0.7,
        0.15 + Math.sin(tm.angle) * 0.65,
        -0.6,
      );
      skyMat.uniforms.orbDirection.value.lerp(orb, a);
      skyMat.uniforms.night.value = T.MathUtils.lerp(
        skyMat.uniforms.night.value,
        tm.night,
        a,
      );
      sunTint.set(
        timeKey === "night"
          ? 0x9bbfe3
          : timeKey === "dawn"
            ? 0xffbb94
            : timeKey === "dusk"
              ? 0xffdfb5
              : 0xd6e6ed,
      );
      sun.color.lerp(sunTint, a);
      fogColor.copy(targetHorizon).multiplyScalar(0.7);
      scene.fog.color.lerp(fogColor, a);
      scene.fog.density = T.MathUtils.lerp(scene.fog.density, w.fog, a);
      hemi.intensity = T.MathUtils.lerp(hemi.intensity, tm.ambient * w.dim, a);
      sun.intensity = T.MathUtils.lerp(sun.intensity, tm.light * w.dim, a);
      sun.position.y = T.MathUtils.lerp(
        sun.position.y,
        70 + Math.sin(tm.angle) * 160,
        a,
      );
      sun.position.x = T.MathUtils.lerp(
        sun.position.x,
        -130 + Math.cos(tm.angle) * 40,
        a,
      );
      rim.intensity = T.MathUtils.lerp(
        rim.intensity,
        0.77 + tm.night * 0.76,
        a,
      );
      m.glass.emissiveIntensity = T.MathUtils.lerp(
        m.glass.emissiveIntensity,
        0.33 + tm.night * 1.55,
        a,
      );
      m.roseGlass.emissiveIntensity = 0.42 + m.glass.emissiveIntensity * 0.72;
      pmat.uniforms.time.value = t;
      pmat.uniforms.rain.value = T.MathUtils.lerp(
        pmat.uniforms.rain.value,
        w.rain,
        a,
      );
      pmat.uniforms.snow.value = T.MathUtils.lerp(
        pmat.uniforms.snow.value,
        w.snow,
        a,
      );
      particles.visible = pmat.uniforms.snow.value > 0.01;
      rainLines.visible = pmat.uniforms.rain.value > 0.01;
      if (
        (weatherKey === "storm" || weatherKey === "cloudy") &&
        elapsed > nextFlash
      ) {
        storm.strike(weatherKey === "storm" ? 1 : 0.37);
        nextFlash =
          elapsed + (weatherKey === "storm" ? 6 : 25) + Math.random() * 8;
        if (weatherKey === "storm") onThunder?.();
      }
      const glow = storm.update(dt);
      flashLight.intensity = glow * (weatherKey === "storm" ? 2.3 : 0.16);
      skyMat.uniforms.flash.value =
        glow * (weatherKey === "storm" ? 0.33 : 0.035);
    },
  };
}
