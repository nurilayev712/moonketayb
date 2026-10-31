// MoonKeyType — Ultra-Tezkor va 100% Barqaror Real-Time Multiplayer Tizimi (Paho MQTT)

class MultiplayerManager {
  constructor() {
    this.client = null;
    this.roomId = null;
    this.isHost = false;
    this.myId = 'usr_' + Math.random().toString(36).substring(2, 9);
    this.players = {}; // { id: { id, name, avatar, isHost, progress, wpm, finished } }
    this.isInRace = false;
    this.raceWords = [];
    this.countdownTimer = null;
  }

  // 6 xonali tasodifiy xona kodi (masalan: 749201)
  generateRoomCode() {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  // 1. Yangi xona yaratish (Host)
  createRoom() {
    this.roomId = this.generateRoomCode();
    this.isHost = true;
    this.players = {};

    const user = (window.authManager && window.authManager.currentUser) || {
      username: 'Host_' + Math.floor(Math.random() * 900 + 100),
      avatar: '⌨️'
    };

    // O'zimizni o'yinchilar safiga kiritamiz
    this.players[this.myId] = {
      id: this.myId,
      name: user.username,
      avatar: user.avatar || '⌨️',
      isHost: true,
      progress: 0,
      wpm: 0,
      finished: false
    };

    const codeEl = document.getElementById('lobby-room-code');
    if (codeEl) codeEl.textContent = this.roomId;

    this.updateLobbyUI();
    this.updateStatusText("Xona tayyor! Do'stingizga xona kodini bering.");

    this.connectToBroker();
    return this.roomId;
  }

  // 2. Mavjud xonaga qo'shilish (Client)
  joinRoom(code) {
    code = code.trim();
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
    this.connectToBroker();
  }

  // WebSocket MQTT Brokerga ulanish (HiveMQ / EMQX WSS)
  connectToBroker() {
    if (typeof Paho === 'undefined' || !Paho.MQTT) {
      console.warn("Paho MQTT kutubxonasi kutilmoqda...");
      setTimeout(() => this.connectToBroker(), 300);
      return;
    }

    if (this.client) {
      try { this.client.disconnect(); } catch (e) {}
    }

    // HiveMQ WSS (Port 8884)
    const brokerHost = "broker.hivemq.com";
    const brokerPort = 8884;
    const clientId = "mkt_" + this.myId;

    try {
      this.client = new Paho.MQTT.Client(brokerHost, brokerPort, "/mqtt", clientId);

      this.client.onConnectionLost = (responseObject) => {
        if (responseObject.errorCode !== 0) {
          console.warn("Ulanish uzildi:", responseObject.errorMessage);
        }
      };

      this.client.onMessageArrived = (message) => {
        this.handleIncomingMessage(message.payloadString);
      };

      const connectOptions = {
        useSSL: true,
        timeout: 5,
        keepAliveInterval: 30,
        cleanSession: true,
        onSuccess: () => {
          console.log("MQTT Brokerga muvaffaqiyatli ulandik!");
          const topic = `mkt/race/${this.roomId}`;
          this.client.subscribe(topic);

          const user = (window.authManager && window.authManager.currentUser) || {
            username: (this.isHost ? 'Host_' : 'Player_') + Math.floor(Math.random() * 900 + 100),
            avatar: '⌨️'
          };

          if (this.isHost) {
            this.updateStatusText("Xona tayyor! Do'stlaringiz qo'shilishini kuting.");
          } else {
            this.updateStatusText("Xonaga ulandingiz! Xona egasi o'yinni boshlashini kuting.");
            // Host va boshqalarga qo'shilganimiz haqida xabar yuboramiz
            this.sendMessage({
              type: 'PLAYER_JOIN',
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
          console.error("Brokerga ulanish muvaffaqiyatsiz bo'ldi, zaxira brokerga urinilmoqda...", err);
          // Zaxira broker (EMQX)
          this.connectToFallbackBroker();
        }
      };

      this.client.connect(connectOptions);

    } catch (e) {
      console.error(e);
      this.connectToFallbackBroker();
    }
  }

  // Zaxira broker (EMQX WSS)
  connectToFallbackBroker() {
    if (typeof Paho === 'undefined' || !Paho.MQTT) return;
    try {
      const brokerHost = "broker.emqx.io";
      const brokerPort = 8084;
      const clientId = "mkt_fb_" + this.myId;

      this.client = new Paho.MQTT.Client(brokerHost, brokerPort, "/mqtt", clientId);

      this.client.onMessageArrived = (message) => {
        this.handleIncomingMessage(message.payloadString);
      };

      this.client.connect({
        useSSL: true,
        timeout: 5,
        onSuccess: () => {
          const topic = `mkt/race/${this.roomId}`;
          this.client.subscribe(topic);
          const user = (window.authManager && window.authManager.currentUser) || {
            username: (this.isHost ? 'Host_' : 'Player_') + Math.floor(Math.random() * 900 + 100),
            avatar: '⌨️'
          };
          if (!this.isHost) {
            this.sendMessage({
              type: 'PLAYER_JOIN',
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
        onFailure: () => {
          this.updateStatusText("Tarmoq xatosi. Iltimos internet aloqasini tekshiring.");
        }
      });
    } catch (err) {
      console.error(err);
    }
  }

  // Xabar yuborish
  sendMessage(dataObj) {
    if (!this.client || !this.client.isConnected()) return;
    try {
      const topic = `mkt/race/${this.roomId}`;
      const msgStr = JSON.stringify(dataObj);
      const message = new Paho.MQTT.Message(msgStr);
      message.destinationName = topic;
      this.client.send(message);
    } catch (e) {
      console.error("Xabar yuborishda xatolik:", e);
    }
  }

  // Kelgan xabarlarni qayta ishlash
  handleIncomingMessage(payloadStr) {
    let data;
    try {
      data = JSON.parse(payloadStr);
    } catch (e) {
      return;
    }

    // 1. Yangi o'yinchi qo'shilganda
    if (data.type === 'PLAYER_JOIN') {
      this.players[data.player.id] = data.player;
      this.updateLobbyUI();

      // Agar biz host bo'lsak, yangi o'yinchiga butun lobby holatini yuboramiz
      if (this.isHost) {
        this.sendMessage({
          type: 'SYNC_LOBBY',
          players: this.players
        });
      }
    }

    // 2. Lobby sinxronizatsiyasi
    else if (data.type === 'SYNC_LOBBY') {
      this.players = Object.assign({}, this.players, data.players);
      this.updateLobbyUI();
    }

    // 3. Poyga boshlanishi (3.. 2.. 1.. START)
    else if (data.type === 'START_RACE') {
      this.raceWords = data.words;
      this.startCountdownUI();
    }

    // 4. Progress yangilanishi
    else if (data.type === 'PROGRESS') {
      if (this.players[data.id]) {
        this.players[data.id].progress = data.progress;
        this.players[data.id].wpm = data.wpm;
        this.updateRaceTrackUI();
      }
    }

    // 5. Biror o'yinchi marraga yetganda
    else if (data.type === 'FINISH') {
      if (this.players[data.id]) {
        this.players[data.id].finished = true;
        this.players[data.id].wpm = data.wpm;
        this.players[data.id].accuracy = data.accuracy;
      }
      if (this.isHost) {
        this.checkRaceFinish();
      }
    }

    // 6. G'oliblar yakuniy taxtasi
    else if (data.type === 'LEADERBOARD') {
      this.showRaceResults(data.leaderboard);
    }
  }

  // Host o'yinni boshlashi
  startRace() {
    if (!this.isHost) return;

    const lang = (window.state && window.state.language) || 'uzbek';
    const source = (window.WORDS && window.WORDS[lang]) || (window.WORDS && window.WORDS.uzbek) || [];
    const words = [];
    const count = 25;
    for (let i = 0; i < count; i++) {
      words.push(source[Math.floor(Math.random() * source.length)]);
    }

    this.raceWords = words;

    // Barcha o'yinchilarga boshlash xabarini yuboramiz
    this.sendMessage({
      type: 'START_RACE',
      words: words
    });
  }

  // 3... 2... 1... Ortga hisoblash
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

  // Har bir harf bosilganda progress yuborish
  sendProgress(progressPercent, currentWpm) {
    if (this.players[this.myId]) {
      this.players[this.myId].progress = progressPercent;
      this.players[this.myId].wpm = currentWpm;
    }
    this.updateRaceTrackUI();

    this.sendMessage({
      type: 'PROGRESS',
      id: this.myId,
      progress: progressPercent,
      wpm: currentWpm
    });
  }

  // Testni tugatganda
  sendFinish(wpm, accuracy) {
    if (this.players[this.myId]) {
      this.players[this.myId].finished = true;
      this.players[this.myId].wpm = wpm;
      this.players[this.myId].accuracy = accuracy;
    }

    this.sendMessage({
      type: 'FINISH',
      id: this.myId,
      wpm: wpm,
      accuracy: accuracy
    });
  }

  // Host marrani tekshirib shohsupa e'lon qilishi
  checkRaceFinish() {
    const allPlayers = Object.values(this.players);
    const sorted = [...allPlayers].sort((a, b) => (b.wpm || 0) - (a.wpm || 0));

    this.sendMessage({
      type: 'LEADERBOARD',
      leaderboard: sorted
    });
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
      if (this.isHost) {
        startBtn.style.display = 'block';
        startBtn.textContent = "Start Game";
      } else {
        startBtn.style.display = 'none';
      }
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
