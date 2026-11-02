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

    } else if (this.soundPack === 'typewriter') {
      if (isSpace) {
        // 1. Carriage mechanism click
        const osc = this.audioCtx.createOscillator();
        const gain = this.audioCtx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(320, t);
        osc.frequency.exponentialRampToValueAtTime(80, t + 0.06);
        gain.gain.setValueAtTime(this.volume * 0.45, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.06);
        osc.connect(gain);
        gain.connect(this.audioCtx.destination);
        osc.start(t);
        osc.stop(t + 0.06);

        // 2. Classic Vintage Typewriter Bell "DING!"
        const bell = this.audioCtx.createOscillator();
        const bellGain = this.audioCtx.createGain();
        bell.type = 'sine';
        bell.frequency.setValueAtTime(2637, t); // E7 bright brass bell
        bellGain.gain.setValueAtTime(this.volume * 0.4, t);
        bellGain.gain.exponentialRampToValueAtTime(0.0001, t + 0.7);
        bell.connect(bellGain);
        bellGain.connect(this.audioCtx.destination);
        bell.start(t);
        bell.stop(t + 0.7);

        // Bell overtone for rich metallic resonance
        const bellHarmonic = this.audioCtx.createOscillator();
        const harmGain = this.audioCtx.createGain();
        bellHarmonic.type = 'sine';
        bellHarmonic.frequency.setValueAtTime(5274, t); // E8 harmonic overtone
        harmGain.gain.setValueAtTime(this.volume * 0.18, t);
        harmGain.gain.exponentialRampToValueAtTime(0.0001, t + 0.45);
        bellHarmonic.connect(harmGain);
        harmGain.connect(this.audioCtx.destination);
        bellHarmonic.start(t);
        bellHarmonic.stop(t + 0.45);
      } else {
        // Sharp metallic typewriter key strike
        const osc = this.audioCtx.createOscillator();
        const gain = this.audioCtx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(750 + Math.random() * 160, t);
        osc.frequency.exponentialRampToValueAtTime(100, t + 0.035);
        gain.gain.setValueAtTime(this.volume * 0.32, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.035);
        osc.connect(gain);
        gain.connect(this.audioCtx.destination);
        osc.start(t);
        osc.stop(t + 0.035);

        // Metallic clatter overtone
        const click = this.audioCtx.createOscillator();
        const clickGain = this.audioCtx.createGain();
        click.type = 'triangle';
        click.frequency.setValueAtTime(1500 + Math.random() * 300, t);
        click.frequency.exponentialRampToValueAtTime(250, t + 0.025);
        clickGain.gain.setValueAtTime(this.volume * 0.25, t);
        clickGain.gain.exponentialRampToValueAtTime(0.001, t + 0.025);
        click.connect(clickGain);
        clickGain.connect(this.audioCtx.destination);
        click.start(t);
        click.stop(t + 0.025);
      }
    }
  }

  // Lobbyga yangi o'yinchi kirganda yoqimli jarang tovushi
  playChime() {
    this.init();
    if (!this.audioCtx) return;
    try {
      const t = this.audioCtx.currentTime;
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, t); // D5
      osc.frequency.exponentialRampToValueAtTime(880, t + 0.15); // A5

      gain.gain.setValueAtTime(this.volume * 0.35, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);

      osc.connect(gain);
      gain.connect(this.audioCtx.destination);
      osc.start(t);
      osc.stop(t + 0.35);
    } catch (e) {}
  }

  // Ortga hisoblash tovushi (3.. 2.. 1.. START)
  playBeep(isStart = false) {
    this.init();
    if (!this.audioCtx) return;
    try {
      const t = this.audioCtx.currentTime;
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();
      osc.type = isStart ? 'triangle' : 'sine';
      const freq = isStart ? 880 : 440;
      osc.frequency.setValueAtTime(freq, t);

      gain.gain.setValueAtTime(this.volume * (isStart ? 0.45 : 0.3), t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + (isStart ? 0.3 : 0.15));

      osc.connect(gain);
      gain.connect(this.audioCtx.destination);
      osc.start(t);
      osc.stop(t + (isStart ? 0.3 : 0.15));
    } catch (e) {}
  }

  // G'alaba shohsupasi musiqa jarangi
  playVictory() {
    this.init();
    if (!this.audioCtx) return;
    try {
      const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
      notes.forEach((freq, i) => {
        const t = this.audioCtx.currentTime + i * 0.12;
        const osc = this.audioCtx.createOscillator();
        const gain = this.audioCtx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, t);

        gain.gain.setValueAtTime(this.volume * 0.35, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.25);

        osc.connect(gain);
        gain.connect(this.audioCtx.destination);
        osc.start(t);
        osc.stop(t + 0.25);
      });
    } catch (e) {}
  }
}

window.soundManager = new SoundManager();
