// MoonKeyType — PeerJS orqali P2P Multiplayer Poyga Tizimi

class MultiplayerManager {
  constructor() {
    this.peer = null;
    this.connections = []; // Host uchun barcha ulanishlar
    this.hostConnection = null; // Client uchun hostga ulanish
    this.isHost = false;
    this.roomId = null;
    this.players = {}; // { peerId: { name, avatar, progress, wpm, finished, finishTime, rank } }
    this.isInRace = false;
    this.raceWords = [];
    this.countdownTimer = null;
  }

  // Xona kodi yaratish (masalan 482910)
  generateRoomCode() {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  // 1. Yangi xona yaratish (Host)
  createRoom() {
    const user = window.authManager.currentUser || { username: 'Mehmon_' + Math.floor(Math.random() * 100), avatar: '🏎️' };
    this.roomId = this.generateRoomCode();
    this.isHost = true;
    this.players = {};

    const peerId = 'mkt-room-' + this.roomId;

    if (this.peer) this.peer.destroy();

    this.peer = new Peer(peerId, {
      debug: 1
    });

    this.peer.on('open', (id) => {
      console.log('Xona yaratildi, Peer ID:', id);
      this.players[this.peer.id] = {
        id: this.peer.id,
        name: user.username,
        avatar: user.avatar,
        isHost: true,
        progress: 0,
        wpm: 0,
        finished: false
      };
      this.updateLobbyUI();
    });

    this.peer.on('connection', (conn) => {
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
      alert('Xona yaratishda xatolik yuz berdi: ' + err.type);
    });

    return this.roomId;
  }

  // 2. Mavjud xonaga qo'shilish (Client)
  joinRoom(code) {
    code = code.trim().replace('#', '');
    if (!code) {
      alert('Iltimos, xona kodini kiriting!');
      return;
    }

    const user = window.authManager.currentUser || { username: 'Mehmon_' + Math.floor(Math.random() * 100), avatar: '🏎️' };
    this.roomId = code;
    this.isHost = false;

    if (this.peer) this.peer.destroy();

    this.peer = new Peer({ debug: 1 });

    this.peer.on('open', (myPeerId) => {
      const hostPeerId = 'mkt-room-' + this.roomId;
      const conn = this.peer.connect(hostPeerId);
      this.hostConnection = conn;

      conn.on('open', () => {
        console.log('Hostga ulanildi!');
        // O'z ma'lumotlarini hostga yuborish
        conn.send({
          type: 'JOIN',
          player: {
            id: myPeerId,
            name: user.username,
            avatar: user.avatar,
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
        alert("Xona egasi ulanishni to'xtatdi!");
        this.leaveRoom();
      });
    });

    this.peer.on('error', (err) => {
      console.error('PeerJS ulanish xatosi:', err);
      alert('Xonaga ulanib bo\'lmadi! Kodni tekshiring.');
    });
  }

  // Host xabarlarni qabul qilishi
  handleHostData(conn, data) {
    if (data.type === 'JOIN') {
      this.players[conn.peer] = data.player;
      this.broadcastLobby();
      this.updateLobbyUI();
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
      if (conn.open) conn.send(data);
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

    // So'zlar generatsiyasi (hamma uchun bir xil 30 ta so'z)
    const lang = window.state ? window.state.language : 'uzbek';
    const source = (window.WORDS && window.WORDS[lang]) || window.WORDS.uzbek;
    const words = [];
    for (let i = 0; i < 30; i++) {
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
    document.getElementById('test-section').style.display = 'none';

    // Poyga treki qatorlarini chizish
    this.renderRaceTracks();

    let count = 3;
    numberEl.textContent = count;

    // Ovoz
    if (window.soundManager) window.soundManager.playKey(false, false);

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
        window.startMultiplayerGame(this.raceWords);
      }
    }, 1000);
  }

  // Progress yuborish (o'yin davomida harf terilganda chaqiriladi)
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
    const finishedCount = allPlayers.filter(p => p.finished).length;

    // Agar hamma yoki kamida 1-o'rin tugatsa
    const sorted = [...allPlayers].sort((a, b) => (b.wpm || 0) - (a.wpm || 0));

    // Natijalarni uzatish
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
      const medals = ['🥇 1-O\'RIN', '🥈 2-O\'RIN', '🥉 3-O\'RIN'];
      const rankText = medals[idx] || `${idx + 1}-o'rin`;

      const item = document.createElement('div');
      item.className = 'leaderboard-item' + (player.id === myId ? ' is-me' : '');
      item.innerHTML = `
        <div style="display: flex; align-items: center; gap: 0.75rem;">
          <span style="font-size: 1.5rem;">${player.avatar || '🏎️'}</span>
          <div>
            <div style="font-weight: 700; color: var(--text-color);">${player.name}</div>
            <div style="font-size: 0.8rem; color: var(--main-color);">${rankText}</div>
          </div>
        </div>
        <div style="text-align: right;">
          <div style="font-size: 1.5rem; font-weight: 700; color: var(--main-color);">${player.wpm || 0} WPM</div>
          <div style="font-size: 0.75rem; color: var(--sub-color);">${player.accuracy || 100}% aniqlik</div>
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
          <span class="p-avatar">${player.avatar || '🏎️'}</span>
          <span class="p-name">${player.name}</span>
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
        // 0% dan 95% gacha (finishgacha)
        const percent = Math.min(Math.max(player.progress || 0, 0), 96);
        carEl.style.left = `${percent}%`;
      }
      if (wpmTag) {
        wpmTag.textContent = `${player.wpm || 0} WPM`;
      }
    });
  }

  // Lobby (Kutish zali) UI
  updateLobbyUI() {
    const codeEl = document.getElementById('lobby-room-code');
    const playersList = document.getElementById('lobby-players-list');
    const startBtn = document.getElementById('lobby-start-btn');
    const statusText = document.getElementById('lobby-status-text');

    if (codeEl) codeEl.textContent = this.roomId || '---';

    if (playersList) {
      playersList.innerHTML = '';
      Object.values(this.players).forEach(p => {
        const item = document.createElement('div');
        item.className = 'lobby-player-card';
        item.innerHTML = `
          <span style="font-size: 1.5rem;">${p.avatar || '🏎️'}</span>
          <span style="font-weight: 600;">${p.name} ${p.isHost ? '👑' : ''}</span>
        `;
        playersList.appendChild(item);
      });
    }

    if (startBtn) {
      if (this.isHost) {
        startBtn.style.display = 'block';
        startBtn.textContent = "Poygani Boshlash (Start)";
        if (statusText) statusText.textContent = "Do'stlaringiz qo'shilishini kuting va Boshlash tugmasini bosing.";
      } else {
        startBtn.style.display = 'none';
        if (statusText) statusText.textContent = "Xona egasi poygani boshlashini kuting...";
      }
    }
  }

  leaveRoom() {
    if (this.peer) this.peer.destroy();
    this.peer = null;
    this.connections = [];
    this.hostConnection = null;
    this.players = {};
    this.isInRace = false;

    document.getElementById('multiplayer-lobby-modal').classList.remove('active');
    document.getElementById('race-track-section').style.display = 'none';
    document.getElementById('test-section').style.display = 'flex';
    if (window.resetTest) window.resetTest();
  }
}

window.multiplayerManager = new MultiplayerManager();
