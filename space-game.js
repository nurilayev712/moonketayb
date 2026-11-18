// ====================================================
// TYPEX712 & MONKEYTYPE: KOSMIK RAKETA (ASTEROID DEFENSE) O'YINI
// Fazodan uchib keluvchi toshlardagi so'zlarni yozib,
// ularni lazer bilan otib yo'q qilish arcade rejimi.
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
      this.difficulty = 'normal'; // 'easy', 'normal', 'hard', 'endless'
      this.shields = 3;
      this.maxShields = 3;
      this.score = 0;
      this.kills = 0;
      this.combo = 1;
      this.maxCombo = 1;
      this.startTime = 0;
      this.totalCharsTyped = 0;
      this.totalMistakes = 0;

      // Obyektlar
      this.stars = [];
      this.rocks = [];
      this.lasers = [];
      this.particles = [];
      this.floatingTexts = [];
      this.screenShake = 0;

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
      this.spawnInterval = 2200; // ms
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
      const count = 90;
      const w = this.logicalWidth || 900;
      const h = this.logicalHeight || 520;
      for (let i = 0; i < count; i++) {
        this.stars.push({
          x: Math.random() * w,
          y: Math.random() * h,
          size: Math.random() * 2 + 0.5,
          speed: Math.random() * 0.9 + 0.3,
          brightness: Math.random() * 0.8 + 0.2
        });
      }
    }

    setupDOM() {
      // Qiyinlik tugmalari
      document.querySelectorAll('[data-space-diff]').forEach(btn => {
        btn.addEventListener('click', (e) => {
          document.querySelectorAll('[data-space-diff]').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          this.difficulty = btn.dataset.spaceDiff || 'normal';
          this.updateDifficultySettings();
          if (this.running) {
            this.restart();
          }
        });
      });

      // Boshlash tugmasi
      const startBtn = document.getElementById('space-start-btn');
      if (startBtn) {
        startBtn.onclick = () => this.start();
      }

      // Qayta o'ynash tugmasi
      const retryBtn = document.getElementById('space-retry-btn');
      if (retryBtn) {
        retryBtn.onclick = () => this.restart();
      }

      // Chiqish tugmasi
      const exitBtn = document.getElementById('space-exit-btn');
      if (exitBtn) {
        exitBtn.onclick = () => this.exitToNormalMode();
      }
    }

    updateDifficultySettings() {
      if (this.difficulty === 'easy') {
        this.spawnInterval = 2800;
      } else if (this.difficulty === 'normal') {
        this.spawnInterval = 2200;
      } else if (this.difficulty === 'hard') {
        this.spawnInterval = 1500;
      } else if (this.difficulty === 'endless') {
        this.spawnInterval = 2200;
      }
    }

    showStartOverlay() {
      this.running = false;
      const startOverlay = document.getElementById('space-start-overlay');
      const gameoverOverlay = document.getElementById('space-gameover-overlay');
      if (startOverlay) startOverlay.style.display = 'flex';
      if (gameoverOverlay) gameoverOverlay.style.display = 'none';

      // Fon animatsiyasini yuritish
      if (!this.animId) {
        this.loop();
      }
    }

    start() {
      const startOverlay = document.getElementById('space-start-overlay');
      const gameoverOverlay = document.getElementById('space-gameover-overlay');
      if (startOverlay) startOverlay.style.display = 'none';
      if (gameoverOverlay) gameoverOverlay.style.display = 'none';

      this.running = true;
      this.shields = this.maxShields;
      this.score = 0;
      this.kills = 0;
      this.combo = 1;
      this.maxCombo = 1;
      this.startTime = Date.now();
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
      this.updateHUD();

      // Boshlanishida birinchi toshni darhol chiqarish
      this.spawnRock();

      if (!this.animId) {
        this.loop();
      }
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

    // ----------------------------------------------------
    // Tosh (Asteroid) yaratish — Monkeytype so'zlari bilan
    // ----------------------------------------------------
    getRandomWord() {
      const lang = (window.state && window.state.language) || 'english';
      let wordList = (window.WORDS && window.WORDS[lang]) || (window.WORDS && window.WORDS.english) || [];
      if (!wordList || wordList.length === 0) {
        wordList = ["space", "rocket", "meteor", "planet", "laser", "galaxy", "orbit", "speed", "stars"];
      }

      // Mavjud toshlar bosh harflarini yig'ish (imkon qadar bir xil harf takrorlanmasin)
      const existingStartingChars = new Set(this.rocks.map(r => r.word[0].toLowerCase()));

      for (let i = 0; i < 25; i++) {
        const candidate = wordList[Math.floor(Math.random() * wordList.length)];
        if (typeof candidate === 'string' && candidate.length >= 2 && candidate.length <= 9) {
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
      const y = -40;

      const word = this.getRandomWord();

      // Qiyinlikka qarab tezlik
      let baseSpeed = 0.85;
      if (this.difficulty === 'easy') baseSpeed = 0.65;
      else if (this.difficulty === 'hard') baseSpeed = 1.45;
      else if (this.difficulty === 'endless') {
        baseSpeed = 0.85 + Math.min(1.5, (this.kills / 15) * 0.25);
      }

      const speed = baseSpeed + (Math.random() * 0.35 - 0.15);
      const radius = Math.max(26, Math.min(38, 20 + word.length * 2.2));

      // Bumpy notekis tosh ko'rinishi uchun polygon nuqtalari
      const vertexCount = 10;
      const vertices = [];
      for (let i = 0; i < vertexCount; i++) {
        const angle = (i / vertexCount) * Math.PI * 2;
        const jitter = 0.8 + Math.random() * 0.4;
        vertices.push({
          x: Math.cos(angle) * (radius * jitter),
          y: Math.sin(angle) * (radius * jitter)
        });
      }

      // Kichik kraterlar
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
        x: x,
        y: y,
        vx: (Math.random() - 0.5) * 0.4,
        vy: speed,
        radius: radius,
        vertices: vertices,
        craters: craters,
        rotation: Math.random() * Math.PI * 2,
        rotSpeed: (Math.random() - 0.5) * 0.02,
        word: word,
        shake: 0
      });
    }

    // ----------------------------------------------------
    // Klaviaturadan harf kiritish (Shooting Logic)
    // ----------------------------------------------------
    handleKey(e) {
      if (!this.active) return;

      // O'yin boshlanmagan bo'lsa Enter / Space orqali boshlash
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

      // Escape bosilsa chiqish
      if (e.key === 'Escape') {
        e.preventDefault();
        this.exitToNormalMode();
        return;
      }

      // Tab + Enter — qayta boshlash
      if (e.key === 'Enter' && e.ctrlKey || (e.key === 'r' && e.altKey)) {
        e.preventDefault();
        this.restart();
        return;
      }

      // Faqat bitta harf yoki raqam
      if (e.key.length !== 1 || e.ctrlKey || e.altKey || e.metaKey) return;

      const typedChar = e.key.toLowerCase();
      this.totalCharsTyped++;

      // 1. Agar birorta toshga nishon olinmagan bo'lsa
      if (!this.targetRock) {
        // Shu harf bilan boshlanadigan barcha toshlarni topish
        const matchingRocks = this.rocks.filter(r => r.word[0].toLowerCase() === typedChar);
        if (matchingRocks.length > 0) {
          // Eng yaqin (y koordinatasi eng past/xavfli) toshni tanlash
          matchingRocks.sort((a, b) => b.y - a.y);
          this.targetRock = matchingRocks[0];
          this.typedIndex = 1;

          this.fireLaser(this.targetRock);
          this.playLaserSound();

          // Agar 1 harfli so'z bo'lsa darhol yo'q qilish
          if (this.typedIndex >= this.targetRock.word.length) {
            this.destroyRock(this.targetRock);
          }
        } else {
          // Xato harf bosildi
          this.totalMistakes++;
          this.combo = 1;
          this.updateHUD();
          this.playErrorSound();
        }
      } else {
        // 2. Allaqaqachon tosh nishonga olingan bo'lsa
        const expectedChar = this.targetRock.word[this.typedIndex].toLowerCase();
        if (typedChar === expectedChar) {
          this.typedIndex++;
          this.fireLaser(this.targetRock);
          this.playLaserSound();

          // So'z to'liq terildimi?
          if (this.typedIndex >= this.targetRock.word.length) {
            this.destroyRock(this.targetRock);
          }
        } else {
          // Xato harf bosildi
          this.targetRock.shake = 8;
          this.totalMistakes++;
          this.combo = 1;
          this.updateHUD();
          this.playErrorSound();
        }
      }
    }

    fireLaser(rock) {
      // Raketani nishonga burish
      const dx = rock.x - this.rocket.x;
      const dy = rock.y - this.rocket.y;
      this.rocket.targetAngle = Math.atan2(dx, -dy);
      this.rocket.recoil = 8;

      // Chap va o'ng lazer to'plaridan o'q otish
      const leftTipX = this.rocket.x - 14 * Math.cos(this.rocket.angle) - 10 * Math.sin(this.rocket.angle);
      const leftTipY = this.rocket.y - 14 * Math.sin(this.rocket.angle) - 10 * Math.cos(this.rocket.angle);
      const rightTipX = this.rocket.x + 14 * Math.cos(this.rocket.angle) - 10 * Math.sin(this.rocket.angle);
      const rightTipY = this.rocket.y + 14 * Math.sin(this.rocket.angle) - 10 * Math.cos(this.rocket.angle);

      const targetX = rock.x;
      const targetY = rock.y;

      [ { x: leftTipX, y: leftTipY }, { x: rightTipX, y: rightTipY } ].forEach(tip => {
        this.lasers.push({
          x: tip.x,
          y: tip.y,
          tx: targetX,
          ty: targetY,
          color: getComputedStyle(document.documentElement).getPropertyValue('--main-color').trim() || '#e2b714',
          progress: 0,
          speed: 0.18
        });
      });
    }

    destroyRock(rock) {
      // Katta giper portlash
      this.createExplosion(rock.x, rock.y, rock.radius);
      this.playExplosionSound();

      // Ball hisoblash
      const earnedScore = rock.word.length * 10 * this.combo;
      this.score += earnedScore;
      this.kills++;

      // Combo oshirish
      this.combo = Math.min(10, this.combo + 1);
      if (this.combo > this.maxCombo) this.maxCombo = this.combo;

      // Floating ball yozuvi
      this.floatingTexts.push({
        text: `+${earnedScore}` + (this.combo > 1 ? ` (x${this.combo})` : ''),
        x: rock.x,
        y: rock.y,
        vy: -1.2,
        opacity: 1,
        color: this.combo > 3 ? '#a3e635' : '#e2b714'
      });

      // Toshni ro'yxatdan o'chirish
      this.rocks = this.rocks.filter(r => r.id !== rock.id);
      this.targetRock = null;
      this.typedIndex = 0;

      this.updateHUD();
    }

    createExplosion(x, y, radius) {
      // 30 ta tosh parchalari
      const particleCount = 28;
      const mainColor = getComputedStyle(document.documentElement).getPropertyValue('--main-color').trim() || '#e2b714';

      for (let i = 0; i < particleCount; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 5 + 1.5;
        this.particles.push({
          x: x,
          y: y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          size: Math.random() * 4 + 2,
          color: Math.random() < 0.45 ? mainColor : (Math.random() < 0.5 ? '#9ca3af' : '#4b5563'),
          life: 1,
          decay: Math.random() * 0.025 + 0.015
        });
      }

      // Kengayuvchi zarba to'lqini halqasi
      this.particles.push({
        x: x,
        y: y,
        isRing: true,
        radius: 8,
        maxRadius: radius * 2.2,
        color: mainColor,
        life: 1,
        decay: 0.035
      });
    }

    rockHitShield(rock) {
      this.shields--;
      this.screenShake = 16;
      this.createExplosion(rock.x, this.rocket.y - 25, rock.radius);
      this.playShieldHitSound();

      if (this.targetRock && this.targetRock.id === rock.id) {
        this.targetRock = null;
        this.typedIndex = 0;
      }

      this.rocks = this.rocks.filter(r => r.id !== rock.id);
      this.combo = 1;
      this.updateHUD();

      // Qalqon tugadimi?
      if (this.shields <= 0) {
        this.triggerGameOver();
      }
    }

    triggerGameOver() {
      this.running = false;
      this.createExplosion(this.rocket.x, this.rocket.y, 45);
      this.playGameOverSound();

      // Natijalarni hisoblash
      const totalSec = Math.max(1, (Date.now() - this.startTime) / 1000);
      const wpm = Math.round((this.totalCharsTyped / 5) / (totalSec / 60)) || 0;
      const totalKeys = this.totalCharsTyped + this.totalMistakes;
      const acc = totalKeys > 0 ? Math.round((this.totalCharsTyped / totalKeys) * 100) : 100;

      // Game Over modalini to'ldirish
      document.getElementById('space-final-score').textContent = this.score.toLocaleString();
      document.getElementById('space-final-kills').textContent = this.kills;
      document.getElementById('space-final-wpm').textContent = wpm;
      document.getElementById('space-final-acc').textContent = acc + '%';
      document.getElementById('space-final-combo').textContent = 'x' + this.maxCombo;

      const gameoverOverlay = document.getElementById('space-gameover-overlay');
      if (gameoverOverlay) gameoverOverlay.style.display = 'flex';
    }

    updateHUD() {
      // Qalqon piktogrammalari
      for (let i = 1; i <= 3; i++) {
        const sEl = document.getElementById(`shield-${i}`);
        if (sEl) {
          sEl.style.opacity = i <= this.shields ? '1' : '0.2';
          sEl.style.filter = i <= this.shields ? 'none' : 'grayscale(1)';
        }
      }

      // Ball, Kills, Combo
      const scoreEl = document.getElementById('space-score-val');
      if (scoreEl) scoreEl.textContent = this.score.toLocaleString();

      const killsEl = document.getElementById('space-kills-val');
      if (killsEl) killsEl.textContent = this.kills;

      const comboEl = document.getElementById('space-combo-val');
      if (comboEl) {
        comboEl.textContent = 'x' + this.combo;
        comboEl.style.color = this.combo > 3 ? '#a3e635' : (this.combo > 1 ? '#e2b714' : 'inherit');
      }

      // Jonli WPM
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

      // 1. Yulduzlar harakati
      const starSpeedMul = this.running ? (1 + (this.combo - 1) * 0.15) : 0.6;
      this.stars.forEach(s => {
        s.y += s.speed * starSpeedMul;
        if (s.y > h) {
          s.y = 0;
          s.x = Math.random() * w;
        }
      });

      // 2. Ekran silkinishi
      if (this.screenShake > 0) {
        this.screenShake *= 0.88;
        if (this.screenShake < 0.3) this.screenShake = 0;
      }

      // 3. Raketa burchagini silliq nishonga burish
      if (this.targetRock) {
        const dx = this.targetRock.x - this.rocket.x;
        const dy = this.targetRock.y - this.rocket.y;
        this.rocket.targetAngle = Math.atan2(dx, -dy);
      } else {
        this.rocket.targetAngle = 0;
      }
      this.rocket.angle += (this.rocket.targetAngle - this.rocket.angle) * 0.18;

      if (this.rocket.recoil > 0) {
        this.rocket.recoil *= 0.85;
      }

      // Faqat o'yin yurganda toshlar va lazerlarni yangilash
      if (!this.running) return;

      // 4. Yangi tosh chiqarish
      if (now - this.lastSpawnTime > this.spawnInterval) {
        const maxRocks = this.difficulty === 'easy' ? 3 : (this.difficulty === 'hard' ? 6 : 4);
        if (this.rocks.length < maxRocks) {
          this.spawnRock();
          this.lastSpawnTime = now;
        }
      }

      // 5. Toshlar harakati va qalqon bilan to'qnashuv
      const shieldY = this.rocket.y - 25;
      this.rocks.forEach(rock => {
        rock.x += rock.vx;
        rock.y += rock.vy;
        rock.rotation += rock.rotSpeed;

        if (rock.shake > 0) rock.shake *= 0.82;

        // Qalqonga urilish
        if (rock.y + rock.radius >= shieldY) {
          this.rockHitShield(rock);
        }
      });

      // 6. Lazer nurlari harakati
      this.lasers.forEach(l => {
        l.progress += l.speed;
        l.x += (l.tx - l.x) * 0.28;
        l.y += (l.ty - l.y) * 0.28;
      });
      this.lasers = this.lasers.filter(l => l.progress < 1);

      // 7. Zarrachalar (Particles)
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

      // 8. Suzuvchi yozuvlar
      this.floatingTexts.forEach(ft => {
        ft.y += ft.vy;
        ft.opacity -= 0.02;
      });
      this.floatingTexts = this.floatingTexts.filter(ft => ft.opacity > 0);

      // HUD yangilash
      this.updateHUD();
    }

    render() {
      const ctx = this.ctx;
      const w = this.logicalWidth || 900;
      const h = this.logicalHeight || 520;

      ctx.save();
      ctx.clearRect(0, 0, w, h);

      // Ekran silkinishi (Screen shake)
      if (this.screenShake > 0) {
        const ox = (Math.random() - 0.5) * this.screenShake;
        const oy = (Math.random() - 0.5) * this.screenShake;
        ctx.translate(ox, oy);
      }

      // Fon rangi (Kosmik gradient)
      const bgGrad = ctx.createLinearGradient(0, 0, 0, h);
      bgGrad.addColorStop(0, '#0a0d14');
      bgGrad.addColorStop(1, '#131722');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, w, h);

      // 1. Yulduzlar
      this.stars.forEach(s => {
        ctx.fillStyle = `rgba(255, 255, 255, ${s.brightness})`;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
        ctx.fill();
      });

      // 2. Qalqon to'sig'i chizig'i (Shield Defense Line)
      if (this.shields > 0) {
        ctx.save();
        const shieldAlpha = 0.2 + (this.shields / this.maxShields) * 0.25 + 0.1 * Math.sin(Date.now() / 250);
        ctx.strokeStyle = `rgba(56, 189, 248, ${shieldAlpha})`;
        ctx.lineWidth = 2;
        ctx.setLineDash([8, 8]);
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
        ctx.shadowBlur = 12;
        ctx.lineWidth = 3.5;
        ctx.beginPath();
        ctx.moveTo(l.x, l.y);
        ctx.lineTo(l.tx, l.ty);
        ctx.stroke();
        ctx.restore();
      });

      // 4. Toshlar (Asteroids) va so'zlar
      this.rocks.forEach(rock => {
        this.renderRock(ctx, rock);
      });

      // 5. Portlash zarrachalari
      this.particles.forEach(p => {
        ctx.save();
        if (p.isRing) {
          ctx.strokeStyle = p.color;
          ctx.globalAlpha = Math.max(0, p.life);
          ctx.lineWidth = 3;
          ctx.shadowColor = p.color;
          ctx.shadowBlur = 10;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
          ctx.stroke();
        } else {
          ctx.fillStyle = p.color;
          ctx.globalAlpha = Math.max(0, p.life);
          ctx.shadowColor = p.color;
          ctx.shadowBlur = 6;
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
        ctx.shadowBlur = 8;
        ctx.textAlign = 'center';
        ctx.fillText(ft.text, ft.x, ft.y);
        ctx.restore();
      });

      // 7. Raketa
      this.renderRocket(ctx);

      ctx.restore();
    }

    renderRock(ctx, rock) {
      ctx.save();
      const shakeX = rock.shake > 0 ? (Math.random() - 0.5) * rock.shake : 0;
      ctx.translate(rock.x + shakeX, rock.y);
      ctx.rotate(rock.rotation);

      const isTarget = this.targetRock && this.targetRock.id === rock.id;
      const mainColor = getComputedStyle(document.documentElement).getPropertyValue('--main-color').trim() || '#e2b714';

      // Tosh tanasi (Bumpy jagged polygon)
      ctx.beginPath();
      rock.vertices.forEach((v, idx) => {
        if (idx === 0) ctx.moveTo(v.x, v.y);
        else ctx.lineTo(v.x, v.y);
      });
      ctx.closePath();

      // Tosh foni va soyasi
      const rockGrad = ctx.createRadialGradient(-rock.radius * 0.3, -rock.radius * 0.3, 2, 0, 0, rock.radius);
      rockGrad.addColorStop(0, isTarget ? '#374151' : '#27292f');
      rockGrad.addColorStop(1, isTarget ? '#1f2937' : '#18191d');
      ctx.fillStyle = rockGrad;
      ctx.fill();

      ctx.strokeStyle = isTarget ? mainColor : 'rgba(255, 255, 255, 0.18)';
      ctx.lineWidth = isTarget ? 2.5 : 1.5;
      if (isTarget) {
        ctx.shadowColor = mainColor;
        ctx.shadowBlur = 12;
      }
      ctx.stroke();

      // Kraterlar
      ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
      rock.craters.forEach(c => {
        ctx.beginPath();
        ctx.arc(c.x, c.y, c.r, 0, Math.PI * 2);
        ctx.fill();
      });

      ctx.restore();

      // ----------------------------------------------------
      // So'z kapsulasi (Aylantirilmaydi, doim gorizontal turadi)
      // ----------------------------------------------------
      ctx.save();
      ctx.translate(rock.x + shakeX, rock.y + rock.radius + 18);

      const fontSize = 16;
      ctx.font = `bold ${fontSize}px "JetBrains Mono", monospace`;
      const word = rock.word;
      const totalTextWidth = ctx.measureText(word).width;
      const pillPadX = 10;
      const pillPadY = 5;
      const pillW = totalTextWidth + pillPadX * 2;
      const pillH = fontSize + pillPadY * 2;

      // Kapsula foni
      ctx.fillStyle = isTarget ? 'rgba(17, 24, 39, 0.95)' : 'rgba(15, 17, 21, 0.88)';
      ctx.strokeStyle = isTarget ? mainColor : 'rgba(255, 255, 255, 0.12)';
      ctx.lineWidth = isTarget ? 1.8 : 1;
      if (isTarget) {
        ctx.shadowColor = mainColor;
        ctx.shadowBlur = 10;
      }

      ctx.beginPath();
      if (ctx.roundRect) {
        ctx.roundRect(-pillW / 2, -pillH / 2, pillW, pillH, 8);
      } else {
        ctx.rect(-pillW / 2, -pillH / 2, pillW, pillH);
      }
      ctx.fill();
      ctx.stroke();

      // So'zdagi harflarni Monkeytype 1:1 formatida chizish
      let currentX = -totalTextWidth / 2;
      const typedLen = isTarget ? this.typedIndex : 0;

      for (let i = 0; i < word.length; i++) {
        const char = word[i];
        const charW = ctx.measureText(char).width;

        if (i < typedLen) {
          // Terilgan harflar: Oltin / Yorqin
          ctx.fillStyle = mainColor;
          ctx.shadowColor = mainColor;
          ctx.shadowBlur = 6;
        } else if (i === typedLen && isTarget) {
          // Hozirgi terilishi kerak bo'lgan harf
          ctx.fillStyle = '#ffffff';
          ctx.shadowColor = '#ffffff';
          ctx.shadowBlur = 8;
        } else {
          // Qolgan harflar: Kulrang
          ctx.fillStyle = '#6b7280';
          ctx.shadowBlur = 0;
        }

        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText(char, currentX, 1);

        // Hozirgi harf ostiga kursorni chizish
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

      const mainColor = getComputedStyle(document.documentElement).getPropertyValue('--main-color').trim() || '#e2b714';

      // 1. Dvigatel olovi (Thruster flame)
      const flameHeight = 18 + Math.random() * 12 + (this.running ? 6 : 0);
      const flameGrad = ctx.createLinearGradient(0, 20, 0, 20 + flameHeight);
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

      // 2. Qanotlar va korpus
      ctx.fillStyle = '#1e2430';
      ctx.strokeStyle = mainColor;
      ctx.lineWidth = 2;
      ctx.shadowColor = mainColor;
      ctx.shadowBlur = 10;

      // Asosiy uchburchak delta korpus
      ctx.beginPath();
      ctx.moveTo(0, -32); // Burun uchi
      ctx.lineTo(22, 20); // O'ng qanot uchi
      ctx.lineTo(12, 16);
      ctx.lineTo(10, 24); // O'ng nozul
      ctx.lineTo(-10, 24); // Chap nozul
      ctx.lineTo(-12, 16);
      ctx.lineTo(-22, 20); // Chap qanot uchi
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // 3. Qanotlardagi lazer pushkalari
      ctx.fillStyle = mainColor;
      ctx.fillRect(-17, 4, 3, 14);
      ctx.fillRect(14, 4, 3, 14);

      // 4. Kokpit shishasi (Glowing canopy)
      const canopyGrad = ctx.createLinearGradient(0, -18, 0, 4);
      canopyGrad.addColorStop(0, '#38bdf8');
      canopyGrad.addColorStop(1, '#0284c7');
      ctx.fillStyle = canopyGrad;
      ctx.beginPath();
      ctx.ellipse(0, -6, 5, 12, 0, 0, Math.PI * 2);
      ctx.fill();

      // 5. Qalqon auras (Shield forcefield ring)
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
    // Ovoz effektlari (Web Audio API orqali sof sintez)
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
        osc.frequency.setValueAtTime(860, t);
        osc.frequency.exponentialRampToValueAtTime(220, t + 0.08);

        const vol = (window.soundManager ? window.soundManager.volume : 0.3) * 0.4;
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

  // Global instansiya
  window.spaceGame = new SpaceRocketGame();

  // DOM yuklanganda inicializatsiya qilish
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => window.spaceGame.init());
  } else {
    window.spaceGame.init();
  }
})();
