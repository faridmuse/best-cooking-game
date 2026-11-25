// Synthesised sound, WebAudio only — no audio files, nothing fetched. Every effect
// is a few oscillators or a burst of filtered noise, built on first use.
export function createAudio() {
  let context = null;
  let muted = false;
  let sizzle = null;

  function ensure() {
    if (context) return context;
    try {
      const Ctor = window.AudioContext || window.webkitAudioContext;
      if (!Ctor) return null;
      context = new Ctor();
    } catch {
      context = null;
    }
    return context;
  }

  function tone(freq, seconds, type = 'sine', gain = 0.12, when = 0) {
    const ctx = ensure();
    if (!ctx || muted) return;
    const start = ctx.currentTime + when;
    const osc = ctx.createOscillator();
    const amp = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, start);
    amp.gain.setValueAtTime(0, start);
    amp.gain.linearRampToValueAtTime(gain, start + 0.01);
    amp.gain.exponentialRampToValueAtTime(0.0001, start + seconds);
    osc.connect(amp).connect(ctx.destination);
    osc.start(start);
    osc.stop(start + seconds + 0.05);
  }

  function noise(seconds, filterFreq, gain = 0.1, when = 0) {
    const ctx = ensure();
    if (!ctx || muted) return;
    const start = ctx.currentTime + when;
    const length = Math.max(1, Math.floor(ctx.sampleRate * seconds));
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / length);
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = filterFreq;
    const amp = ctx.createGain();
    amp.gain.value = gain;
    source.connect(filter).connect(amp).connect(ctx.destination);
    source.start(start);
  }

  return {
    unlock() { ensure(); },
    toggleMute() {
      muted = !muted;
      if (muted) this.stopSizzle();
      return muted;
    },
    get muted() { return muted; },
    pickup() { tone(520, 0.09, 'triangle', 0.1); tone(780, 0.08, 'triangle', 0.07, 0.04); },
    place() { tone(220, 0.08, 'sine', 0.12); noise(0.05, 900, 0.08); },
    chop() { noise(0.07, 2400, 0.16); tone(180, 0.05, 'square', 0.05); },
    sizzleStart() {
      const ctx = ensure();
      if (!ctx || muted || sizzle) return;
      const length = ctx.sampleRate;
      const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < length; i += 1) data[i] = Math.random() * 2 - 1;
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.loop = true;
      const filter = ctx.createBiquadFilter();
      filter.type = 'highpass';
      filter.frequency.value = 3200;
      const amp = ctx.createGain();
      amp.gain.value = 0.035;
      source.connect(filter).connect(amp).connect(ctx.destination);
      source.start();
      sizzle = { source, amp };
    },
    stopSizzle() {
      if (!sizzle) return;
      try { sizzle.source.stop(); } catch { /* already stopped */ }
      sizzle = null;
    },
    ding() { tone(880, 0.16, 'sine', 0.12); tone(1318, 0.22, 'sine', 0.1, 0.09); },
    serve() {
      tone(523, 0.12, 'triangle', 0.12);
      tone(659, 0.12, 'triangle', 0.12, 0.08);
      tone(784, 0.2, 'triangle', 0.14, 0.16);
    },
    fail() { tone(160, 0.25, 'sawtooth', 0.08); tone(110, 0.3, 'sawtooth', 0.08, 0.1); },
    tick() { tone(980, 0.05, 'square', 0.05); },
    expired() { tone(392, 0.2, 'triangle', 0.1); tone(311, 0.3, 'triangle', 0.1, 0.14); },
    click() { tone(660, 0.06, 'triangle', 0.08); },
  };
}
