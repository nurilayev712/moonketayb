// MonkeyType Sound System: Web Audio API Sintezi
class SoundManager {
  constructor() {
    this.audioCtx = null;
    this.soundPack = localStorage.getItem('mkt_sound_pack') || 'thock'; // 'thock', 'click', 'pop', 'off'
    this.volume = 0.25;
  }

  init() {
    if (!this.audioCtx) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (AudioContextClass) {
        this.audioCtx = new AudioContextClass();
      }
    }
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
  }

  setSoundPack(pack) {
    this.soundPack = pack;
    localStorage.setItem('mkt_sound_pack', pack);
  }

  playKey(isError = false, isSpace = false) {
    if (this.soundPack === 'off') return;
    this.init();
    if (!this.audioCtx) return;

    const t = this.audioCtx.currentTime;

    if (isError) {
      // Xato tovushi
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(120, t);
      osc.frequency.exponentialRampToValueAtTime(60, t + 0.08);

      gain.gain.setValueAtTime(this.volume * 0.4, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.08);

      osc.connect(gain);
      gain.connect(this.audioCtx.destination);
      osc.start(t);
      osc.stop(t + 0.08);
      return;
    }

    if (this.soundPack === 'thock') {
      // Thock tovushi (Deep switch)
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();
      const baseFreq = isSpace ? 280 : 380 + Math.random() * 80;

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(baseFreq, t);
      osc.frequency.exponentialRampToValueAtTime(60, t + 0.05);

      gain.gain.setValueAtTime(this.volume * (isSpace ? 0.35 : 0.28), t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.05);

      osc.connect(gain);
      gain.connect(this.audioCtx.destination);
      osc.start(t);
      osc.stop(t + 0.05);

    } else if (this.soundPack === 'click') {
      // Cherry MX Blue (Clicky switch)
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(1800 + Math.random() * 400, t);
      osc.frequency.exponentialRampToValueAtTime(400, t + 0.02);

      gain.gain.setValueAtTime(this.volume * 0.18, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.02);

      osc.connect(gain);
      gain.connect(this.audioCtx.destination);
      osc.start(t);
      osc.stop(t + 0.02);

    } else if (this.soundPack === 'pop') {
      // Bubble Pop
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(500 + Math.random() * 200, t);
      osc.frequency.exponentialRampToValueAtTime(1200, t + 0.03);

      gain.gain.setValueAtTime(this.volume * 0.3, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.03);

      osc.connect(gain);
      gain.connect(this.audioCtx.destination);
      osc.start(t);
      osc.stop(t + 0.03);
    }
  }
}

window.soundManager = new SoundManager();
