import * as T from "three";
import { cliffRadius } from "./CliffProfile.js";
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
