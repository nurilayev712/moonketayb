// ====================================================
// TYPEX712 & MONKEYTYPE: KOSMIK RAKETA (ASTEROID DEFENSE) O'YINI v2.0
// Mukammallashtirilgan Kosmik Jang:
// - Vaqt rejimi (30s, 60s, 120s, cheksiz)
// - 5 turdagi toshlar: Oddiy, Tezkor kometa, Bombali klaster, Muzlatuvchi, Zirhli gigant
// - To'lqinlar tizimi (Wave progression)
// - Giper lazer va plazma overdrive (Combo boost)
// - Qalqon tiklanishi va to'liq ovoz effektlari
// ====================================================

(function() {
  class SpaceRocketGame {
    constructor() {
      this.canvas = null;
      this.ctx = null;
      this.active = false;
      this.running = false;
      this.animId = null;

      // O'yin parametrlari
      this.timeLimit = 60; // 30, 60, 120 yoki 'endless'
      this.timeRemaining = 60;
      this.lastTickTime = 0;
      this.difficulty = 'normal'; // 'easy', 'normal', 'hard', 'extreme'
      this.shields = 3;
      this.maxShields = 3;
      this.score = 0;
      this.kills = 0;
      this.combo = 1;
      this.maxCombo = 1;
      this.streakKills = 0;
      this.wave = 1;
      this.startTime = 0;
      this.totalCharsTyped = 0;
      this.totalMistakes = 0;

      // Muzlash (Freeze) effekti vaqti
      this.freezeUntil = 0;

      // Obyektlar
      this.stars = [];
      this.rocks = [];
      this.lasers = [];
      this.particles = [];
      this.floatingTexts = [];
      this.screenShake = 0;
      this.waveBanner = null; // { text, life, maxLife }

      // Raketa
      this.rocket = {
        x: 0,
        y: 0,
        angle: 0,
        targetAngle: 0,
        recoil: 0,
        width: 48,
        height: 60
      };

      // Nishonga olingan tosh
      this.targetRock = null;
      this.typedIndex = 0;

      // Tosh chiqarish taymeri
      this.lastSpawnTime = 0;
      this.spawnInterval = 2000;
      this.usedWords = new Set();

      // Audio kontekst
      this.audioCtx = null;
    }

    init() {
      this.canvas = document.getElementById('space-game-canvas');
      if (!this.canvas) return;
      this.ctx = this.canvas.getContext('2d');
      this.active = true;

      this.resizeCanvas();
      window.addEventListener('resize', () => {
        if (this.active) this.resizeCanvas();
      });

      this.initStars();
      this.setupDOM();
      this.showStartOverlay();
    }

    resizeCanvas() {
      if (!this.canvas) return;
      const wrapper = document.getElementById('space-canvas-wrapper');
      if (!wrapper) return;

      const dpr = window.devicePixelRatio || 1;
      const rect = wrapper.getBoundingClientRect();
      const containerEl = document.querySelector('.container');
      const containerWidth = containerEl ? containerEl.clientWidth - 40 : 900;
      const width = (rect.width && rect.width > 100) ? rect.width : (containerWidth > 300 ? containerWidth : 900);
      const height = 520;

      this.canvas.width = Math.floor(width * dpr);
      this.canvas.height = Math.floor(height * dpr);
      this.canvas.style.width = width + 'px';
      this.canvas.style.height = height + 'px';

      this.ctx.scale(dpr, dpr);
      this.logicalWidth = width;
      this.logicalHeight = height;

      this.rocket.x = width / 2;
      this.rocket.y = height - 55;
    }

    initStars() {
      this.stars = [];
      const count = 110;
      const w = this.logicalWidth || 900;
      const h = this.logicalHeight || 520;
      for (let i = 0; i < count; i++) {
        this.stars.push({
          x: Math.random() * w,
          y: Math.random() * h,
          size: Math.random() * 2.2 + 0.4,
          speed: Math.random() * 0.95 + 0.25,
          brightness: Math.random() * 0.8 + 0.2,
          isNebula: Math.random() < 0.08
        });
      }
    }

    setupDOM() {
      // 1. Vaqt tanlash tugmalari
      document.querySelectorAll('[data-space-time]').forEach(btn => {
        btn.addEventListener('click', () => {
          document.querySelectorAll('[data-space-time]').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          const val = btn.dataset.spaceTime;
          this.timeLimit = val === 'endless' ? 'endless' : parseInt(val, 10);
          this.timeRemaining = this.timeLimit === 'endless' ? 9999 : this.timeLimit;
          this.updateHUD();
          if (this.running) this.restart();
        });
      });

      // 2. Qiyinlik tugmalari
      document.querySelectorAll('[data-space-diff]').forEach(btn => {
        btn.addEventListener('click', () => {
          document.querySelectorAll('[data-space-diff]').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          this.difficulty = btn.dataset.spaceDiff || 'normal';
          this.updateDifficultySettings();
          if (this.running) this.restart();
        });
      });

      // Boshlash tugmasi
      const startBtn = document.getElementById('space-start-btn');
      if (startBtn) startBtn.onclick = () => this.start();

      // Qayta o'ynash tugmalari
      const retryBtn = document.getElementById('space-retry-btn');
      if (retryBtn) retryBtn.onclick = () => this.restart();

      const vicRetryBtn = document.getElementById('space-vic-retry-btn');
      if (vicRetryBtn) vicRetryBtn.onclick = () => this.restart();

      // Chiqish tugmalari
      const exitBtn = document.getElementById('space-exit-btn');
      if (exitBtn) exitBtn.onclick = () => this.exitToNormalMode();

      const vicExitBtn = document.getElementById('space-vic-exit-btn');
      if (vicExitBtn) vicExitBtn.onclick = () => this.exitToNormalMode();
    }

    updateDifficultySettings() {
      if (this.difficulty === 'easy') {
        this.spawnInterval = 2600;
      } else if (this.difficulty === 'normal') {
        this.spawnInterval = 2000;
      } else if (this.difficulty === 'hard') {
        this.spawnInterval = 1450;
      } else if (this.difficulty === 'extreme') {
        this.spawnInterval = 1050;
      }
    }

    showStartOverlay() {
      this.running = false;
      const startOverlay = document.getElementById('space-start-overlay');
      const gameoverOverlay = document.getElementById('space-gameover-overlay');
      const vicOverlay = document.getElementById('space-victory-overlay');
      if (startOverlay) startOverlay.style.display = 'flex';
      if (gameoverOverlay) gameoverOverlay.style.display = 'none';
      if (vicOverlay) vicOverlay.style.display = 'none';

      if (!this.animId) this.loop();
    }

    start() {
      const startOverlay = document.getElementById('space-start-overlay');
      const gameoverOverlay = document.getElementById('space-gameover-overlay');
      const vicOverlay = document.getElementById('space-victory-overlay');
      if (startOverlay) startOverlay.style.display = 'none';
      if (gameoverOverlay) gameoverOverlay.style.display = 'none';
      if (vicOverlay) vicOverlay.style.display = 'none';

      this.running = true;
      this.shields = this.maxShields;
      this.score = 0;
      this.kills = 0;
      this.combo = 1;
      this.maxCombo = 1;
      this.streakKills = 0;
      this.wave = 1;
      this.startTime = Date.now();
      this.lastTickTime = Date.now();
      this.timeRemaining = this.timeLimit === 'endless' ? 9999 : this.timeLimit;
      this.freezeUntil = 0;
      this.totalCharsTyped = 0;
      this.totalMistakes = 0;

      this.rocks = [];
      this.lasers = [];
      this.particles = [];
      this.floatingTexts = [];
      this.targetRock = null;
      this.typedIndex = 0;
      this.lastSpawnTime = Date.now() - 1000;
      this.usedWords.clear();

      this.updateDifficultySettings();
      this.showWaveBanner("TO'LQIN 1: JANG BOSHLANDI!");
      this.updateHUD();

      // Dastlabki toshlar
      this.spawnRock();
      if (this.difficulty === 'extreme') {
        this.spawnRock();
      }

      if (!this.animId) this.loop();
    }

    restart() {
      this.start();
    }

    stop() {
      this.active = false;
      this.running = false;
      if (this.animId) {
        cancelAnimationFrame(this.animId);
        this.animId = null;
      }
    }

    exitToNormalMode() {
      this.stop();
      if (window.state) {
        window.state.mode = 'time';
        localStorage.setItem('mk_mode', 'time');
      }
      const spaceSec = document.getElementById('space-game-section');
      if (spaceSec) spaceSec.style.display = 'none';
      const testSec = document.getElementById('test-section');
      if (testSec) testSec.style.display = 'flex';

      if (window.updateConfigUI) window.updateConfigUI();
      if (window.resetTest) window.resetTest();
    }

    showWaveBanner(text) {
      this.waveBanner = {
        text: text,
        life: 1.0,
        decay: 0.012
      };
    }

    // ----------------------------------------------------
    // Tosh (Asteroid) generatsiyasi: 5 turdagi toshlar
    // ----------------------------------------------------
    getRandomWord(minLen = 2, maxLen = 8) {
      const lang = (window.state && window.state.language) || 'english';
      let wordList = (window.WORDS && window.WORDS[lang]) || (window.WORDS && window.WORDS.english) || [];
      if (!wordList || wordList.length === 0) {
        wordList = ["space", "rocket", "meteor", "planet", "laser", "galaxy", "orbit", "speed", "stars"];
      }

      const existingStartingChars = new Set(this.rocks.map(r => r.word[0].toLowerCase()));

      for (let i = 0; i < 30; i++) {
        const candidate = wordList[Math.floor(Math.random() * wordList.length)];
        if (typeof candidate === 'string' && candidate.length >= minLen && candidate.length <= maxLen) {
          const lower = candidate.toLowerCase();
          if (!existingStartingChars.has(lower[0]) && !this.usedWords.has(lower)) {
            this.usedWords.add(lower);
            if (this.usedWords.size > 80) this.usedWords.clear();
            return lower;
          }
        }
      }

      const fallback = wordList[Math.floor(Math.random() * wordList.length)] || "rocket";
      return typeof fallback === 'string' ? fallback.toLowerCase() : "space";
    }

    spawnRock() {
      const w = this.logicalWidth || 900;
      const margin = 70;
      const x = margin + Math.random() * (w - margin * 2);
      const y = -45;

      // Tosh turini tasodifiy tanlash
      // easy: faqat oddiy va kamdan-kam kometa
      // normal: oddiy (60%), kometa (20%), bomba (10%), muz (10%)
      // hard / extreme: barcha turlar + zirhli og'ir tosh
      const randType = Math.random();
      let type = 'normal';

      if (this.difficulty === 'easy') {
        type = randType < 0.85 ? 'normal' : 'comet';
      } else if (this.difficulty === 'normal') {
        if (randType < 0.55) type = 'normal';
        else if (randType < 0.75) type = 'comet';
        else if (randType < 0.88) type = 'bomb';
        else type = 'ice';
      } else {
        // hard / extreme
        if (randType < 0.40) type = 'normal';
        else if (randType < 0.60) type = 'comet';
        else if (randType < 0.75) type = 'bomb';
        else if (randType < 0.88) type = 'ice';
        else type = 'heavy';
      }

      const word = this.getRandomWord(type === 'heavy' ? 4 : 2, type === 'heavy' ? 9 : 8);

      // Qiyinlik va to'lqinga mos tezlik
      let baseSpeed = 0.95;
      if (this.difficulty === 'easy') baseSpeed = 0.7;
      else if (this.difficulty === 'hard') baseSpeed = 1.4;
      else if (this.difficulty === 'extreme') baseSpeed = 1.85;

      // To'lqin tezlashuvi
      baseSpeed += (this.wave - 1) * 0.12;

      // Kometa bo'lsa 1.7x tezroq!
      let speed = baseSpeed + (Math.random() * 0.3 - 0.15);
      if (type === 'comet') speed *= 1.7;
      if (type === 'heavy') speed *= 0.75; // Og'ir tosh biroz sekinroq lekin massiv

      const radius = type === 'heavy' ? 44 : Math.max(26, Math.min(38, 20 + word.length * 2.2));

      // Bumpy notekis tosh polygon nuqtalari
      const vertexCount = type === 'heavy' ? 14 : 10;
      const vertices = [];
      for (let i = 0; i < vertexCount; i++) {
        const angle = (i / vertexCount) * Math.PI * 2;
        const jitter = 0.75 + Math.random() * 0.5;
        vertices.push({
          x: Math.cos(angle) * (radius * jitter),
          y: Math.sin(angle) * (radius * jitter)
        });
      }

      // Kraterlar
      const craters = [];
      const craterCount = Math.floor(Math.random() * 3) + 2;
      for (let i = 0; i < craterCount; i++) {
        const ca = Math.random() * Math.PI * 2;
        const cd = Math.random() * (radius * 0.55);
        craters.push({
          x: Math.cos(ca) * cd,
          y: Math.sin(ca) * cd,
          r: Math.random() * 5 + 3
        });
      }

      this.rocks.push({
        id: Math.random().toString(36).substr(2, 9),
        type: type,
        x: x,
        y: y,
        vx: (Math.random() - 0.5) * 0.35,
        vy: speed,
        baseVy: speed,
        radius: radius,
        vertices: vertices,
        craters: craters,
        rotation: Math.random() * Math.PI * 2,
        rotSpeed: (Math.random() - 0.5) * (type === 'comet' ? 0.04 : 0.02),
        word: word,
        shake: 0,
        // Heavy asteroid bo'lsa 2-bosqich
        hp: type === 'heavy' ? 2 : 1
      });
    }

    // ----------------------------------------------------
    // Klaviaturadan harf kiritish (Shooting & Targeting)
    // ----------------------------------------------------
    handleKey(e) {
      if (!this.active) return;

      // O'yin boshlanmagan yoki tugagan bo'lsa
      if (!this.running) {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          this.start();
          return;
        }
        if (e.key === 'Escape') {
          e.preventDefault();
          this.exitToNormalMode();
          return;
        }
        return;
      }

      if (e.key === 'Escape') {
        e.preventDefault();
        this.exitToNormalMode();
        return;
      }

      if ((e.key === 'Enter' && e.ctrlKey) || (e.key === 'r' && e.altKey)) {
        e.preventDefault();
        this.restart();
        return;
      }

      if (e.key.length !== 1 || e.ctrlKey || e.altKey || e.metaKey) return;

      const typedChar = e.key.toLowerCase();
      this.totalCharsTyped++;

      // 1. Agar birorta toshga nishon olinmagan bo'lsa
      if (!this.targetRock) {
        const matchingRocks = this.rocks.filter(r => r.word[0].toLowerCase() === typedChar);
        if (matchingRocks.length > 0) {
          // Eng yaqin (eng pastdagi) toshni tanlash
          matchingRocks.sort((a, b) => b.y - a.y);
          this.targetRock = matchingRocks[0];
          this.typedIndex = 1;

          this.fireLaser(this.targetRock);
          this.playLaserSound();

          if (this.typedIndex >= this.targetRock.word.length) {
            this.handleRockWordComplete(this.targetRock);
          }
        } else {
          // Xato harf
          this.totalMistakes++;
          this.combo = 1;
          this.streakKills = 0;
          this.updateHUD();
          this.playErrorSound();
        }
      } else {
        // 2. Tosh allaqachon nishonda bo'lsa
        const expectedChar = this.targetRock.word[this.typedIndex].toLowerCase();
        if (typedChar === expectedChar) {
          this.typedIndex++;
          this.fireLaser(this.targetRock);
          this.playLaserSound();

          if (this.typedIndex >= this.targetRock.word.length) {
            this.handleRockWordComplete(this.targetRock);
          }
        } else {
          this.targetRock.shake = 8;
          this.totalMistakes++;
          this.combo = 1;
          this.streakKills = 0;
          this.updateHUD();
          this.playErrorSound();
        }
      }
    }

    fireLaser(rock) {
      const dx = rock.x - this.rocket.x;
      const dy = rock.y - this.rocket.y;
      this.rocket.targetAngle = Math.atan2(dx, -dy);
      this.rocket.recoil = 8;

      // Combo darajasiga qarab lazer rangi va kuchi
      let laserColor = '#e2b714';
      if (this.combo >= 7) laserColor = '#c084fc'; // Plazma binafsha
      else if (this.combo >= 4) laserColor = '#38bdf8'; // Giper moviy

      const leftTipX = this.rocket.x - 14 * Math.cos(this.rocket.angle) - 10 * Math.sin(this.rocket.angle);
      const leftTipY = this.rocket.y - 14 * Math.sin(this.rocket.angle) - 10 * Math.cos(this.rocket.angle);
      const rightTipX = this.rocket.x + 14 * Math.cos(this.rocket.angle) - 10 * Math.sin(this.rocket.angle);
      const rightTipY = this.rocket.y + 14 * Math.sin(this.rocket.angle) - 10 * Math.cos(this.rocket.angle);

      [ { x: leftTipX, y: leftTipY }, { x: rightTipX, y: rightTipY } ].forEach(tip => {
        this.lasers.push({
          x: tip.x,
          y: tip.y,
          tx: rock.x,
          ty: rock.y,
          color: laserColor,
          progress: 0,
          speed: 0.22
        });
      });
    }

    handleRockWordComplete(rock) {
      if (rock.type === 'heavy' && rock.hp > 1) {
        // Og'ir toshning 1-bosqich qalqoni yorildi
        rock.hp--;
        this.createExplosion(rock.x, rock.y, rock.radius * 0.7, '#f97316');
        this.playExplosionSound();
        this.floatingTexts.push({
          text: "ZIRH YORILDI! 🛡️",
          x: rock.x,
          y: rock.y - 20,
          vy: -1.2,
          opacity: 1,
          color: '#f97316'
        });
        // 2-bosqich so'zi
        rock.word = this.getRandomWord(3, 7);
        this.typedIndex = 0;
        return;
      }

      this.destroyRock(rock);
    }

    destroyRock(rock, isChain = false) {
      const type = rock.type;
      let earnedScore = rock.word.length * 12 * this.combo;
      let expColor = '#e2b714';

      if (type === 'comet') {
        earnedScore += 50;
        expColor = '#ef4444';
      } else if (type === 'bomb') {
        earnedScore += 80;
        expColor = '#f59e0b';
      } else if (type === 'ice') {
        earnedScore += 60;
        expColor = '#38bdf8';
      } else if (type === 'heavy') {
        earnedScore += 200;
        expColor = '#a855f7';
      }

      this.createExplosion(rock.x, rock.y, rock.radius, expColor);
      this.playExplosionSound();

      this.score += earnedScore;
      this.kills++;
      this.streakKills++;

      // 10 ta tosh ketma-ket xatosiz yo'q qilinganda qalqon tiklanadi
      if (this.streakKills % 10 === 0 && this.shields < this.maxShields) {
        this.shields++;
        this.playShieldRestoreSound();
        this.floatingTexts.push({
          text: "+1 QALQON TIKLANDI! 🛡️",
          x: this.rocket.x,
          y: this.rocket.y - 40,
          vy: -1.4,
          opacity: 1,
          color: '#38bdf8'
        });
      }

      // Combo
      this.combo = Math.min(10, this.combo + 1);
      if (this.combo > this.maxCombo) this.maxCombo = this.combo;

      // Floating text
      this.floatingTexts.push({
        text: `+${earnedScore}` + (this.combo > 1 ? ` (x${this.combo})` : ''),
        x: rock.x,
        y: rock.y,
        vy: -1.3,
        opacity: 1,
        color: this.combo >= 7 ? '#c084fc' : (this.combo >= 4 ? '#38bdf8' : '#e2b714')
      });

      // Maxsus effektlar:
      // 1. Bombali tosh yo'q qilinganda (Zanjirli portlash)
      if (type === 'bomb' && !isChain) {
        this.playBombSound();
        this.screenShake = 18;
        const bombRadius = 200;
        this.floatingTexts.push({
          text: "ZANJIRLI PORTLASH! 💥",
          x: rock.x,
          y: rock.y - 25,
          vy: -1.5,
          opacity: 1,
          color: '#ef4444'
        });

        // Yaqin atrofdagi boshqa toshlarni ham yo'q qilish
        const victims = this.rocks.filter(r => r.id !== rock.id && Math.hypot(r.x - rock.x, r.y - rock.y) < bombRadius);
        victims.forEach(v => {
          setTimeout(() => {
            if (this.rocks.some(r => r.id === v.id)) {
              this.destroyRock(v, true);
            }
          }, 120);
        });
      }

      // 2. Muzli tosh yo'q qilinganda (Vaqtinchalik muzlash / sekinlashuv)
      if (type === 'ice') {
        this.freezeUntil = Date.now() + 4500; // 4.5 soniya
        this.playFreezeSound();
        this.floatingTexts.push({
          text: "MUZLASH EFFEKTI! ❄️",
          x: rock.x,
          y: rock.y - 25,
          vy: -1.5,
          opacity: 1,
          color: '#38bdf8'
        });
      }

      // Toshni o'chirish
      this.rocks = this.rocks.filter(r => r.id !== rock.id);
      if (this.targetRock && this.targetRock.id === rock.id) {
        this.targetRock = null;
        this.typedIndex = 0;
      }

      this.updateHUD();
    }

    createExplosion(x, y, radius, color = '#e2b714') {
      const particleCount = 32;
      for (let i = 0; i < particleCount; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 5.5 + 1.8;
        this.particles.push({
          x: x,
          y: y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          size: Math.random() * 4.5 + 2,
          color: Math.random() < 0.6 ? color : '#ffffff',
          life: 1,
          decay: Math.random() * 0.025 + 0.015
        });
      }

      this.particles.push({
        x: x,
        y: y,
        isRing: true,
        radius: 8,
        maxRadius: radius * 2.4,
        color: color,
        life: 1,
        decay: 0.035
      });
    }

    rockHitShield(rock) {
      this.shields--;
      this.screenShake = 20;
      this.streakKills = 0;
      this.createExplosion(rock.x, this.rocket.y - 25, rock.radius, '#ef4444');
      this.playShieldHitSound();

      if (this.targetRock && this.targetRock.id === rock.id) {
        this.targetRock = null;
        this.typedIndex = 0;
      }

      this.rocks = this.rocks.filter(r => r.id !== rock.id);
      this.combo = 1;
      this.updateHUD();

      if (this.shields <= 0) {
        this.triggerGameOver();
      }
    }

    triggerGameOver() {
      this.running = false;
      this.createExplosion(this.rocket.x, this.rocket.y, 50, '#ef4444');
      this.playGameOverSound();

      const totalSec = Math.max(1, (Date.now() - this.startTime) / 1000);
      const wpm = Math.round((this.totalCharsTyped / 5) / (totalSec / 60)) || 0;
      const totalKeys = this.totalCharsTyped + this.totalMistakes;
      const acc = totalKeys > 0 ? Math.round((this.totalCharsTyped / totalKeys) * 100) : 100;

      document.getElementById('space-final-score').textContent = this.score.toLocaleString();
      document.getElementById('space-final-kills').textContent = this.kills;
      document.getElementById('space-final-wpm').textContent = wpm;
      document.getElementById('space-final-acc').textContent = acc + '%';
      document.getElementById('space-final-combo').textContent = 'x' + this.maxCombo;

      const gameoverOverlay = document.getElementById('space-gameover-overlay');
      if (gameoverOverlay) gameoverOverlay.style.display = 'flex';
    }

    triggerVictory() {
      this.running = false;
      this.playVictorySound();

      const totalSec = Math.max(1, (Date.now() - this.startTime) / 1000);
      const wpm = Math.round((this.totalCharsTyped / 5) / (totalSec / 60)) || 0;
      const totalKeys = this.totalCharsTyped + this.totalMistakes;
      const acc = totalKeys > 0 ? Math.round((this.totalCharsTyped / totalKeys) * 100) : 100;

      // Rank bahosi (S, A, B, C)
      let rank = 'C RANK';
      let rankColor = '#9ca3af';
      if (wpm >= 70 && acc >= 96) {
        rank = 'S RANK ★★★';
        rankColor = '#e2b714';
      } else if (wpm >= 50 && acc >= 92) {
        rank = 'A RANK ★★';
        rankColor = '#38bdf8';
      } else if (wpm >= 35) {
        rank = 'B RANK ★';
        rankColor = '#a3e635';
      }

      const rankBadge = document.getElementById('space-victory-rank');
      if (rankBadge) {
        rankBadge.textContent = rank;
        rankBadge.style.color = rankColor;
        rankBadge.style.borderColor = rankColor;
      }

      document.getElementById('space-vic-score').textContent = this.score.toLocaleString();
      document.getElementById('space-vic-kills').textContent = this.kills;
      document.getElementById('space-vic-wpm').textContent = wpm;
      document.getElementById('space-vic-acc').textContent = acc + '%';
      document.getElementById('space-vic-combo').textContent = 'x' + this.maxCombo;

      const vicOverlay = document.getElementById('space-victory-overlay');
      if (vicOverlay) vicOverlay.style.display = 'flex';
    }

    updateHUD() {
      // 1. Vaqt ko'rsatkichi
      const timerValEl = document.getElementById('space-timer-val');
      if (timerValEl) {
        if (this.timeLimit === 'endless') {
          timerValEl.textContent = '♾️ cheksiz';
          timerValEl.classList.remove('time-warning');
        } else {
          timerValEl.textContent = Math.max(0, this.timeRemaining) + 's';
          if (this.timeRemaining <= 10 && this.running) {
            timerValEl.classList.add('time-warning');
          } else {
            timerValEl.classList.remove('time-warning');
          }
        }
      }

      // 2. Qalqon piktogrammalari
      for (let i = 1; i <= 3; i++) {
        const sEl = document.getElementById(`shield-${i}`);
        if (sEl) {
          sEl.style.opacity = i <= this.shields ? '1' : '0.2';
          sEl.style.filter = i <= this.shields ? 'none' : 'grayscale(1)';
        }
      }

      // 3. To'lqin (Wave)
      const waveEl = document.getElementById('space-wave-val');
      if (waveEl) waveEl.textContent = `WAVE ${this.wave}`;

      // 4. Ball, Kills, Combo
      const scoreEl = document.getElementById('space-score-val');
      if (scoreEl) scoreEl.textContent = this.score.toLocaleString();

      const killsEl = document.getElementById('space-kills-val');
      if (killsEl) killsEl.textContent = this.kills;

      const comboEl = document.getElementById('space-combo-val');
      if (comboEl) {
        comboEl.textContent = 'x' + this.combo;
        if (this.combo >= 7) comboEl.style.color = '#c084fc';
        else if (this.combo >= 4) comboEl.style.color = '#38bdf8';
        else if (this.combo > 1) comboEl.style.color = '#e2b714';
        else comboEl.style.color = 'inherit';
      }

      // 5. Jonli WPM
      if (this.running) {
        const sec = Math.max(1, (Date.now() - this.startTime) / 1000);
        const liveWpm = Math.round((this.totalCharsTyped / 5) / (sec / 60)) || 0;
        const wpmEl = document.getElementById('space-wpm-val');
        if (wpmEl) wpmEl.textContent = liveWpm;
      }
    }

    // ----------------------------------------------------
    // ASOSIY O'YIN SIKLI (GAME LOOP)
    // ----------------------------------------------------
    loop() {
      if (!this.active) return;
      this.update();
      this.render();
      this.animId = requestAnimationFrame(() => this.loop());
    }

    update() {
      const now = Date.now();
      const w = this.logicalWidth || 900;
      const h = this.logicalHeight || 520;

      // 1. Vaqt hisoblagichi (Countdown timer)
      if (this.running && this.timeLimit !== 'endless') {
        if (now - this.lastTickTime >= 1000) {
          this.timeRemaining--;
          this.lastTickTime = now;

          if (this.timeRemaining <= 5 && this.timeRemaining > 0) {
            this.playTimerTick();
          }

          if (this.timeRemaining <= 0) {
            this.timeRemaining = 0;
            this.updateHUD();
            this.triggerVictory();
            return;
          }
        }
      }

      // 2. To'lqin oshishi (Har 15 soniyada yoki har 8 killda)
      if (this.running) {
        const newWave = Math.floor(this.kills / 8) + 1;
        if (newWave > this.wave) {
          this.wave = newWave;
          this.showWaveBanner(`TO'LQIN ${this.wave}: TEZLIK OSHDI!`);
        }
      }

      // 3. Yulduzlar harakati
      const isFrozen = now < this.freezeUntil;
      const starSpeedMul = this.running ? (1 + (this.combo - 1) * 0.12) : 0.6;
      this.stars.forEach(s => {
        s.y += s.speed * starSpeedMul;
        if (s.y > h) {
          s.y = 0;
          s.x = Math.random() * w;
        }
      });

      // 4. Ekran silkinishi
      if (this.screenShake > 0) {
        this.screenShake *= 0.88;
        if (this.screenShake < 0.3) this.screenShake = 0;
      }

      // 5. Raketa nishonga burilishi
      if (this.targetRock) {
        const dx = this.targetRock.x - this.rocket.x;
        const dy = this.targetRock.y - this.rocket.y;
        this.rocket.targetAngle = Math.atan2(dx, -dy);
      } else {
        this.rocket.targetAngle = 0;
      }
      this.rocket.angle += (this.rocket.targetAngle - this.rocket.angle) * 0.22;

      if (this.rocket.recoil > 0) {
        this.rocket.recoil *= 0.84;
      }

      // 6. To'lqin banneri
      if (this.waveBanner) {
        this.waveBanner.life -= this.waveBanner.decay;
        if (this.waveBanner.life <= 0) this.waveBanner = null;
      }

      if (!this.running) return;

      // 7. Yangi tosh chiqarish
      if (now - this.lastSpawnTime > this.spawnInterval) {
        let maxRocks = 4;
        if (this.difficulty === 'easy') maxRocks = 3;
        else if (this.difficulty === 'hard') maxRocks = 6;
        else if (this.difficulty === 'extreme') maxRocks = 8;

        if (this.rocks.length < maxRocks) {
          this.spawnRock();
          // Ekstremal rejimda birdaniga 2 ta tosh chiqishi mumkin
          if (this.difficulty === 'extreme' && Math.random() < 0.4 && this.rocks.length < maxRocks) {
            this.spawnRock();
          }
          this.lastSpawnTime = now;
        }
      }

      // 8. Toshlar harakati
      const shieldY = this.rocket.y - 25;
      this.rocks.forEach(rock => {
        // Muzlagan bo'lsa tezlik 70% kamayadi
        const speedMul = isFrozen ? 0.3 : 1.0;
        rock.x += rock.vx * speedMul;
        rock.y += rock.vy * speedMul;
        rock.rotation += rock.rotSpeed * speedMul;

        if (rock.shake > 0) rock.shake *= 0.82;

        // Kometa bo'lsa olovli zarrachalar dumi chiqarish
        if (rock.type === 'comet' && Math.random() < 0.8) {
          this.particles.push({
            x: rock.x + (Math.random() - 0.5) * 14,
            y: rock.y - rock.radius * 0.6,
            vx: (Math.random() - 0.5) * 0.8,
            vy: -Math.random() * 2.5 - 1.2,
            size: Math.random() * 3 + 1.5,
            color: Math.random() < 0.6 ? '#ef4444' : '#f59e0b',
            life: 1,
            decay: 0.05
          });
        }

        // Qalqonga urilish
        if (rock.y + rock.radius >= shieldY) {
          this.rockHitShield(rock);
        }
      });

      // 9. Lazer nurlari harakati
      this.lasers.forEach(l => {
        l.progress += l.speed;
        l.x += (l.tx - l.x) * 0.32;
        l.y += (l.ty - l.y) * 0.32;
      });
      this.lasers = this.lasers.filter(l => l.progress < 1);

      // 10. Zarrachalar
      this.particles.forEach(p => {
        if (p.isRing) {
          p.radius += (p.maxRadius - p.radius) * 0.16;
          p.life -= p.decay;
        } else {
          p.x += p.vx;
          p.y += p.vy;
          p.vx *= 0.96;
          p.vy *= 0.96;
          p.life -= p.decay;
        }
      });
      this.particles = this.particles.filter(p => p.life > 0);

      // 11. Suzuvchi yozuvlar
      this.floatingTexts.forEach(ft => {
        ft.y += ft.vy;
        ft.opacity -= 0.02;
      });
      this.floatingTexts = this.floatingTexts.filter(ft => ft.opacity > 0);

      this.updateHUD();
    }

    render() {
      const ctx = this.ctx;
      const w = this.logicalWidth || 900;
      const h = this.logicalHeight || 520;

      ctx.save();
      ctx.clearRect(0, 0, w, h);

      if (this.screenShake > 0) {
        const ox = (Math.random() - 0.5) * this.screenShake;
        const oy = (Math.random() - 0.5) * this.screenShake;
        ctx.translate(ox, oy);
      }

      // Fon rangi va tumanlik
      const isFrozen = Date.now() < this.freezeUntil;
      const bgGrad = ctx.createLinearGradient(0, 0, 0, h);
      if (isFrozen) {
        bgGrad.addColorStop(0, '#061325');
        bgGrad.addColorStop(1, '#0c2238');
      } else {
        bgGrad.addColorStop(0, '#0a0d14');
        bgGrad.addColorStop(1, '#131722');
      }
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, w, h);

      // 1. Yulduzlar
      this.stars.forEach(s => {
        ctx.fillStyle = s.isNebula ? 'rgba(56, 189, 248, 0.15)' : `rgba(255, 255, 255, ${s.brightness})`;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.isNebula ? s.size * 3.5 : s.size, 0, Math.PI * 2);
        ctx.fill();
      });

      // 2. Qalqon to'sig'i
      if (this.shields > 0) {
        ctx.save();
        const shieldAlpha = 0.25 + (this.shields / this.maxShields) * 0.3 + 0.12 * Math.sin(Date.now() / 220);
        ctx.strokeStyle = `rgba(56, 189, 248, ${shieldAlpha})`;
        ctx.lineWidth = 2.5;
        ctx.setLineDash([10, 8]);
        ctx.beginPath();
        ctx.moveTo(30, this.rocket.y - 25);
        ctx.lineTo(w - 30, this.rocket.y - 25);
        ctx.stroke();
        ctx.restore();
      }

      // 3. Lazer nurlari
      this.lasers.forEach(l => {
        ctx.save();
        ctx.strokeStyle = l.color;
        ctx.shadowColor = l.color;
        ctx.shadowBlur = 14;
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(l.x, l.y);
        ctx.lineTo(l.tx, l.ty);
        ctx.stroke();
        ctx.restore();
      });

      // 4. Toshlar va so'zlar
      this.rocks.forEach(rock => {
        this.renderRock(ctx, rock);
      });

      // 5. Portlash zarrachalari
      this.particles.forEach(p => {
        ctx.save();
        if (p.isRing) {
          ctx.strokeStyle = p.color;
          ctx.globalAlpha = Math.max(0, p.life);
          ctx.lineWidth = 3.5;
          ctx.shadowColor = p.color;
          ctx.shadowBlur = 12;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
          ctx.stroke();
        } else {
          ctx.fillStyle = p.color;
          ctx.globalAlpha = Math.max(0, p.life);
          ctx.shadowColor = p.color;
          ctx.shadowBlur = 8;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      });

      // 6. Suzuvchi ball matnlari
      this.floatingTexts.forEach(ft => {
        ctx.save();
        ctx.font = 'bold 15px "JetBrains Mono", monospace';
        ctx.fillStyle = ft.color;
        ctx.globalAlpha = Math.max(0, ft.opacity);
        ctx.shadowColor = ft.color;
        ctx.shadowBlur = 10;
        ctx.textAlign = 'center';
        ctx.fillText(ft.text, ft.x, ft.y);
        ctx.restore();
      });

      // 7. To'lqin banneri
      if (this.waveBanner) {
        ctx.save();
        ctx.font = 'bold 24px "JetBrains Mono", monospace';
        ctx.fillStyle = '#ffffff';
        ctx.shadowColor = '#e2b714';
        ctx.shadowBlur = 20;
        ctx.globalAlpha = Math.min(1, this.waveBanner.life * 1.5);
        ctx.textAlign = 'center';
        ctx.fillText(this.waveBanner.text, w / 2, 70);
        ctx.restore();
      }

      // 8. Raketa
      this.renderRocket(ctx);

      ctx.restore();
    }

    renderRock(ctx, rock) {
      ctx.save();
      const shakeX = rock.shake > 0 ? (Math.random() - 0.5) * rock.shake : 0;
      ctx.translate(rock.x + shakeX, rock.y);
      ctx.rotate(rock.rotation);

      const isTarget = this.targetRock && this.targetRock.id === rock.id;

      // Tosh turiga qarab ranglar
      let strokeColor = 'rgba(255, 255, 255, 0.18)';
      let fillColor1 = '#27292f';
      let fillColor2 = '#18191d';

      if (rock.type === 'comet') {
        strokeColor = isTarget ? '#ef4444' : 'rgba(239, 68, 68, 0.5)';
        fillColor1 = '#451a1a';
        fillColor2 = '#2a1111';
      } else if (rock.type === 'bomb') {
        strokeColor = isTarget ? '#f59e0b' : 'rgba(245, 158, 11, 0.5)';
        fillColor1 = '#422006';
        fillColor2 = '#271302';
      } else if (rock.type === 'ice') {
        strokeColor = isTarget ? '#38bdf8' : 'rgba(56, 189, 248, 0.5)';
        fillColor1 = '#0c2e4e';
        fillColor2 = '#081c30';
      } else if (rock.type === 'heavy') {
        strokeColor = isTarget ? '#c084fc' : 'rgba(192, 132, 252, 0.5)';
        fillColor1 = '#3b1d54';
        fillColor2 = '#230e33';
      } else if (isTarget) {
        strokeColor = '#e2b714';
        fillColor1 = '#374151';
        fillColor2 = '#1f2937';
      }

      // Bumpy polygon
      ctx.beginPath();
      rock.vertices.forEach((v, idx) => {
        if (idx === 0) ctx.moveTo(v.x, v.y);
        else ctx.lineTo(v.x, v.y);
      });
      ctx.closePath();

      const rockGrad = ctx.createRadialGradient(-rock.radius * 0.3, -rock.radius * 0.3, 2, 0, 0, rock.radius);
      rockGrad.addColorStop(0, fillColor1);
      rockGrad.addColorStop(1, fillColor2);
      ctx.fillStyle = rockGrad;
      ctx.fill();

      ctx.strokeStyle = strokeColor;
      ctx.lineWidth = isTarget ? 2.8 : 1.6;
      if (isTarget) {
        ctx.shadowColor = strokeColor;
        ctx.shadowBlur = 14;
      }
      ctx.stroke();

      // Kraterlar
      ctx.fillStyle = 'rgba(0, 0, 0, 0.38)';
      rock.craters.forEach(c => {
        ctx.beginPath();
        ctx.arc(c.x, c.y, c.r, 0, Math.PI * 2);
        ctx.fill();
      });

      ctx.restore();

      // ----------------------------------------------------
      // So'z kapsulasi va maxsus belgi
      // ----------------------------------------------------
      ctx.save();
      ctx.translate(rock.x + shakeX, rock.y + rock.radius + 18);

      const fontSize = 16;
      ctx.font = `bold ${fontSize}px "JetBrains Mono", monospace`;
      let typeBadge = '';
      if (rock.type === 'comet') typeBadge = '🔥 ';
      else if (rock.type === 'bomb') typeBadge = '💣 ';
      else if (rock.type === 'ice') typeBadge = '❄️ ';
      else if (rock.type === 'heavy') typeBadge = '🛡️ ';

      const fullWordText = typeBadge + rock.word;
      const totalTextWidth = ctx.measureText(fullWordText).width;
      const pillW = totalTextWidth + 20;
      const pillH = fontSize + 10;

      ctx.fillStyle = isTarget ? 'rgba(17, 24, 39, 0.96)' : 'rgba(15, 17, 21, 0.9)';
      ctx.strokeStyle = strokeColor;
      ctx.lineWidth = isTarget ? 2 : 1.2;
      if (isTarget) {
        ctx.shadowColor = strokeColor;
        ctx.shadowBlur = 12;
      }

      ctx.beginPath();
      if (ctx.roundRect) {
        ctx.roundRect(-pillW / 2, -pillH / 2, pillW, pillH, 8);
      } else {
        ctx.rect(-pillW / 2, -pillH / 2, pillW, pillH);
      }
      ctx.fill();
      ctx.stroke();

      let currentX = -totalTextWidth / 2;
      if (typeBadge) {
        ctx.fillStyle = strokeColor;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText(typeBadge, currentX, 1);
        currentX += ctx.measureText(typeBadge).width;
      }

      const word = rock.word;
      const typedLen = isTarget ? this.typedIndex : 0;
      const mainColor = getComputedStyle(document.documentElement).getPropertyValue('--main-color').trim() || '#e2b714';

      for (let i = 0; i < word.length; i++) {
        const char = word[i];
        const charW = ctx.measureText(char).width;

        if (i < typedLen) {
          ctx.fillStyle = mainColor;
          ctx.shadowColor = mainColor;
          ctx.shadowBlur = 8;
        } else if (i === typedLen && isTarget) {
          ctx.fillStyle = '#ffffff';
          ctx.shadowColor = '#ffffff';
          ctx.shadowBlur = 10;
        } else {
          ctx.fillStyle = '#6b7280';
          ctx.shadowBlur = 0;
        }

        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText(char, currentX, 1);

        if (i === typedLen && isTarget) {
          ctx.fillStyle = mainColor;
          ctx.fillRect(currentX, fontSize / 2 + 1, charW, 2);
        }

        currentX += charW;
      }

      ctx.restore();
    }

    renderRocket(ctx) {
      ctx.save();
      const r = this.rocket;
      const recoilY = r.recoil * Math.cos(r.angle);
      const recoilX = -r.recoil * Math.sin(r.angle);

      ctx.translate(r.x + recoilX, r.y + recoilY);
      ctx.rotate(r.angle);

      let mainColor = '#e2b714';
      if (this.combo >= 7) mainColor = '#c084fc';
      else if (this.combo >= 4) mainColor = '#38bdf8';

      // Dvigatel olovi
      const flameHeight = 20 + Math.random() * 14 + (this.running ? 8 : 0);
      const flameGrad = ctx.createLinearGradient(0, 22, 0, 22 + flameHeight);
      flameGrad.addColorStop(0, '#fef08a');
      flameGrad.addColorStop(0.3, '#f59e0b');
      flameGrad.addColorStop(0.8, '#ef4444');
      flameGrad.addColorStop(1, 'rgba(239, 68, 68, 0)');

      ctx.fillStyle = flameGrad;
      ctx.beginPath();
      ctx.moveTo(-9, 22);
      ctx.quadraticCurveTo(-14, 22 + flameHeight * 0.6, 0, 22 + flameHeight);
      ctx.quadraticCurveTo(14, 22 + flameHeight * 0.6, 9, 22);
      ctx.closePath();
      ctx.fill();

      // Qanotlar va korpus
      ctx.fillStyle = '#1e2430';
      ctx.strokeStyle = mainColor;
      ctx.lineWidth = 2.2;
      ctx.shadowColor = mainColor;
      ctx.shadowBlur = 12;

      ctx.beginPath();
      ctx.moveTo(0, -32);
      ctx.lineTo(22, 20);
      ctx.lineTo(12, 16);
      ctx.lineTo(10, 24);
      ctx.lineTo(-10, 24);
      ctx.lineTo(-12, 16);
      ctx.lineTo(-22, 20);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Qanotlardagi lazer pushkalari
      ctx.fillStyle = mainColor;
      ctx.fillRect(-17, 4, 3, 14);
      ctx.fillRect(14, 4, 3, 14);

      // Kokpit shishasi
      const canopyGrad = ctx.createLinearGradient(0, -18, 0, 4);
      canopyGrad.addColorStop(0, '#38bdf8');
      canopyGrad.addColorStop(1, '#0284c7');
      ctx.fillStyle = canopyGrad;
      ctx.beginPath();
      ctx.ellipse(0, -6, 5, 12, 0, 0, Math.PI * 2);
      ctx.fill();

      // Qalqon auras
      if (this.shields > 0) {
        ctx.save();
        const pulse = 0.25 + 0.15 * Math.sin(Date.now() / 200);
        ctx.strokeStyle = `rgba(56, 189, 248, ${pulse})`;
        ctx.lineWidth = 2.5;
        ctx.shadowColor = '#38bdf8';
        ctx.shadowBlur = 14;
        ctx.beginPath();
        ctx.arc(0, -4, 38, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }

      ctx.restore();
    }

    // ----------------------------------------------------
    // Ovoz effektlari (Web Audio API sintezi)
    // ----------------------------------------------------
    getAudioCtx() {
      if (!this.audioCtx) {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (AudioCtx) this.audioCtx = new AudioCtx();
      }
      if (this.audioCtx && this.audioCtx.state === 'suspended') {
        this.audioCtx.resume();
      }
      return this.audioCtx;
    }

    playLaserSound() {
      if (window.soundManager && window.soundManager.soundPack === 'off') return;
      try {
        const ctx = this.getAudioCtx();
        if (!ctx) return;
        const t = ctx.currentTime;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(880, t);
        osc.frequency.exponentialRampToValueAtTime(220, t + 0.08);

        const vol = (window.soundManager ? window.soundManager.volume : 0.3) * 0.45;
        gain.gain.setValueAtTime(vol, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.08);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(t);
        osc.stop(t + 0.09);
      } catch (e) {}
    }

    playExplosionSound() {
      if (window.soundManager && window.soundManager.soundPack === 'off') return;
      try {
        const ctx = this.getAudioCtx();
        if (!ctx) return;
        const t = ctx.currentTime;
        const bufferSize = ctx.sampleRate * 0.35;
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
          data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (ctx.sampleRate * 0.08));
        }
        const noise = ctx.createBufferSource();
        noise.buffer = buffer;
        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(450, t);
        filter.frequency.exponentialRampToValueAtTime(70, t + 0.3);

        const gain = ctx.createGain();
        const vol = (window.soundManager ? window.soundManager.volume : 0.3) * 0.8;
        gain.gain.setValueAtTime(vol, t);
        gain.gain.exponentialRampToValueAtTime(0.01, t + 0.35);

        noise.connect(filter);
        filter.connect(gain);
        gain.connect(ctx.destination);
        noise.start(t);
      } catch (e) {}
    }

    playBombSound() {
      if (window.soundManager && window.soundManager.soundPack === 'off') return;
      try {
        const ctx = this.getAudioCtx();
        if (!ctx) return;
        const t = ctx.currentTime;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(120, t);
        osc.frequency.exponentialRampToValueAtTime(25, t + 0.5);

        const vol = (window.soundManager ? window.soundManager.volume : 0.3) * 0.95;
        gain.gain.setValueAtTime(vol, t);
        gain.gain.exponentialRampToValueAtTime(0.01, t + 0.5);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(t);
        osc.stop(t + 0.52);
      } catch (e) {}
    }

    playFreezeSound() {
      if (window.soundManager && window.soundManager.soundPack === 'off') return;
      try {
        const ctx = this.getAudioCtx();
        if (!ctx) return;
        const t = ctx.currentTime;
        [523, 659, 783, 1046].forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, t + idx * 0.06);
          gain.gain.setValueAtTime(0.2, t + idx * 0.06);
          gain.gain.exponentialRampToValueAtTime(0.01, t + (idx + 1) * 0.08);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(t + idx * 0.06);
          osc.stop(t + (idx + 1) * 0.08);
        });
      } catch (e) {}
    }

    playShieldHitSound() {
      if (window.soundManager && window.soundManager.soundPack === 'off') return;
      try {
        const ctx = this.getAudioCtx();
        if (!ctx) return;
        const t = ctx.currentTime;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(160, t);
        osc.frequency.exponentialRampToValueAtTime(40, t + 0.28);

        const vol = (window.soundManager ? window.soundManager.volume : 0.3) * 0.7;
        gain.gain.setValueAtTime(vol, t);
        gain.gain.exponentialRampToValueAtTime(0.01, t + 0.28);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(t);
        osc.stop(t + 0.29);
      } catch (e) {}
    }

    playShieldRestoreSound() {
      if (window.soundManager && window.soundManager.soundPack === 'off') return;
      try {
        const ctx = this.getAudioCtx();
        if (!ctx) return;
        const t = ctx.currentTime;
        [440, 554, 659, 880].forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, t + idx * 0.08);
          gain.gain.setValueAtTime(0.2, t + idx * 0.08);
          gain.gain.exponentialRampToValueAtTime(0.01, t + (idx + 1) * 0.1);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(t + idx * 0.08);
          osc.stop(t + (idx + 1) * 0.1);
        });
      } catch (e) {}
    }

    playTimerTick() {
      if (window.soundManager && window.soundManager.soundPack === 'off') return;
      try {
        const ctx = this.getAudioCtx();
        if (!ctx) return;
        const t = ctx.currentTime;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(950, t);
        gain.gain.setValueAtTime(0.25, t);
        gain.gain.exponentialRampToValueAtTime(0.01, t + 0.08);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(t);
        osc.stop(t + 0.09);
      } catch (e) {}
    }

    playVictorySound() {
      if (window.soundManager && window.soundManager.soundPack === 'off') return;
      try {
        const ctx = this.getAudioCtx();
        if (!ctx) return;
        const t = ctx.currentTime;
        [392, 523, 659, 783, 1046].forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(freq, t + idx * 0.12);
          gain.gain.setValueAtTime(0.25, t + idx * 0.12);
          gain.gain.exponentialRampToValueAtTime(0.01, t + (idx + 1) * 0.15);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(t + idx * 0.12);
          osc.stop(t + (idx + 1) * 0.15);
        });
      } catch (e) {}
    }

    playGameOverSound() {
      if (window.soundManager && window.soundManager.soundPack === 'off') return;
      try {
        const ctx = this.getAudioCtx();
        if (!ctx) return;
        const t = ctx.currentTime;
        [320, 260, 210, 150].forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(freq, t + idx * 0.15);
          gain.gain.setValueAtTime(0.18, t + idx * 0.15);
          gain.gain.exponentialRampToValueAtTime(0.01, t + (idx + 1) * 0.15);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(t + idx * 0.15);
          osc.stop(t + (idx + 1) * 0.15);
        });
      } catch (e) {}
    }

    playErrorSound() {
      if (window.soundManager && window.soundManager.soundPack === 'off') return;
      try {
        const ctx = this.getAudioCtx();
        if (!ctx) return;
        const t = ctx.currentTime;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(130, t);
        osc.frequency.exponentialRampToValueAtTime(80, t + 0.06);

        const vol = (window.soundManager ? window.soundManager.volume : 0.3) * 0.3;
        gain.gain.setValueAtTime(vol, t);
        gain.gain.exponentialRampToValueAtTime(0.01, t + 0.06);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(t);
        osc.stop(t + 0.07);
      } catch (e) {}
    }
  }

  window.spaceGame = new SpaceRocketGame();

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => window.spaceGame.init());
  } else {
    window.spaceGame.init();
  }
})();
