export class AudioManager {
  constructor() {
    this.context = null;
    this.enabled = false;
    this.volumes = {
      master: 0.45,
      ice: 0.45,
      wind: 0.25,
      rain: 0.4,
      bell: 0.3,
      music: 0.12,
    };
    this.nodes = {};
    this.lastBell = 0;
  }
  async toggle() {
    if (!this.context) this.init();
    await this.context.resume();
    this.enabled = !this.enabled;
    this.master.gain.setTargetAtTime(
      this.enabled ? this.volumes.master : 0,
      this.context.currentTime,
      0.5,
    );
    return this.enabled;
  }
  init() {
    const A = window.AudioContext || window.webkitAudioContext;
    if (!A) throw new Error("此浏览器不支持 Web Audio");
    this.context = new A();
    const c = this.context;
    this.master = c.createGain();
    this.master.gain.value = 0;
    this.master.connect(c.destination);
    const buffer = c.createBuffer(1, c.sampleRate * 5, c.sampleRate),
      d = buffer.getChannelData(0);
    let brown = 0;
    for (let i = 0; i < d.length; i++) {
      brown = (brown + (Math.random() * 2 - 1) * 0.025) / 1.025;
      d[i] = brown * 5;
    }
    for (const [key, freq] of [
      ["ice", 105],
      ["wind", 220],
      ["rain", 2700],
    ]) {
      const src = c.createBufferSource();
      src.buffer = buffer;
      src.loop = true;
      const filter = c.createBiquadFilter();
      filter.type = key === "wind" ? "bandpass" : "lowpass";
      filter.frequency.value = freq;
      filter.Q.value = 0.45;
      const gain = c.createGain();
      gain.gain.value = 0;
      src.connect(filter).connect(gain).connect(this.master);
      src.start(Math.random());
      this.nodes[key] = { src, filter, gain };
    }
    const musicGain = c.createGain();
    musicGain.gain.value = this.volumes.music * 0.08;
    musicGain.connect(this.master);
    this.nodes.music = { gain: musicGain };
    for (const hz of [65.406, 98, 130.812, 155.56]) {
      const osc = c.createOscillator();
      osc.type = "sine";
      osc.frequency.value = hz;
      osc.connect(musicGain);
      osc.start();
    }
  }
  setVolume(key, value) {
    this.volumes[key] = value;
    if (!this.context) return;
    if (key === "master")
      this.master.gain.setTargetAtTime(
        this.enabled ? value : 0,
        this.context.currentTime,
        0.15,
      );
    if (key === "music")
      this.nodes.music.gain.gain.setTargetAtTime(
        value * 0.08,
        this.context.currentTime,
        0.3,
      );
  }
  bell() {
    if (!this.enabled) return;
    const c = this.context;
    for (const [f, a, d] of [
      [146.83, 0.3, 7],
      [293.66, 0.15, 5],
      [405.4, 0.06, 4],
      [588.8, 0.035, 3],
    ]) {
      const o = c.createOscillator(),
        g = c.createGain();
      o.frequency.value = f;
      g.gain.setValueAtTime(0.0001, c.currentTime);
      g.gain.exponentialRampToValueAtTime(
        a * this.volumes.bell,
        c.currentTime + 0.02,
      );
      g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + d);
      o.connect(g).connect(this.master);
      o.start();
      o.stop(c.currentTime + d);
    }
  }
  thunder() {
    if (!this.enabled) return;
    const c = this.context,
      src = c.createBufferSource();
    src.buffer = this.nodes.rain.src.buffer;
    const f = c.createBiquadFilter(),
      g = c.createGain();
    f.type = "lowpass";
    f.frequency.value = 160;
    g.gain.setValueAtTime(0.0001, c.currentTime);
    g.gain.exponentialRampToValueAtTime(
      0.8 * this.volumes.rain + 0.01,
      c.currentTime + 0.25,
    );
    g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + 4.5);
    src.connect(f).connect(g).connect(this.master);
    src.start();
    src.stop(c.currentTime + 5);
  }
  update(t, rain) {
    if (!this.context) return;
    const now = this.context.currentTime;
    this.nodes.ice.gain.gain.setTargetAtTime(
      this.volumes.ice * (0.15 + 0.18 * Math.max(0,Math.sin(t*.19)+.45*Math.sin(t*.51)-.50)),
      now,
      0.1,
    );
    this.nodes.wind.gain.gain.setTargetAtTime(
      this.volumes.wind * (0.14 + 0.06 * Math.sin(t * 0.13)),
      now,
      0.1,
    );
    this.nodes.rain.gain.gain.setTargetAtTime(
      this.volumes.rain * rain * 0.65,
      now,
      0.2,
    );
    if (t - this.lastBell > 47) {
      this.lastBell = t;
      this.bell();
    }
  }
  dispose() {
    this.context?.close();
  }
}
