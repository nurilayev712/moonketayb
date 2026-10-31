// MoonKeyType — PeerJS orqali P2P Multiplayer Poyga Tizimi (100% Ishonchli va Xatosiz)

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
  }

  // 1. Yangi xona yaratish (Host)
  createRoom() {
    const user = (window.authManager && window.authManager.currentUser) || { 
      username: 'Player_' + Math.floor(Math.random() * 900 + 100), 
      avatar: '⌨️' 
    };

    this.isHost = true;
    this.players = {};

    if (this.peer) {
      try { this.peer.destroy(); } catch (e) {}
    }

    this.updateStatusText("Xona kodi olinmoqda, serverga ulanilmoqda...");
    const codeEl = document.getElementById('lobby-room-code');
    if (codeEl) codeEl.textContent = "Kutilmoqda...";

    try {
      // ID bermasdan yaratamiz — shunda PeerJS serveri 100% xatosiz noyob ID beradi!
      this.peer = new Peer(PEER_CONFIG);

      this.peer.on('open', (id) => {
        console.log('Xona muvaffaqiyatli ochildi, Peer ID:', id);
        this.roomId = id;
        
        if (codeEl) codeEl.textContent = this.roomId;

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
        this.updateStatusText("Xona tayyor! Do'stingizga xona kodini bering.");
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
        this.updateStatusText("Tarmoq xatosi: " + (err.type || 'server band'));
        alert('Serverga ulanishda xatolik yuz berdi. Iltimos qayta urinib ko\'ring.');
      });

    } catch (e) {
      console.error(e);
      alert("Xona yaratishda xatolik yuz berdi!");
    }
  }

  // 2. Mavjud xonaga qo'shilish (Client)
  joinRoom(code) {
    code = code.trim();
    if (!code) {
      alert('Iltimos, xona kodini kiriting!');
      return;
    }

    const user = (window.authManager && window.authManager.currentUser) || { 
      username: 'Player_' + Math.floor(Math.random() * 900 + 100), 
      avatar: '⌨️' 
    };

    this.roomId = code;
    this.isHost = false;
    this.players = {};

    if (this.peer) {
      try { this.peer.destroy(); } catch (e) {}
    }

    this.updateStatusText("Xonaga ulanilmoqda, kuting...");
    const codeEl = document.getElementById('lobby-room-code');
    if (codeEl) codeEl.textContent = this.roomId;

    try {
      this.peer = new Peer(PEER_CONFIG);

      this.peer.on('open', (myPeerId) => {
        console.log('Mening Peer ID im:', myPeerId);
        const conn = this.peer.connect(this.roomId, { reliable: true });
        this.hostConnection = conn;

        // Ulanish uchun 10 soniya timeout
        const timer = setTimeout(() => {
          if (!conn.open) {
            alert("Xonaga ulanib bo'lmadi! Xona kodi noto'g'ri yoki xona egasi sahifadan chiqqan.");
            this.leaveRoom();
          }
        }, 10000);

        conn.on('open', () => {
          clearTimeout(timer);
          console.log('Hostga muvaffaqiyatli ulandik!');
          this.updateStatusText("Xonaga ulandingiz! Xona egasi o'yinni boshlashini kuting.");

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
          alert("Xona egasi ulanishni yopdi!");
          this.leaveRoom();
        });
      });

      this.peer.on('error', (err) => {
        console.error('PeerJS ulanish xatosi:', err);
        alert('Xonaga ulanib bo\'lmadi! Kodni to\'g\'ri kiritganingizni tekshiring.');
        this.leaveRoom();
      });

    } catch (e) {
      console.error(e);
      alert("Xonaga ulanishda xatolik yuz berdi!");
    }
  }

  handleHostData(conn, data) {
    if (data.type === 'JOIN') {
      this.players[conn.peer] = data.player;
      this.broadcastLobby();
      this.updateLobbyUI();
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

    this.broadcast({
      type: 'START_COUNTDOWN',
      words: words
    });

    this.startCountdownUI();
  }

  startCountdownUI() {
    this.isInRace = true;
    const overlay = document.getElementById('race-countdown-overlay');
    const numberEl = document.getElementById('countdown-number');
    overlay.style.display = 'flex';

    document.getElementById('multiplayer-lobby-modal').classList.remove('active');
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
