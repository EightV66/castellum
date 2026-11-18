import * as T from "three";
import { cliffRadius } from "./CliffProfile.js";
import { Water } from "./ReflectiveWater.js";
export function createOcean(scene) {
  const n = 256,
    data = new Uint8Array(n * n * 4);
  for (let y = 0; y < n; y++)
    for (let x = 0; x < n; x++) {
      const i = (y * n + x) * 4,
        a = (x / n) * Math.PI * 2,
        b = (y / n) * Math.PI * 2;
      data[i] =
        128 + Math.sin(a * 8 + b * 3) * 37 + Math.cos(a * 13 - b * 7) * 22;
      data[i + 1] =
        128 + Math.cos(b * 9 + a * 2) * 37 + Math.sin(a * 5 + b * 14) * 22;
      data[i + 2] = 238;
      data[i + 3] = 255;
    }
  const modes = Array.from({ length: 23 }, (_, k) => ({
    x: 1 + ((k * 7) % 13),
    y: ((k * 11) % 17) - 8,
    p: k * 2.399,
    a: 1 / Math.sqrt(1 + k),
  }));
  for (let y = 0; y < n; y++)
    for (let x = 0; x < n; x++) {
      let dx = 0,
        dy = 0;
      for (const mode of modes) {
        const v =
          Math.sin(((x * mode.x + y * mode.y) / n) * Math.PI * 2 + mode.p) *
          mode.a;
        dx += v * mode.x;
        dy += v * mode.y;
      }
      const i = (y * n + x) * 4;
      data[i] = 128 + dx * 2.1;
      data[i + 1] = 128 + dy * 2.1;
      data[i + 2] = 245;
    }
  const normals = new T.DataTexture(data, n, n);
  normals.wrapS = normals.wrapT = T.RepeatWrapping;
  normals.needsUpdate = true;
  normals.magFilter = T.LinearFilter;
  normals.minFilter = T.LinearFilter;
  const water = new Water(new T.PlaneGeometry(6000, 6000, 220, 220), {
    textureWidth: 512,
    textureHeight: 512,
    waterNormals: normals,
    sunDirection: new T.Vector3(-0.6, 0.5, -0.4),
    sunColor: 0xc1d5e1,
    waterColor: 0x102b35,
    distortionScale: 5,
    fog: true,
  });
  water.rotation.x = -Math.PI / 2;
  water.position.y = -1;
  water.material.uniforms.size.value = 0.85;

  water.material.vertexShader = water.material.vertexShader
    .replace(
      "mirrorCoord = modelMatrix * vec4( position, 1.0 );",
      "vec3 displaced=position; displaced.z += sin(position.x*.035+time*.65)*1.15+sin(position.y*.063-time*.9)*.65+sin((position.x+position.y)*.018-time*.45)*.8;\nmirrorCoord = modelMatrix * vec4( displaced, 1.0 );",
    )
    .replace(
      "modelViewMatrix * vec4( position, 1.0 )",
      "modelViewMatrix * vec4( displaced, 1.0 )",
    );
  water.material.fragmentShader = water.material.fragmentShader
    .replace("float rf0 = 0.3;", "float rf0 = 0.18;")
    .replace(
      "vec3( 0.1 ) + reflectionSample * 0.9",
      "vec3( 0.015, 0.025, 0.035 ) + reflectionSample * 0.55",
    );
  scene.add(water);
  const foamMaterial = new T.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    side: T.DoubleSide,
    uniforms: { time: { value: 0 } },
    vertexShader:
      "varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}",
    fragmentShader:
      "varying vec2 vUv;uniform float time;void main(){float n=sin(vUv.x*340.+sin(vUv.y*40.+time)*4.);float wave=sin(vUv.y*23.-time*1.5+sin(vUv.x*36.)*3.+sin(vUv.x*89.+time*.3)*2.);float a=smoothstep(.25,.95,wave)*pow(1.-vUv.y,1.7)*(.5+n*.2);a*=smoothstep(.1,.6,sin(vUv.x*53.+time*.2));gl_FragColor=vec4(.65,.76,.78,a*.5);}",
  });
  const foam = [];
  for (const [x, z, rx, rz] of [
    [0, 0, 76, 68],
    [-112, 83, 59, 70],
    [12, 148, 41, 82],
    [106, 54, 16, 14],
  ]) {
    const geo = new T.RingGeometry(1, 1.17, 128, 8);
    geo.rotateX(-Math.PI / 2);
    const p = geo.attributes.position,
      uv = geo.attributes.uv;
    for (let i = 0; i < p.count; i++) {
      const xx = p.getX(i),
        zz = p.getZ(i),
        a = Math.atan2(zz, xx);
      uv.setXY(
        i,
        (a + Math.PI) / (Math.PI * 2),
        (Math.sqrt(xx * xx + zz * zz) - 1) / 0.17,
      );
      p.setXYZ(i, xx * rx, 0.2, zz * rz);
    }
    const mesh = new T.Mesh(geo, foamMaterial);
    mesh.position.set(x, 0, z);
    scene.add(mesh);
    foam.push(mesh);
  }
  return {
    water,
    update(t) {
      water.material.uniforms.time.value = t * 0.55;
      foamMaterial.uniforms.time.value = t;
    },
  };
}
export function createWaterfalls(scene) {
  const uniform = { value: 0 },
    mat = new T.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      side: T.DoubleSide,
      uniforms: { time: uniform },
      vertexShader:
        "varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}",
      fragmentShader:
        `varying vec2 vUv; uniform float time;
        float hash(vec2 p){return fract(sin(dot(p,vec2(17.13,91.7)))*37451.3);}
        float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);
          return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1)),f.x),f.y);}
        void main(){
          vec2 p=vec2(vUv.x,vUv.y+time*.34);
          float drift=noise(vec2(vUv.x*3.,p.y*7.));
          float strands=noise(vec2(p.x*24.+drift*1.8,p.y*9.));
          float fine=noise(vec2(p.x*85.+drift*3.,p.y*29.));
          float edge=smoothstep(.02,.19,min(vUv.x,1.-vUv.x)+.09*(drift-.5));
          float opacity=edge*(.10+.53*strands+.19*fine);
          gl_FragColor=vec4(mix(vec3(.19,.29,.32),vec3(.50,.59,.59),fine),opacity);
        }`,
    });
  const feet=[];
  for (const [center,width] of [[.73,6.45],[.94,3.6],[-.95,4.3]]) {
    const geo=new T.PlaneGeometry(1,1,18,64);
    const pp=geo.attributes.position,uv=geo.attributes.uv;
    for(let i=0;i<pp.count;i++) {
      const drop=1-uv.getY(i),lip=Math.min(1,drop/.055);
      const y=91.24-Math.max(0,drop-.055)/.945*92.3;
      const a=center+(uv.getX(i)-.5)*width/59+.011*drop*Math.sin(drop*7+center);
      const f=T.MathUtils.clamp((y+13)/104,0,1);
      const r=cliffRadius(a,f,2)+.018-(1-lip)*.10;
      pp.setXYZ(i,62*Math.sin(a)*r,y,56*Math.cos(a)*r);
    }
    geo.computeBoundingSphere();
    const mesh = new T.Mesh(geo, mat);
    scene.add(mesh);
    const mid=pp.count-10;
    feet.push([pp.getX(mid),pp.getZ(mid)]);
  }
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 128;
  const c = canvas.getContext("2d"),
    grad = c.createRadialGradient(64, 64, 0, 64, 64, 64);
  grad.addColorStop(0, "rgba(173,200,207,.25)");
  grad.addColorStop(0.4, "rgba(173,200,207,.12)");
  grad.addColorStop(1, "rgba(173,200,207,0)");
  c.fillStyle = grad;
  c.fillRect(0, 0, 128, 128);
  const tex = new T.CanvasTexture(canvas),
    mist = [];
  for (let i = 0; i < 20; i++) {
    const sp = new T.Sprite(
      new T.SpriteMaterial({
        map: tex,
        transparent: true,
        depthWrite: false,
        opacity: 0.5,
      }),
    );
    const foot=feet[i%feet.length];
    sp.position.set(foot[0]+Math.sin(i*3)*2,2+(i%4)*1.35,foot[1]);
    sp.userData.anchorX=sp.position.x;
    sp.scale.set(20, 10, 1);
    scene.add(sp);
    mist.push(sp);
  }
  return {
    update(t) {
      uniform.value = t;
      mist.forEach((p, i) => {
        p.position.x = p.userData.anchorX + Math.sin(t * 0.3 + i) * 1.3;
        p.material.opacity = 0.35 + Math.sin(t + i) * 0.12;
      });
    },
  };
}
