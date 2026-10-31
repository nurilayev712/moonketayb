// MoonKeyType — PeerJS orqali P2P Multiplayer Poyga Tizimi (Tuzatilgan va barqaror)

const PEER_CONFIG = {
  debug: 1,
  config: {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
      { urls: 'stun:stun2.l.google.com:19302' },
      { urls: 'stun:global.stun.twilio.com:3478' }
    ]
  }
};

class MultiplayerManager {
  constructor() {
    this.peer = null;
    this.connections = []; // Host uchun barcha ulanishlar
    this.hostConnection = null; // Client uchun hostga ulanish
    this.isHost = false;
    this.roomId = null;
    this.players = {}; // { peerId: { id, name, avatar, progress, wpm, finished } }
    this.isInRace = false;
    this.raceWords = [];
    this.countdownTimer = null;
    this.connectionTimeout = null;
  }

  // Xona kodi yaratish (masalan 482910)
  generateRoomCode() {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  // 1. Yangi xona yaratish (Host)
  createRoom() {
    const user = window.authManager.currentUser || { username: 'Guest_' + Math.floor(Math.random() * 900 + 100), avatar: '⌨️' };
    this.roomId = this.generateRoomCode();
    this.isHost = true;
    this.players = {};

    const peerId = 'mkt-room-' + this.roomId;

    if (this.peer) {
      try { this.peer.destroy(); } catch (e) {}
    }

    this.updateStatusText("Xona yaratilmoqda, kuting...");

    try {
      this.peer = new Peer(peerId, PEER_CONFIG);

      this.peer.on('open', (id) => {
        console.log('Xona muvaffaqiyatli ochildi, Peer ID:', id);
        this.players[this.peer.id] = {
          id: this.peer.id,
          name: user.username,
          avatar: user.avatar || '⌨️',
          isHost: true,
          progress: 0,
          wpm: 0,
          finished: false
        };
        this.updateLobbyUI();
        this.updateStatusText("Xona tayyor! Do'stlaringizga kodni bering.");
      });

      this.peer.on('connection', (conn) => {
        console.log('Yangi o\'yinchi ulandi:', conn.peer);
        this.connections.push(conn);

        conn.on('data', (data) => {
          this.handleHostData(conn, data);
        });

        conn.on('close', () => {
          delete this.players[conn.peer];
          this.connections = this.connections.filter(c => c !== conn);
          this.broadcastLobby();
          this.updateLobbyUI();
        });
      });

      this.peer.on('error', (err) => {
        console.error('PeerJS xatosi:', err);
        if (err.type === 'unavailable-id') {
          // Kod band bo'lsa yangitdan yaratish
          this.createRoom();
        } else {
          alert('Tarmoq xatosi: ' + (err.message || err.type));
        }
      });

    } catch (e) {
      console.error(e);
      alert("Xona ochishda xatolik yuz berdi!");
    }

    return this.roomId;
  }

  // 2. Mavjud xonaga qo'shilish (Client)
  joinRoom(code) {
    code = code.trim().replace('#', '');
    if (!code) {
      alert('Iltimos, xona kodini kiriting!');
      return;
    }

    const user = window.authManager.currentUser || { username: 'Guest_' + Math.floor(Math.random() * 900 + 100), avatar: '⌨️' };
    this.roomId = code;
    this.isHost = false;
    this.players = {};

    if (this.peer) {
      try { this.peer.destroy(); } catch (e) {}
    }

    this.updateStatusText("Xonaga ulanilmoqda, kuting...");

    try {
      this.peer = new Peer(PEER_CONFIG);

      this.peer.on('open', (myPeerId) => {
        const hostPeerId = 'mkt-room-' + this.roomId;
        const conn = this.peer.connect(hostPeerId, { reliable: true });
        this.hostConnection = conn;

        // Ulanish uchun 12 soniya timeout
        clearTimeout(this.connectionTimeout);
        this.connectionTimeout = setTimeout(() => {
          if (!conn.open) {
            alert("Xonaga ulanib bo'lmadi! Xona kodi noto'g'ri yoki xona egasi oflayn.");
            this.leaveRoom();
          }
        }, 12000);

        conn.on('open', () => {
          clearTimeout(this.connectionTimeout);
          console.log('Hostga muvaffaqiyatli ulanildi!');
          this.updateStatusText("Xonaga ulandiz! Xona egasi poygani boshlashini kuting.");

          // O'z ma'lumotlarini hostga yuborish
          conn.send({
            type: 'JOIN',
            player: {
              id: myPeerId,
              name: user.username,
              avatar: user.avatar || '⌨️',
              isHost: false,
              progress: 0,
              wpm: 0,
              finished: false
            }
          });
        });

        conn.on('data', (data) => {
          this.handleClientData(data);
        });

        conn.on('close', () => {
          alert("Xona egasi chiqib ketdi yoki ulanish uzildi!");
          this.leaveRoom();
        });
      });

      this.peer.on('error', (err) => {
        clearTimeout(this.connectionTimeout);
        console.error('PeerJS ulanish xatosi:', err);
        alert('Xona topilmadi! Kodni to\'g\'ri kiritganingizni tekshiring.');
        this.leaveRoom();
      });

    } catch (e) {
      console.error(e);
      alert("Xonaga ulanishda xatolik yuz berdi!");
    }
  }

  // Host xabarlarni qabul qilishi
  handleHostData(conn, data) {
    if (data.type === 'JOIN') {
      this.players[conn.peer] = data.player;
      this.broadcastLobby();
      this.updateLobbyUI();
      // Yangi qo'shilgan o'yinchiga ham darhol lobby holatini yuborish
      conn.send({
        type: 'LOBBY_UPDATE',
        players: this.players
      });
    } else if (data.type === 'PROGRESS') {
      if (this.players[conn.peer]) {
        this.players[conn.peer].progress = data.progress;
        this.players[conn.peer].wpm = data.wpm;
        this.broadcast({
          type: 'PROGRESS_UPDATE',
          peerId: conn.peer,
          progress: data.progress,
          wpm: data.wpm
        });
        this.updateRaceTrackUI();
      }
    } else if (data.type === 'FINISHED') {
      if (this.players[conn.peer]) {
        this.players[conn.peer].finished = true;
        this.players[conn.peer].wpm = data.wpm;
        this.players[conn.peer].accuracy = data.accuracy;
        this.checkRaceFinish();
      }
    }
  }

  // Client xabarlarni qabul qilishi
  handleClientData(data) {
    if (data.type === 'LOBBY_UPDATE') {
      this.players = data.players;
      this.updateLobbyUI();
    } else if (data.type === 'START_COUNTDOWN') {
      this.raceWords = data.words;
      this.startCountdownUI();
    } else if (data.type === 'PROGRESS_UPDATE') {
      if (this.players[data.peerId]) {
        this.players[data.peerId].progress = data.progress;
        this.players[data.peerId].wpm = data.wpm;
        this.updateRaceTrackUI();
      }
    } else if (data.type === 'RACE_FINISHED_SUMMARY') {
      this.showRaceResults(data.leaderboard);
    }
  }

  // Host barcha o'yinchilarga xabar tarqatishi
  broadcast(data) {
    this.connections.forEach(conn => {
      if (conn && conn.open) {
        try { conn.send(data); } catch (e) {}
      }
    });
  }

  broadcastLobby() {
    this.broadcast({
      type: 'LOBBY_UPDATE',
      players: this.players
    });
  }

  // Host poygani boshlashi
  startRace() {
    if (!this.isHost) return;

    // So'zlar generatsiyasi (hamma uchun bir xil 25 ta so'z)
    const lang = (window.state && window.state.language) || 'english';
    const source = (window.WORDS && window.WORDS[lang]) || (window.WORDS && window.WORDS.english) || [];
    const words = [];
    const count = 25;
    for (let i = 0; i < count; i++) {
      words.push(source[Math.floor(Math.random() * source.length)]);
    }

    this.raceWords = words;

    // Barcha o'yinchilarga signal yuborish
    this.broadcast({
      type: 'START_COUNTDOWN',
      words: words
    });

    this.startCountdownUI();
  }

  // 3... 2... 1... Sanash
  startCountdownUI() {
    this.isInRace = true;
    const overlay = document.getElementById('race-countdown-overlay');
    const numberEl = document.getElementById('countdown-number');
    overlay.style.display = 'flex';

    // Xonani yashirish, poyga maydonini ochish
    document.getElementById('multiplayer-lobby-modal').classList.remove('active');
    document.getElementById('race-track-section').style.display = 'flex';
    document.getElementById('test-section').style.display = 'flex';

    // Poyga treki qatorlarini chizish
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
        // Asosiy o'yinni boshlash
        if (window.startMultiplayerGame) {
          window.startMultiplayerGame(this.raceWords);
        }
      }
    }, 1000);
  }

  // Progress yuborish (har bir harf yozilganda)
  sendProgress(progressPercent, currentWpm) {
    const myId = this.peer ? this.peer.id : null;
    if (myId && this.players[myId]) {
      this.players[myId].progress = progressPercent;
      this.players[myId].wpm = currentWpm;
    }

    this.updateRaceTrackUI();

    if (this.isHost) {
      this.broadcast({
        type: 'PROGRESS_UPDATE',
        peerId: myId,
        progress: progressPercent,
        wpm: currentWpm
      });
    } else if (this.hostConnection && this.hostConnection.open) {
      this.hostConnection.send({
        type: 'PROGRESS',
        progress: progressPercent,
        wpm: currentWpm
      });
    }
  }

  // Foydalanuvchi tugatganda
  sendFinish(wpm, accuracy) {
    const myId = this.peer ? this.peer.id : null;
    if (myId && this.players[myId]) {
      this.players[myId].finished = true;
      this.players[myId].wpm = wpm;
      this.players[myId].accuracy = accuracy;
    }

    if (this.isHost) {
      this.checkRaceFinish();
    } else if (this.hostConnection && this.hostConnection.open) {
      this.hostConnection.send({
        type: 'FINISHED',
        wpm: wpm,
        accuracy: accuracy
      });
    }
  }

  // Host marrani tekshirishi
  checkRaceFinish() {
    const allPlayers = Object.values(this.players);
    const sorted = [...allPlayers].sort((a, b) => (b.wpm || 0) - (a.wpm || 0));

    this.broadcast({
      type: 'RACE_FINISHED_SUMMARY',
      leaderboard: sorted
    });

    this.showRaceResults(sorted);
  }

  showRaceResults(leaderboard) {
    this.isInRace = false;
    const modal = document.getElementById('race-results-modal');
    const list = document.getElementById('race-leaderboard-list');
    list.innerHTML = '';

    const myId = this.peer ? this.peer.id : null;
    const isWinner = leaderboard.length > 0 && leaderboard[0].id === myId;
    const myResult = leaderboard.find(p => p.id === myId);

    if (window.authManager) {
      window.authManager.recordRace(isWinner, myResult ? myResult.wpm : 0);
    }

    leaderboard.forEach((player, idx) => {
      const medals = ['🥇 1st Place', '🥈 2nd Place', '🥉 3rd Place'];
      const rankText = medals[idx] || `${idx + 1}th Place`;

      const item = document.createElement('div');
      item.className = 'leaderboard-item' + (player.id === myId ? ' is-me' : '');
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

    modal.classList.add('active');
  }

  // Poyga yo'lakchalari UI
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

  // Lobby (Kutish zali) UI
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
    clearTimeout(this.connectionTimeout);
    if (this.peer) {
      try { this.peer.destroy(); } catch (e) {}
    }
    this.peer = null;
    this.connections = [];
    this.hostConnection = null;
    this.players = {};
    this.isInRace = false;

    document.getElementById('multiplayer-lobby-modal').classList.remove('active');
    document.getElementById('race-track-section').style.display = 'none';
    document.getElementById('test-section').style.display = 'flex';
    document.getElementById('main-config-bar').style.display = 'flex';
    if (window.resetTest) window.resetTest();
  }
}

window.multiplayerManager = new MultiplayerManager();
