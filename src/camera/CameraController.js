import * as T from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { presetPose } from "./Framing.js";
export const LOCATIONS = [
  {
    id: "citadel",
    name: "王冠主堡",
    en: "The Crown Citadel",
    tag: "王国之心",
    era: "建于第三纪元 · 412 年",
    point: [0, 94, 0],
    view: [145, 121, 205],
    story:
      "冰川之上，王冠主堡已矗立六百余年。它的九座尖塔记录着九位君王的誓言。每当风暴来临，西厅的灯火便整夜不熄——传说那是在为穿越风雪的守望者标明归路。",
  },
  {
    id: "bell",
    name: "暮钟高塔",
    en: "The Vesper Belfry",
    tag: "时间的守望者",
    era: "王朝纪事 · 467 年",
    point: [-34, 100, 3],
    view: [-98, 118, 110],
    story:
      "钟楼每一声低鸣，都越过森林与群峰。最后一位铸钟师将王室的旧战甲熔入青铜，愿战争从此只留下回声。钟盘永远停在守城之战结束的那一刻。",
  },
  {
    id: "gate",
    name: "灰烬城门",
    en: "The Ashen Gate",
    tag: "最后一道防线",
    era: "北境战争 · 531 年",
    point: [0, 68, 52],
    view: [33, 85, 115],
    story:
      "铁栅后方，是经历七次围城而未曾失守的灰烬门。吊桥的每一块橡木都留下了修补的印记。石拱上的王室纹章已经风化，却依然朝向来路。",
  },
  {
    id: "watch",
    name: "风暴瞭望塔",
    en: "Stormwatch",
    tag: "雪谷之眼",
    era: "雪岭守备 · 488 年",
    point: [33, 80, 39],
    view: [115, 102, 105],
    story:
      "守望者从这里辨认冰雾里的商队。暗红旗帜是山口最后一抹颜色，也是翻越雪线的人辨认故乡的信号。旗帜降下的日子，山下的驮队便暂缓启程。",
  },
  {
    id: "garden",
    name: "王室花园",
    en: "The Silent Garden",
    tag: "石墙之间的春天",
    era: "女王的赠礼 · 502 年",
    point: [31, 64, 30],
    view: [91, 110, 107],
    story:
      "这片小小的常绿庭院由一位来自南方的王后栽植。寒风在高墙之外咆哮，石泉却始终守着庭院中央的宁静。如今唯有柏树仍记得她的名字。",
  },
  {
    id: "village",
    name: "烬谷村庄",
    en: "Emberfall Village",
    tag: "王国尚在呼吸",
    era: "牧人与工匠的聚落",
    point: [-112, 26, 83],
    view: [-175, 70, 185],
    story:
      "铸铁匠、牧人与石工聚居在主堡的影子里。日落后，陡峭的屋顶下逐一点亮暖灯。无论王朝如何更替，村中的炉火始终为旅人保留着位置。",
  },
  {
    id: "wing",
    name: "冰翼山脊",
    en: "The Wing of Winter",
    tag: "冰川的西境",
    era: "王国诞生之前",
    point: [-275, 382, -345],
    view: [-393, 174, 450],
    story:
      "冰盖退去以后，十一道深色岩层从同一座山肩显露出来。最外层的石刃高悬在雪谷上，风雪只在背风的褶皱里留下蓝冰。村里人靠这片永远指向西方的石翼辨认归路。",
  },
  {
    id: "falls",
    name: "银泪瀑布",
    en: "The Silver Veil",
    tag: "山与冰的交界",
    era: "王国诞生之前",
    point: [45, 32, 45],
    view: [123, 61, 124],
    story:
      "融雪沿着岩层的裂隙汇聚，最终在这里落入深蓝的冰隙。人们相信瀑布的水雾保存着山的记忆。月光穿过时，岩壁上会浮起一条银色的帷幕。",
  },
  {
    id: "forest",
    name: "古誓森林",
    en: "The Oathwood",
    tag: "古老的边界",
    era: "无人知晓的年代",
    point: [-151, 40, -113],
    view: [-248, 137, 20],
    story:
      "松林从废墟之间重新长起，覆盖了昔日通往北境的道路。断裂的石柱与林间的风声，讲述着王国建立之前的故事。没有人记得最初的誓言，但森林从未遗忘。",
  },
  {
    id: "overlook",
    name: "悬崖观景台",
    en: "The Last Horizon",
    tag: "世界尽头",
    era: "西境观星台遗址",
    point: [-45, 66, 30],
    view: [-133, 94, 120],
    story:
      "越过石栏，便是雾中起伏的群峰。这里曾是王室观星师的工作之地。最后一本星图的末页只有一句话：当群星隐去，我们仍将守望。",
  },
  {
    id: "highcourt",
    name: "霆冠上城",
    en: "The Thunder Court",
    tag: "群峰之冠",
    era: "北境纪事 · 纪元 601 年",
    point: [-124, 332, -305],
    view: [-3, 326, -108],
    story:
      "石匠在最高的黑岩上嵌下第一块基石时，山下还是冰湖。暴风至今会沿北塔尖端劈落。守塔人用三盏长明灯向主堡传递山口的消息，晴夜里连最远的村落也能看见。",
  },
  {
    id: "road",
    name: "九折王道",
    en: "The Pilgrim Road",
    tag: "峰间古道",
    era: "王朝纪事 · 483 年",
    point: [-42, 194, -163],
    view: [282, 226, 134],
    story:
      "铺路人的第一条规矩，是让驮着石料的骡队可以转身。从雪谷到上城的折返处至今还能看到加宽的路肩。每一道弯都有一盏灯，入夜后，它们把三个山头缝成一条金线。",
  },
];
export function alpineApproach() {
  return new T.CatmullRomCurve3(
    [
      [5, 155, 805],
      [62, 132, 665],
      [132, 82, 435],
      [156, 90, 359],
      [198, 135, 283],
      [121, 112, 328],
    ].map((p) => new T.Vector3(...p)),
  );
}
const approachLook = new T.CatmullRomCurve3(
  [
    [-170, 280, -192],
    [-103, 196, -117],
    [0, 116, 0],
    [0, 114, 0],
    [0, 120, 0],
    [0, 116, 0],
  ].map((p) => new T.Vector3(...p)),
);
for (const l of LOCATIONS) {
  if (!["village", "wing", "forest", "road", "highcourt"].includes(l.id)) {
    l.point[1] += 32;
    l.view[1] += 26;
  }
}
export class CameraController {
  constructor(camera, canvas, terrain, colliders, onMode) {
    this.camera = camera;
    this.controls = new OrbitControls(camera, canvas);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.06;
    this.controls.minDistance = 25;
    this.controls.maxDistance = 2800;
    this.controls.maxPolarAngle = Math.PI * 0.83;
    this.controls.zoomSpeed = 0.7;
    this.controls.panSpeed = 0.6;
    this.path = alpineApproach();
    this.controls.target.copy(approachLook.points[0]);
    camera.position.copy(this.path.points[0]);
    camera.lookAt(this.controls.target);
    this.terrain = terrain;
    this.boxes = colliders.map(
      (c) =>
        new T.Box3(
          new T.Vector3(...c.min).addScalar(-2),
          new T.Vector3(...c.max).addScalar(2),
        ),
    );
    this.last = camera.position.clone();
    this.lastTarget = this.controls.target.clone();
    this.onMode = onMode;
    this.mode = "cinematic";
    this.auto = true;
    this.elapsed = 0;
    this.flight = null;
    this.controls.addEventListener("start", () => this.setMode("explore"));
    this.controls.enabled = false;
    this.tmp = new T.Vector3();
    this.from = new T.Vector3();
    this.to = new T.Vector3();
    this.candidate = new T.Vector3();
  }
  setMode(mode) {
    this.framedLocation = null;
    this.mode = mode;
    this.auto = mode === "cinematic";
    this.controls.enabled = !this.auto;
    this.flight = null;
    this.intro = null;
    if (this.auto) {
      this.elapsed = 0;
      this.intro = {
        start: this.camera.position.clone(),
        target: this.controls.target.clone(),
        t: 0,
        lift: this.flightLift(this.camera.position, this.path.points[0]),
      };
    }
    this.onMode?.(mode);
  }
  blocked(p) {
    if (p.y < 3) return true;
    if (this.terrain.wing?.contains(p) || this.terrain.pass?.contains(p))
      return true;
    if (this.terrain.heightAt && p.y < this.terrain.heightAt(p.x, p.z) + 3)
      return true;
    if (p.y > 88 && p.y < 108 && Math.hypot(p.x, p.z) < 60) return true;
    for (const b of this.boxes) if (b.containsPoint(p)) return true;
    for (const a of this.terrain.islands) {
      const r =
        ((p.x - a.x) / (a.rx * 1.25 + 3)) ** 2 +
        ((p.z - a.z) / (a.rz * 1.25 + 3)) ** 2;
      if (r < 1 && p.y < a.height + 4) return true;
    }
    return false;
  }
  segmentSafe(a, b) {
    const steps = Math.max(1, Math.ceil(a.distanceTo(b) / 2));
    for (let i = 1; i <= steps; i++) {
      this.tmp.lerpVectors(a, b, i / steps);
      if (this.blocked(this.tmp)) return false;
    }
    return true;
  }
  flightPoint(start, end, lift, p, out) {
    out.lerpVectors(start, end, p * p * (3 - 2 * p));
    out.y += Math.sin(p * Math.PI) * lift;
    return out;
  }
  flightLift(start, end) {
    const point = new T.Vector3(),
      last = new T.Vector3(),
      steps = Math.max(45, Math.ceil(start.distanceTo(end) / 3));
    for (let lift = 60; lift <= 1260; lift += 40) {
      last.copy(start);
      let clear = true;
      for (let i = 1; i <= steps; i++) {
        this.flightPoint(start, end, lift, i / steps, point);
        if (!this.segmentSafe(last, point)) {
          clear = false;
          break;
        }
        last.copy(point);
      }
      if (clear) return lift;
    }
    return 1300;
  }
  go(location, instant = false) {
    this.setMode("explore");
    this.framedLocation = location;
    const { eye: end, target: targetEnd } = presetPose(location, this.camera);
    if (instant) {
      this.camera.position.copy(end);
      this.controls.target.copy(targetEnd);
      this.camera.lookAt(targetEnd);
      this.camera.updateMatrixWorld();
      this.last.copy(end);
      this.lastTarget.copy(targetEnd);
      return;
    }
    this.controls.enabled = false;
    this.flight = {
      start: this.camera.position.clone(),
      end,
      targetStart: this.controls.target.clone(),
      targetEnd,
      t: 0,
    };
    this.flight.lift = this.flightLift(this.flight.start, this.flight.end);
  }
  home() {
    this.go(LOCATIONS[0]);
  }
  update(dt) {
    if (this.auto && this.intro) {
      const f = this.intro;
      f.t += dt;
      const p = Math.min(f.t / 4, 1),
        e = p * p * (3 - 2 * p);
      this.flightPoint(f.start, this.path.points[0], f.lift, p, this.candidate);
      if (this.segmentSafe(this.last, this.candidate))
        this.camera.position.copy(this.candidate);
      else this.camera.position.y += dt * 45;
      this.to.copy(approachLook.points[0]);
      this.controls.target.lerpVectors(f.target, this.to, e);
      this.camera.lookAt(this.controls.target);
      if (p === 1) this.intro = null;
    } else if (this.auto) {
      this.elapsed += dt;
      const p = Math.min(this.elapsed / 68, 1),
        e = p * p * (3 - 2 * p);
      this.path.getPoint(e, this.camera.position);
      approachLook.getPoint(e, this.controls.target);
      this.camera.lookAt(this.controls.target);
      if (p === 1) {
        this.auto = false;
        this.controls.enabled = true;
        this.mode = "explore";
        this.onMode?.("explore");
      }
    } else if (this.flight) {
      const f = this.flight;
      f.t += dt;
      const p = Math.min(f.t / 2.6, 1),
        e = p * p * (3 - 2 * p);
      this.flightPoint(f.start, f.end, f.lift, p, this.candidate);
      if (this.segmentSafe(this.last, this.candidate))
        this.camera.position.copy(this.candidate);
      else this.camera.position.y += dt * 45;
      this.controls.target.lerpVectors(f.targetStart, f.targetEnd, e);
      this.camera.lookAt(this.controls.target);
      if (p === 1) {
        this.flight = null;
        this.controls.enabled = true;
      }
    } else {
      this.controls.update();
      if (!this.segmentSafe(this.last, this.camera.position)) {
        const damping = this.controls.enableDamping;
        this.controls.enableDamping = false;
        this.controls.update();
        this.controls.enableDamping = damping;
        this.camera.position.copy(this.last);
        this.controls.target.copy(this.lastTarget);
        this.camera.lookAt(this.controls.target);
      }
      this.controls.target.x = T.MathUtils.clamp(
        this.controls.target.x,
        -620,
        420,
      );
      this.controls.target.y = T.MathUtils.clamp(
        this.controls.target.y,
        4,
        475,
      );
      this.controls.target.z = T.MathUtils.clamp(
        this.controls.target.z,
        -650,
        500,
      );
    }
    this.last.copy(this.camera.position);
    this.lastTarget.copy(this.controls.target);
  }
  dispose() {
    this.controls.dispose();
  }
}
