// MoonKeyType v4 — Real-time Multiplayer Engine (Paho MQTT)

class MultiplayerManager {
  constructor() {
    this.client = null;
    this.roomId = null;
    this.isHost = false;
    this.myId = 'usr_' + Math.random().toString(36).substring(2, 9);
    this.players = {};
    this.isInRace = false;
    this.raceWords = [];
    this.countdownTimer = null;
  }

  generateRoomCode() {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  // Yangi xona ochish
  createRoom() {
    this.roomId = this.generateRoomCode();
    this.isHost = true;
    this.players = {};

    const user = (window.authManager && window.authManager.currentUser) || {
      username: 'Host_' + Math.floor(Math.random() * 900 + 100),
      avatar: '⌨️'
    };

    this.players[this.myId] = {
      id: this.myId,
      name: user.username,
      avatar: user.avatar || '⌨️',
      isHost: true,
      progress: 0,
      wpm: 0,
      finished: false
    };

    // Kodni darhol ekranda ko'rsatish (kuttirmasdan!)
    const codeEl = document.getElementById('lobby-room-code');
    if (codeEl) codeEl.textContent = this.roomId;

    this.updateLobbyUI();
    this.updateStatusText("Xona tayyor! Do'stingizga kodni bering yoki havolani nusxalang.");

    this.connect();
    return this.roomId;
  }

  // Xonaga qo'shilish
  joinRoom(code) {
    code = (code || '').trim();
    if (!code) {
      alert("Iltimos, xona kodini kiriting!");
      return;
    }

    this.roomId = code;
    this.isHost = false;
    this.players = {};

    const codeEl = document.getElementById('lobby-room-code');
    if (codeEl) codeEl.textContent = this.roomId;

    this.updateStatusText("Xonaga ulanilmoqda, kuting...");
    this.connect();
  }

  // Serverga ulanish
  connect() {
    if (typeof Paho === 'undefined' || !Paho.MQTT) {
      console.warn("Paho MQTT kutubxonasi yuklanmoqda...");
      setTimeout(() => this.connect(), 500);
      return;
    }

    if (this.client) {
      try { this.client.disconnect(); } catch (e) {}
    }

    const host = "broker.hivemq.com";
    const port = 8884;
    const clientId = "mkt_v4_" + this.myId;

    try {
      this.client = new Paho.MQTT.Client(host, port, "/mqtt", clientId);

      this.client.onConnectionLost = (err) => {
        console.warn("Aloqa uzildi:", err.errorMessage);
      };

      this.client.onMessageArrived = (message) => {
        this.handleMessage(message.payloadString);
      };

      this.client.connect({
        useSSL: true,
        timeout: 6,
        keepAliveInterval: 30,
        cleanSession: true,
        onSuccess: () => {
          console.log("MQTT Serverga ulandik! Topic:", `mkt/room/${this.roomId}`);
          this.client.subscribe(`mkt/room/${this.roomId}`);

          const user = (window.authManager && window.authManager.currentUser) || {
            username: (this.isHost ? 'Host_' : 'Player_') + Math.floor(Math.random() * 900 + 100),
            avatar: '⌨️'
          };

          if (this.isHost) {
            this.updateStatusText("Xona tayyor! Do'stlaringiz qo'shilishini kuting.");
          } else {
            this.updateStatusText("Xonaga muvaffaqiyatli ulandiz! Xona egasi o'yinni boshlashini kuting.");
            this.send({
              type: 'JOIN',
              player: {
                id: this.myId,
                name: user.username,
                avatar: user.avatar || '⌨️',
                isHost: false,
                progress: 0,
                wpm: 0,
                finished: false
              }
            });
          }
        },
        onFailure: (err) => {
          console.error("HiveMQ xatosi, EMQX ga ulanilmoqda...", err);
          this.connectFallback();
        }
      });
    } catch (e) {
      console.error(e);
      this.connectFallback();
    }
  }

  connectFallback() {
    try {
      const host = "broker.emqx.io";
      const port = 8084;
      const clientId = "mkt_emqx_" + this.myId;

      this.client = new Paho.MQTT.Client(host, port, "/mqtt", clientId);

      this.client.onMessageArrived = (message) => {
        this.handleMessage(message.payloadString);
      };

      this.client.connect({
        useSSL: true,
        timeout: 6,
        onSuccess: () => {
          this.client.subscribe(`mkt/room/${this.roomId}`);
          const user = (window.authManager && window.authManager.currentUser) || {
            username: (this.isHost ? 'Host_' : 'Player_') + Math.floor(Math.random() * 900 + 100),
            avatar: '⌨️'
          };
          if (!this.isHost) {
            this.send({
              type: 'JOIN',
              player: {
                id: this.myId,
                name: user.username,
                avatar: user.avatar || '⌨️',
                isHost: false,
                progress: 0,
                wpm: 0,
                finished: false
              }
            });
          }
          this.updateStatusText(this.isHost ? "Xona tayyor!" : "Xonaga ulandingiz!");
        },
        onFailure: () => {
          this.updateStatusText("Internet aloqasini tekshiring.");
        }
      });
    } catch (e) {
      console.error(e);
    }
  }

  send(dataObj) {
    if (!this.client || !this.client.isConnected()) return;
    try {
      const msg = new Paho.MQTT.Message(JSON.stringify(dataObj));
      msg.destinationName = `mkt/room/${this.roomId}`;
      this.client.send(msg);
    } catch (e) {}
  }

  handleMessage(str) {
    let d;
    try { d = JSON.parse(str); } catch (e) { return; }

    if (d.type === 'JOIN') {
      this.players[d.player.id] = d.player;
      this.updateLobbyUI();
      if (this.isHost) {
        this.send({ type: 'SYNC', players: this.players });
      }
    } else if (d.type === 'SYNC') {
      this.players = Object.assign({}, this.players, d.players);
      this.updateLobbyUI();
    } else if (d.type === 'START') {
      this.raceWords = d.words;
      this.startCountdownUI();
    } else if (d.type === 'PROGRESS') {
      if (this.players[d.id]) {
        this.players[d.id].progress = d.progress;
        this.players[d.id].wpm = d.wpm;
        this.updateRaceTrackUI();
      }
    } else if (d.type === 'FINISH') {
      if (this.players[d.id]) {
        this.players[d.id].finished = true;
        this.players[d.id].wpm = d.wpm;
        this.players[d.id].accuracy = d.accuracy;
      }
      if (this.isHost) {
        this.checkRaceFinish();
      }
    } else if (d.type === 'LEADERBOARD') {
      this.showRaceResults(d.leaderboard);
    }
  }

  startRace() {
    if (!this.isHost) return;
    const lang = (window.state && window.state.language) || 'uzbek';
    const source = (window.WORDS && window.WORDS[lang]) || (window.WORDS && window.WORDS.uzbek) || [];
    const words = [];
    for (let i = 0; i < 25; i++) {
      words.push(source[Math.floor(Math.random() * source.length)]);
    }
    this.raceWords = words;
    this.send({ type: 'START', words: words });
  }

  startCountdownUI() {
    this.isInRace = true;
    const overlay = document.getElementById('race-countdown-overlay');
    const numberEl = document.getElementById('countdown-number');
    overlay.style.display = 'flex';

    if (window.closeAppModal) {
      window.closeAppModal(document.getElementById('multiplayer-lobby-modal'));
    } else {
      document.getElementById('multiplayer-lobby-modal').classList.remove('active');
    }

    document.getElementById('race-track-section').style.display = 'flex';
    document.getElementById('test-section').style.display = 'flex';

    this.renderRaceTracks();

    let count = 3;
    numberEl.textContent = count;
    if (window.soundManager) window.soundManager.playKey(false, false);

    clearInterval(this.countdownTimer);
    this.countdownTimer = setInterval(() => {
      count--;
      if (count > 0) {
        numberEl.textContent = count;
        if (window.soundManager) window.soundManager.playKey(false, false);
      } else if (count === 0) {
        numberEl.textContent = 'START!';
        if (window.soundManager) window.soundManager.playKey(false, true);
      } else {
        clearInterval(this.countdownTimer);
        overlay.style.display = 'none';
        if (window.startMultiplayerGame) {
          window.startMultiplayerGame(this.raceWords);
        }
      }
    }, 1000);
  }

  sendProgress(progressPercent, currentWpm) {
    if (this.players[this.myId]) {
      this.players[this.myId].progress = progressPercent;
      this.players[this.myId].wpm = currentWpm;
    }
    this.updateRaceTrackUI();
    this.send({
      type: 'PROGRESS',
      id: this.myId,
      progress: progressPercent,
      wpm: currentWpm
    });
  }

  sendFinish(wpm, accuracy) {
    if (this.players[this.myId]) {
      this.players[this.myId].finished = true;
      this.players[this.myId].wpm = wpm;
      this.players[this.myId].accuracy = accuracy;
    }
    this.send({
      type: 'FINISH',
      id: this.myId,
      wpm: wpm,
      accuracy: accuracy
    });
  }

  checkRaceFinish() {
    const all = Object.values(this.players);
    const sorted = [...all].sort((a, b) => (b.wpm || 0) - (a.wpm || 0));
    this.send({ type: 'LEADERBOARD', leaderboard: sorted });
  }

  showRaceResults(leaderboard) {
    this.isInRace = false;
    const modal = document.getElementById('race-results-modal');
    const list = document.getElementById('race-leaderboard-list');
    list.innerHTML = '';

    const isWinner = leaderboard.length > 0 && leaderboard[0].id === this.myId;
    const myResult = leaderboard.find(p => p.id === this.myId);

    if (window.authManager) {
      window.authManager.recordRace(isWinner, myResult ? myResult.wpm : 0);
    }

    leaderboard.forEach((player, idx) => {
      const medals = ['🥇 1st Place', '🥈 2nd Place', '🥉 3rd Place'];
      const rankText = medals[idx] || `${idx + 1}th Place`;

      const item = document.createElement('div');
      item.className = 'leaderboard-item' + (player.id === this.myId ? ' is-me' : '');
      item.innerHTML = `
        <div style="display: flex; align-items: center; gap: 0.75rem;">
          <span style="font-size: 1.5rem;">${player.avatar || '⌨️'}</span>
          <div>
            <div style="font-weight: 700; color: var(--text-color);">${player.name}</div>
            <div style="font-size: 0.8rem; color: var(--main-color);">${rankText}</div>
          </div>
        </div>
        <div style="text-align: right;">
          <div style="font-size: 1.5rem; font-weight: 700; color: var(--main-color);">${player.wpm || 0} WPM</div>
          <div style="font-size: 0.75rem; color: var(--sub-color);">${player.accuracy || 100}% acc</div>
        </div>
      `;
      list.appendChild(item);
    });

    if (window.openAppModal) {
      window.openAppModal(modal);
    } else {
      modal.classList.add('active');
    }
  }

  renderRaceTracks() {
    const container = document.getElementById('race-tracks-container');
    container.innerHTML = '';

    Object.values(this.players).forEach(player => {
      const track = document.createElement('div');
      track.className = 'race-track-row';
      track.id = 'track-' + player.id;
      track.innerHTML = `
        <div class="player-info-badge">
          <div style="display: flex; align-items: center; gap: 0.4rem;">
            <span class="p-avatar">${player.avatar || '⌨️'}</span>
            <span class="p-name">${player.name}</span>
          </div>
          <span class="p-wpm" id="wpm-tag-${player.id}">${player.wpm || 0} WPM</span>
        </div>
        <div class="track-line">
          <div class="car-runner" id="car-${player.id}" style="left: 0%;">
            ${player.avatar || '🏎️'}
          </div>
          <div class="finish-line">🏁</div>
        </div>
      `;
      container.appendChild(track);
    });
  }

  updateRaceTrackUI() {
    Object.values(this.players).forEach(player => {
      const carEl = document.getElementById('car-' + player.id);
      const wpmTag = document.getElementById('wpm-tag-' + player.id);
      if (carEl) {
        const percent = Math.min(Math.max(player.progress || 0, 0), 96);
        carEl.style.left = `${percent}%`;
      }
      if (wpmTag) {
        wpmTag.textContent = `${player.wpm || 0} WPM`;
      }
    });
  }

  updateStatusText(msg) {
    const statusText = document.getElementById('lobby-status-text');
    if (statusText) statusText.textContent = msg;
  }

  updateLobbyUI() {
    const codeEl = document.getElementById('lobby-room-code');
    const playersList = document.getElementById('lobby-players-list');
    const startBtn = document.getElementById('lobby-start-btn');

    if (codeEl) codeEl.textContent = this.roomId || '------';

    if (playersList) {
      playersList.innerHTML = '';
      Object.values(this.players).forEach(p => {
        const item = document.createElement('div');
        item.className = 'lobby-player-card';
        item.innerHTML = `
          <span style="font-size: 1.75rem;">${p.avatar || '⌨️'}</span>
          <span style="font-weight: 600; font-size: 0.9rem;">${p.name} ${p.isHost ? '👑' : ''}</span>
        `;
        playersList.appendChild(item);
      });
    }

    if (startBtn) {
      startBtn.style.display = this.isHost ? 'block' : 'none';
      startBtn.textContent = "Start Game";
    }
  }

  leaveRoom() {
    if (this.client) {
      try { this.client.disconnect(); } catch (e) {}
    }
    this.client = null;
    this.players = {};
    this.isInRace = false;

    if (window.closeAppModal) {
      window.closeAppModal(document.getElementById('multiplayer-lobby-modal'));
    } else {
      document.getElementById('multiplayer-lobby-modal').classList.remove('active');
    }

    document.getElementById('race-track-section').style.display = 'none';
    document.getElementById('test-section').style.display = 'flex';
    document.getElementById('main-config-bar').style.display = 'flex';
    if (window.resetTest) window.resetTest();
  }
}

window.multiplayerManager = new MultiplayerManager();
