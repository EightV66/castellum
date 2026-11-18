import { LOCATIONS } from "../camera/CameraController.js";
import { TIMES, WEATHERS } from "../scene/Atmosphere.js";
const icon = (name) => {
  const paths = {
    sound:
      '<path d="m4 9 4 0 5-4v14l-5-4H4z"/><path d="M16 8q5 4 0 8M18 5q8 7 0 14"/>',
    expand: '<path d="M4 9V4h5m6 0h5v5M4 15v5h5m6 0h5v-5"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v3m0 14v3M2 12h3m14 0h3M5 5l2 2m10 10 2 2M5 19l2-2M17 7l2-2"/>',
    cloud: '<path d="M6 18a5 5 0 1 1 1-10 6 6 0 0 1 11 2 4 4 0 1 1 0 8z"/>',
    eye: '<path d="M2 12q10-14 20 0Q12 26 2 12z"/><circle cx="12" cy="12" r="3"/>',
    play: '<path d="m8 5 11 7-11 7z"/>',
    compass: '<circle cx="12" cy="12" r="9"/><path d="m16 8-2 6-6 2 2-6z"/>',
    back: '<path d="m10 5-7 7 7 7M3 12h18"/>',
    chevron: '<path d="m8 4 8 8-8 8"/>',
    close: '<path d="m6 6 12 12M18 6 6 18"/>',
  };
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2" aria-hidden="true">${paths[name] || paths.compass}</svg>`;
};
export class Interface {
  constructor(handlers) {
    this.h = handlers;
    this.selected = LOCATIONS[0];
    this.hidden = false;
    this.build();
    this.bind();
  }
  build() {
    const crestUrl = import.meta.env.BASE_URL + "crest.svg";
    document.getElementById("app").innerHTML = `
 <div id="loading" role="status"><div class="loading-crest"><img src="${crestUrl}" alt="王室徽章"></div><div class="loading-title">CASTELLUM</div><div class="loading-sub">THE LAST KINGDOM</div><div class="loading-line"><i id="load-bar"></i></div><p id="load-message">唤醒沉睡的王国</p><small>一个关于风、石与时间的世界</small></div>
 <div id="interface" class="interface">
 <header><a class="brand" href="#" aria-label="返回主城堡"><img src="${crestUrl}" alt=""><div><strong>CASTELLUM</strong><span>THE LAST KINGDOM</span></div></a><div class="top-status"><span class="live-dot"></span><span id="status-time">18:47 · 黄昏</span><i></i><span id="status-weather">阴天</span><button id="sound" class="icon-button" aria-label="开启声音" title="声音 M" aria-pressed="false">${icon("sound")}</button><button id="fullscreen" class="icon-button" aria-label="全屏" title="全屏">${icon("expand")}</button></div></header>
 <aside class="navigation"><div class="eyebrow"><span>THE KINGDOM</span><span class="small-cross">✧</span></div><div class="nav-heading">探索王国 <span>${LOCATIONS.length}</span></div><nav aria-label="区域导航">${LOCATIONS.map((l, i) => `<button data-location="${l.id}" class="location ${i === 0 ? "active" : ""}" aria-pressed="${i === 0}"><span class="ordinal">${String(i + 1).padStart(2, "0")}</span><span>${l.name}</span><span class="location-dot">◆</span></button>`).join("")}</nav><button id="map-toggle" class="map-button">${icon("compass")}<span>展开王国地图</span><span>↗</span></button><div class="nav-footer">北境 · 霜翼群峰<br><span>58° 21′ N &nbsp; 06° 14′ W</span><br><output id="scene-stats">WORLD ONLINE</output></div></aside>
 <aside class="environment"><button id="env-toggle" aria-expanded="true"><span>${icon("sun")} 世界之息</span><span id="env-chevron">−</span></button><div id="env-body"><div class="control-label">时 光 <small>TIME OF DAY</small></div><div class="time-options">${Object.entries(
   TIMES,
 )
   .map(
     ([k, v]) =>
       `<button data-time="${k}" aria-pressed="${k === "dusk"}" class="${k === "dusk" ? "active" : ""}" title="${v.hour}">${v.name}</button>`,
   )
   .join(
     "",
   )}</div><div class="time-track"><span>☼</span><i></i><span>☾</span></div><div class="control-label weather-label">天 候 <small>WEATHER</small></div><div class="weather-options">${Object.entries(
   WEATHERS,
 )
   .map(
     ([k, v]) =>
       `<button data-weather="${k}" class="${k === "cloudy" ? "active" : ""}" aria-pressed="${k === "cloudy"}"><span>${{ clear: "☼", cloudy: "☁", fog: "≋", rain: "☂", storm: "ϟ", snow: "❄" }[k]}</span>${v.name}</button>`,
   )
   .join(
     "",
   )}</div><div class="weather-note">环境将在数秒内自然过渡</div><details id="visual-settings"><summary>画质与光影 <span>+</span></summary><label class="select-row">渲染质量<select id="quality" aria-label="渲染质量"><option value="low">流畅</option><option value="high" selected>高画质</option><option value="ultra">极致</option></select></label><label class="range-row">泛光强度<input id="bloom" type="range" min="0" max="0.8" step="0.02" value="0.26"></label><label class="check-row">环境遮蔽 SSAO<input id="ao" type="checkbox"></label><label class="check-row">镜头边缘柔焦<input id="focus" type="checkbox"></label></details><details id="audio-settings"><summary>环境声场 <span>+</span></summary>${[
   ["master", "总音量", 0.45],
   ["ice", "冰川低鸣", 0.45],
   ["wind", "风声", 0.25],
   ["rain", "雨与雷", 0.4],
   ["bell", "远处钟声", 0.3],
   ["music", "氛围音乐", 0.12],
 ]
   .map(
     ([k, n, v]) =>
       `<label class="range-row">${n}<input type="range" data-volume="${k}" min="0" max="1" step="0.01" value="${v}" aria-label="${n}音量"></label>`,
   )
   .join(
     "",
   )}<button id="bell" class="text-button">聆听暮钟 ↗</button></details></div></aside>
 <div class="scene-caption"><div class="eyebrow"><span id="location-tag">王国之心</span><span class="caption-rule"></span><span id="location-number">CHAPTER I</span></div><h1 id="location-title">The Crown<br><em>Citadel.</em></h1><div class="caption-bottom"><span id="location-cn">王冠主堡 · 最后的王国</span><button id="story-toggle">阅读此地的故事 ${icon("chevron")}</button></div></div>
 <div class="scene-coordinate"><span>✧</span><div>THE EDGE OF THE KNOWN WORLD<small>在世界尽头，守望最后的灯火。</small></div></div>
 <footer><div class="interaction-hint"><span class="mouse-icon"></span>拖动环视 <b>·</b> 滚轮缩放 <b>·</b> 右键平移</div><div class="mode-switch" role="group" aria-label="摄像机模式"><button id="cinematic" class="active" aria-pressed="true">${icon("play")}电影巡游</button><button id="explore" aria-pressed="false">${icon("compass")}自由探索</button></div><div class="footer-right"><button id="home" aria-label="返回主视角" title="返回主视角 1">${icon("back")}</button><button id="hide-ui">${icon("eye")}隐藏界面 <kbd>H</kbd></button></div></footer>
 <div id="story" class="story-panel" hidden><button id="story-close" class="icon-button" aria-label="关闭故事">${icon("close")}</button><div class="eyebrow">CHRONICLES OF THE KINGDOM</div><h2 id="story-name"></h2><span id="story-era"></span><p id="story-text"></p><button id="story-home" class="text-button">返回主视角 ↗</button></div>
 <div id="map" class="map-panel" hidden><div class="map-head"><div><div class="eyebrow">CARTOGRAPHY · 612</div><h2>北境王国舆图</h2></div><button id="map-close" class="icon-button" aria-label="关闭地图">${icon("close")}</button></div><svg viewBox="0 0 500 420" role="img" aria-label="王国区域示意图"><defs><pattern id="grid" width="25" height="25" patternUnits="userSpaceOnUse"><path d="M25 0H0V25" fill="none" stroke="#a68d61" stroke-opacity=".08"/></pattern></defs><rect width="500" height="420" fill="url(#grid)"/><path d="m50 90 25-45 82-25 53 40-5 50-45 20-79-7zm173 10 79-14 67 48 10 62-30 40-97 7-52-50zM60 260l52-40 62 35 10 73-65 32-50-29z" fill="#8b825a" fill-opacity=".12" stroke="#aa9169" stroke-opacity=".45"/><path d="M283 231v78l-109 1" stroke="#aa9169" stroke-dasharray="4 5" fill="none"/><text x="380" y="340" fill="#8a8c86" font-size="14" font-family="Georgia">FROSTWING</text><text x="396" y="360" fill="#666e6c" font-size="10">THE HIGH PASSES</text><text x="450" y="40" fill="#b9a77e" font-size="18">N ↑</text></svg><div class="map-markers">${LOCATIONS.map(
   (l, i) => {
     const xy = [
       [59, 36],
       [50, 31],
       [58, 52],
       [70, 43],
       [67, 50],
       [24, 68],
       [12, 15],
       [76, 58],
       [24, 17],
       [43, 46],
       [43, 9],
       [68, 22],
     ][i];
     return `<button data-map-location="${l.id}" style="left:${xy[0]}%;top:${xy[1]}%" title="${l.name}" aria-label="${l.name}">${i + 1}</button>`;
   },
 ).join("")}</div><p>点击地标，前往相应区域</p></div>
 <div id="toast" role="status"></div><div id="tooltip"></div></div><button id="restore-ui" hidden aria-label="显示界面">显示界面 <kbd>H</kbd></button>`;
  }
  bind() {
    const $ = (s) => document.querySelector(s),
      all = (s) => document.querySelectorAll(s);
    all("[data-location]").forEach(
      (b) => (b.onclick = () => this.h.location(b.dataset.location)),
    );
    all("[data-map-location]").forEach(
      (b) =>
        (b.onclick = () => {
          this.h.location(b.dataset.mapLocation);
          $("#map").hidden = true;
        }),
    );
    $(".brand").onclick = (e) => {
      e.preventDefault();
      this.h.location("citadel");
    };
    all("[data-time]").forEach(
      (b) => (b.onclick = () => this.setTime(b.dataset.time)),
    );
    all("[data-weather]").forEach(
      (b) => (b.onclick = () => this.setWeather(b.dataset.weather)),
    );
    $("#env-toggle").onclick = () => {
      const collapsed = $("#env-body").hidden;
      $("#env-body").hidden = !collapsed;
      $("#env-toggle").setAttribute("aria-expanded", String(collapsed));
      $("#env-chevron").textContent = collapsed ? "−" : "+";
    };
    $("#cinematic").onclick = () => this.h.mode("cinematic");
    $("#explore").onclick = () => this.h.mode("explore");
    $("#home").onclick = () => this.h.location("citadel");
    $("#hide-ui").onclick = () => this.toggleUI();
    $("#restore-ui").onclick = () => this.toggleUI();
    $("#sound").onclick = () => this.h.sound();
    $("#fullscreen").onclick = async () => {
      try {
        if (!document.fullscreenElement)
          await document.documentElement.requestFullscreen();
        else await document.exitFullscreen();
      } catch {
        this.toast("此窗口不支持全屏，请在独立浏览器中打开。");
      }
    };
    $("#quality").onchange = (e) => this.h.quality(e.target.value);
    $("#bloom").oninput = (e) => this.h.bloom(+e.target.value);
    $("#ao").onchange = (e) => this.h.ao(e.target.checked);
    $("#focus").onchange = (e) => this.h.focus(e.target.checked);
    all("[data-volume]").forEach(
      (e) => (e.oninput = () => this.h.volume(e.dataset.volume, +e.value)),
    );
    $("#bell").onclick = () => this.h.bell();
    $("#story-toggle").onclick = () => {
      $("#story").hidden = !$("#story").hidden;
      $("#map").hidden = true;
    };
    $("#story-close").onclick = () => ($("#story").hidden = true);
    $("#story-home").onclick = () => {
      this.h.location("citadel");
      $("#story").hidden = true;
    };
    $("#map-toggle").onclick = () => {
      $("#map").hidden = !$("#map").hidden;
      $("#story").hidden = true;
    };
    $("#map-close").onclick = () => ($("#map").hidden = true);
    this.keydown = (e) => {
      if (
        ["INPUT", "SELECT", "TEXTAREA"].includes(document.activeElement.tagName)
      )
        return;
      if (e.code === "KeyH") this.toggleUI();
      if (e.code === "Escape") {
        this.toggleUI(false);
        $("#map").hidden = true;
        $("#story").hidden = true;
      }
      if (e.code === "KeyC") this.h.mode("cinematic");
      if (e.code === "Digit1") this.h.location("citadel");
      if (e.code === "KeyM") this.h.sound();
    };
    window.addEventListener("keydown", this.keydown);
    this.select(LOCATIONS[0]);
    if (innerWidth < 600) {
      document.getElementById("env-body").hidden = true;
      document
        .getElementById("env-toggle")
        .setAttribute("aria-expanded", "false");
      document.getElementById("env-chevron").textContent = "+";
    }
  }
  setTime(key) {
    if (!Object.hasOwn(TIMES, key)) return;
    this.activate(
      "[data-time]",
      document.querySelector(`[data-time="${key}"]`),
    );
    this.h.time(key);
    document.getElementById("status-time").textContent =
      `${TIMES[key].hour} · ${TIMES[key].name}`;
  }
  setWeather(key) {
    if (!Object.hasOwn(WEATHERS, key)) return;
    this.activate(
      "[data-weather]",
      document.querySelector(`[data-weather="${key}"]`),
    );
    this.h.weather(key);
    document.getElementById("status-weather").textContent = WEATHERS[key].name;
  }
  activate(selector, chosen) {
    document.querySelectorAll(selector).forEach((b) => {
      b.classList.toggle("active", b === chosen);
      b.setAttribute("aria-pressed", String(b === chosen));
    });
  }
  progress(n, msg) {
    document.getElementById("load-bar").style.width = n + "%";
    document.getElementById("load-message").textContent = msg;
  }
  ready() {
    this.progress(100, "王国已苏醒");
    setTimeout(
      () => document.getElementById("loading").classList.add("finished"),
      500,
    );
  }
  select(l) {
    this.selected = l;
    this.activate(
      "[data-location]",
      document.querySelector(`[data-location="${l.id}"]`),
    );
    document.getElementById("location-tag").textContent = l.tag;
    document.getElementById("location-number").textContent =
      "CHAPTER " +
      [
        "I",
        "II",
        "III",
        "IV",
        "V",
        "VI",
        "VII",
        "VIII",
        "IX",
        "X",
        "XI",
        "XII",
      ][LOCATIONS.indexOf(l)];
    document.getElementById("location-title").innerHTML =
      l.id === "citadel"
        ? "The Crown<br><em>Citadel.</em>"
        : l.en.split(" ").slice(0, -1).join(" ") +
          "<br><em>" +
          l.en.split(" ").at(-1) +
          ".</em>";
    document.getElementById("location-cn").textContent =
      l.name + " · 最后的王国";
    document.getElementById("story-name").textContent = l.name;
    document.getElementById("story-era").textContent = l.era;
    document.getElementById("story-text").textContent = l.story;
  }
  mode(mode) {
    for (const k of ["cinematic", "explore"]) {
      const b = document.getElementById(k);
      b.classList.toggle("active", k === mode);
      b.setAttribute("aria-pressed", String(k === mode));
    }
  }
  sound(on) {
    const b = document.getElementById("sound");
    b.classList.toggle("active", on);
    b.setAttribute("aria-pressed", String(on));
    b.setAttribute("aria-label", on ? "静音" : "开启声音");
    this.toast(on ? "环境声已开启" : "环境声已静音");
  }
  toggleUI(value = !this.hidden) {
    this.hidden = value;
    document.getElementById("interface").classList.toggle("ui-hidden", value);
    document.getElementById("restore-ui").hidden = !value;
  }
  toast(msg) {
    const e = document.getElementById("toast");
    e.textContent = msg;
    e.classList.add("show");
    clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => e.classList.remove("show"), 2800);
  }
  dispose() {
    clearTimeout(this.toastTimer);
    window.removeEventListener("keydown", this.keydown);
  }
}
