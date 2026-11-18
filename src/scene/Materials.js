import * as T from "three";
export function seeded(seed = 127) {
  return () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };
}

function roseGlass() {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 512;
  const ctx = canvas.getContext("2d");
  ctx.translate(256,256);
  ctx.fillStyle="#132831";
  ctx.fillRect(-256,-256,512,512);
  const radii=[0,40,81,126,169,209,250,256];
  const palette=[
    ["#efc780","#f2d99a"],["#7f373c","#bd6353"],["#3c7179","#58858a"],
    ["#9d433e","#ce794f"],["#547c88","#78a095"],["#bb784e","#e7b56a"],
    ["#425d69","#7f383b"]
  ];
  // Small fired-glass pieces are bounded by lead cames. The stone petal
  // tracery sits physically in front of this disk and casts its own shadow.
  for(let band=0;band<palette.length;band++) {
    const count=band===0?12:48, turn=(band%2)*Math.PI/count;
    for(let j=0;j<count;j++) {
      const a=turn+j*2*Math.PI/count, b=a+2*Math.PI/count;
      ctx.beginPath();
      ctx.arc(0,0,radii[band+1],a,b);
      if(radii[band])ctx.arc(0,0,radii[band],b,a,true);
      else ctx.lineTo(0,0);
      ctx.closePath();
      ctx.fillStyle=palette[band][Math.floor(j/2)%2];
      ctx.fill();ctx.strokeStyle="#253034";ctx.lineWidth=1.8;ctx.stroke();
    }
  }
  const map=new T.CanvasTexture(canvas);
  map.colorSpace=T.SRGBColorSpace;
  return new T.MeshStandardMaterial({map,emissiveMap:map,emissive:0xffffff,
    emissiveIntensity:1,roughness:.46});
}

function periodicNoise(count, random) {
  const values=Float32Array.from({length:count*count},random);
  return (u,v)=>{
    const x=(u-Math.floor(u))*count,y=(v-Math.floor(v))*count;
    const ix=Math.floor(x),iy=Math.floor(y),j=(iy+1)%count,k=(ix+1)%count;
    let a=x-ix,b=y-iy;
    a*=a*(3-2*a); b*=b*(3-2*b);
    const lo=values[iy*count+ix]*(1-a)+values[iy*count+k]*a;
    const hi=values[j*count+ix]*(1-a)+values[j*count+k]*a;
    return lo*(1-b)+hi*b;
  };
}
export function createMaterials() {
  const rand = seeded(),
    size = 1024,
    canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const c = canvas.getContext("2d");
  c.fillStyle = "#333b3e";
  c.fillRect(0, 0, size, size);
  for (let row = 0; row < 16; row++)
    for (let col = -1; col < 8; col++) {
      const x = col * 144 + (row % 2) * 72,
        y = row * 64,
        v = 145 + rand() * 24;
      c.fillStyle = `rgb(${v * 0.98},${v},${v * 0.99})`;
      c.fillRect(x + 2, y + 2, 140, 60);
      c.strokeStyle = "rgba(190,193,181,.2)";
      c.strokeRect(x + 3, y + 3, 138, 58);
      for (let k = 0; k < 45; k++) {
        c.fillStyle = `rgba(${rand() > 0.4 ? "12,20,18" : "200,190,164"},${rand() * 0.2})`;
        c.fillRect(
          x + rand() * 140,
          y + rand() * 62,
          rand() * 17 + 1,
          rand() * 2 + 1,
        );
      }
      if (rand() > 0.7) {
        c.strokeStyle = "rgba(20,24,22,.5)";
        c.beginPath();
        c.moveTo(x + 45, y + 2);
        c.lineTo(x + 56, y + 24);
        c.lineTo(x + 50, y + 46);
        c.stroke();
      }
      if (rand() > 0.55) {
        c.fillStyle = "rgba(36,52,28,.24)";
        c.fillRect(x + 2, y + 48, 140, 13);
      }
    }
  const image = c.getImageData(0, 0, size, size);
  for (let i = 0; i < image.data.length; i += 4) {
    const n = (rand() - 0.5) * 23;
    image.data[i] += n;
    image.data[i + 1] += n;
    image.data[i + 2] += n;
  }
  c.putImageData(image, 0, 0);
  const map = new T.CanvasTexture(canvas);
  map.wrapS = map.wrapT = T.RepeatWrapping;
  map.colorSpace = T.SRGBColorSpace;
  map.anisotropy = 8;
  const normalCanvas = document.createElement("canvas");
  normalCanvas.width = normalCanvas.height = size;
  const nc = normalCanvas.getContext("2d"),
    ni = nc.createImageData(size, size),
    d = image.data;
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4,
        dx =
          d[(y * size + ((x + 1) % size)) * 4] -
          d[(y * size + ((x + size - 1) % size)) * 4],
        dy =
          d[(((y + 1) % size) * size + x) * 4] -
          d[(((y + size - 1) % size) * size + x) * 4];
      ni.data[i] = 128 - dx * 0.85;
      ni.data[i + 1] = 128 + dy * 0.85;
      ni.data[i + 2] = 245;
      ni.data[i + 3] = 255;
    }
  nc.putImageData(ni, 0, 0);
  const normal = new T.CanvasTexture(normalCanvas);
  normal.wrapS = normal.wrapT = T.RepeatWrapping;
  const stone = new T.MeshStandardMaterial({
    map,
    normalMap: normal,
    normalScale: new T.Vector2(0.8, 0.8),
    roughness: 0.93,
    color: 0xc4ccce,
  });
  const trim = stone.clone();
  trim.color.set(0xc7c5b5);
  const dark = stone.clone();
  dark.color.set(0x566168);
  const roof = new T.MeshStandardMaterial({
    color: 0x273940,
    roughness: 0.67,
    metalness: 0.25,
    map,
    normalMap: normal,
    normalScale: new T.Vector2(0.3, 0.3),
  });
  const rc = document.createElement("canvas");
  rc.width = rc.height = 1024;
  const ctx = rc.getContext("2d"),
    ri = ctx.createImageData(1024, 1024);
  const rockRandom=seeded(9105);
  const drift=periodicNoise(5,rockRandom), beds=periodicNoise(21,rockRandom),
    grit=periodicNoise(77,rockRandom);
  for (let y = 0; y < 1024; y++)
    for (let x = 0; x < 1024; x++) {
      const i = (y * 1024 + x) * 4,
        u=x/1024,vv=y/1024,warp=drift(u,vv),
        seam=beds(u+.12*warp,vv*2+u+.30*warp),
        fracture=Math.max(0,1-Math.abs(beds(u,vv+.16*warp)-.54)*25),
        v=87+47*warp+35*seam+17*grit(u,vv)-fracture*(7+15*warp)+(rand()-.5)*13;
      ri.data[i] = v * (0.96+warp*.08);
      ri.data[i + 1] = v * .99;
      ri.data[i + 2] = v;
      ri.data[i + 3] = 255;
    }
  ctx.putImageData(ri, 0, 0);
  const rockMap = new T.CanvasTexture(rc);
  rockMap.wrapS = rockMap.wrapT = T.RepeatWrapping;
  rockMap.colorSpace = T.SRGBColorSpace;
  rockMap.anisotropy = 8;
  rockMap.repeat.set(1.7, .94);
  const rn = document.createElement("canvas");
  rn.width = rn.height = 1024;
  const rnctx = rn.getContext("2d"),
    rni = rnctx.createImageData(1024, 1024);
  for (let y = 0; y < 1024; y++)
    for (let x = 0; x < 1024; x++) {
      const i = (y * 1024 + x) * 4;
      rni.data[i] =
        128 + (ri.data[i] - ri.data[(y * 1024 + ((x + 1) % 1024)) * 4]) * 1.5;
      rni.data[i + 1] =
        128 + (ri.data[i] - ri.data[(((y + 1) % 1024) * 1024 + x) * 4]) * 1.5;
      rni.data[i + 2] = 240;
      rni.data[i + 3] = 255;
    }
  rnctx.putImageData(rni, 0, 0);
  const rockNormal = new T.CanvasTexture(rn);
  rockNormal.wrapS = rockNormal.wrapT = T.RepeatWrapping;
  rockNormal.repeat.copy(rockMap.repeat);
  const rock = new T.MeshStandardMaterial({
    color: 0xb2bec3,
    roughness: 1,
    vertexColors: true,
    map: rockMap,
    normalMap: rockNormal,
    normalScale: new T.Vector2(1.6, 1.6),
  });

  const slate = document.createElement("canvas");
  slate.width = slate.height = 512;
  const sc = slate.getContext("2d");
  sc.fillStyle = "#16252c";
  sc.fillRect(0, 0, 512, 512);
  for (let row = 0; row < 32; row++)
    for (let col = -1; col < 16; col++) {
      const x = col * 34 + (row % 2) * 17,
        y = row * 16,
        v = 45 + rand() * 27;
      sc.fillStyle = "rgb(" + v + "," + (v + 10) + "," + (v + 15) + ")";
      sc.fillRect(x + 1, y + 1, 32, 14);
      sc.fillStyle = "rgba(150,171,180,.18)";
      sc.fillRect(x + 1, y + 13, 32, 1);
    }
  const slateMap = new T.CanvasTexture(slate);
  slateMap.colorSpace = T.SRGBColorSpace;
  slateMap.wrapS = slateMap.wrapT = T.RepeatWrapping;
  slateMap.anisotropy = 8;
  roof.map = slateMap;
  roof.bumpMap = slateMap;
  roof.bumpScale = 0.12;
  roof.normalMap = null;
  roof.color.set(0xb1c0c5);
  const bannerCanvas = document.createElement("canvas");
  bannerCanvas.width = 512;
  bannerCanvas.height = 256;
  const bc = bannerCanvas.getContext("2d");
  bc.fillStyle = "#651a29";
  bc.fillRect(0, 0, 512, 256);
  bc.strokeStyle = "#b49b5d";
  bc.lineWidth = 5;
  bc.strokeRect(14, 14, 484, 228);
  bc.fillStyle = "#ad9257";
  bc.beginPath();
  bc.moveTo(200, 55);
  bc.lineTo(300, 55);
  bc.lineTo(293, 142);
  bc.lineTo(250, 194);
  bc.lineTo(207, 142);
  bc.closePath();
  bc.fill();
  bc.fillStyle = "#571c28";
  bc.fillRect(243, 75, 14, 84);
  bc.fillRect(219, 100, 62, 13);
  for (let i = 0; i < 5000; i++) {
    bc.fillStyle = "rgba(0,0,0,.05)";
    bc.fillRect(rand() * 512, rand() * 256, 1, 3);
  }
  const bannerMap = new T.CanvasTexture(bannerCanvas);
  bannerMap.colorSpace = T.SRGBColorSpace;
  const banner = new T.MeshStandardMaterial({
    map: bannerMap,
    side: T.DoubleSide,
    roughness: 0.95,
  });

  return {
    banner,
    roseGlass: roseGlass(),
    stone,
    trim,
    dark,
    roof,
    rock,
    ground: new T.MeshStandardMaterial({ color: 0x3d4840, roughness: 1, map }),
    wood: new T.MeshStandardMaterial({ color: 0x3d291f, roughness: 0.95, map }),
    metal: new T.MeshStandardMaterial({
      color: 0x333b3d,
      metalness: 0.75,
      roughness: 0.56,
    }),
    gold: new T.MeshStandardMaterial({
      color: 0x8c7650,
      metalness: 0.7,
      roughness: 0.5,
    }),
    glass: new T.MeshStandardMaterial({
      color: 0xffc278,
      emissive: 0xffae4c,
      emissiveIntensity: 1.7,
      roughness: 0.4,
    }),
    black: new T.MeshStandardMaterial({ color: 0x0a1013, roughness: 1 }),
    leaf: new T.MeshStandardMaterial({ color: 0x233d36, roughness: 1 }),
    snow: new T.MeshStandardMaterial({ color: 0xc0cdd1, roughness: 0.95 }),
    water: new T.MeshStandardMaterial({
      color: 0x9cb8be,
      transparent: true,
      opacity: 0.62,
      roughness: 0.2,
      emissive: 0x223a41,
    }),
  };
}
