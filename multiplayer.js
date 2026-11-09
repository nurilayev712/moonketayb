function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/[&<>"']/g, m => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  }[m]));
}

class MultiplayerManager {
  constructor() {
    this.client = null;
    this.roomId = null;
    this.roomMode = 'time'; // 'time' yoki 'words'
    this.roomLimit = 30; // 15, 30, 60 yoki 25, 50
    this.roomLang = 'uzbek'; // 'uzbek', 'english', 'russian'
    this.myId = 'usr_' + Math.random().toString(36).substring(2, 9);
    this.players = {}; // { id: { id, name, avatar, isHost, isReady, progress, wpm, finished, accuracy } }
    this.isInRace = false;
    this.raceWords = [];
    this.countdownTimer = null;
    this.pingInterval = null;
    this.raceFinishTimeout = null;
    this.isVerifyingRoom = false;
    this.joinVerificationTimeout = null;
    this.joinRetryTimer = null;
    this.joinWatchdogTimeout = null;

    window.addEventListener('resize', () => {
      if (this.isInRace) this.renderTribeCarets();
    });
    window.addEventListener('DOMContentLoaded', () => {
      const wc = document.getElementById('words-container');
      if (wc) {
        wc.addEventListener('scroll', () => {
          if (this.isInRace) this.renderTribeCarets();
        });
      }
    });

    window.addEventListener('beforeunload', () => {
      if (this.isHost && this.roomId && this.client && this.client.isConnected()) {
        try {
          this.sendMessage({
            type: 'ROOM_ANNOUNCE',
            roomId: this.roomId,
            active: false
          }, true);
        } catch (e) {}
      }
    });
  }

  // 6 xonali tasodifiy xona kodi (masalan: 749201)
  generateRoomCode() {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  // Tarmoq kechikishini doimiy tekshirib turish (Ping)
  startPingLoop() {
    this.stopPingLoop();
    this.pingInterval = setInterval(() => {
      if (this.client && this.client.isConnected && this.client.isConnected()) {
        this.sendMessage({
          type: 'PING',
          senderId: this.myId,
          sentAt: Date.now()
        });
      }
    }, 4000);
  }

  stopPingLoop() {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }

  updatePingUI(ms) {
    const badge = document.getElementById('lobby-ping-badge');
    if (!badge) return;
    badge.classList.remove('ping-good', 'ping-medium', 'ping-poor');
    if (ms < 75) {
      badge.textContent = `🟢 ${ms}ms`;
      badge.classList.add('ping-good');
    } else if (ms < 160) {
      badge.textContent = `🟡 ${ms}ms`;
      badge.classList.add('ping-medium');
    } else {
      badge.textContent = `🔴 ${ms}ms`;
      badge.classList.add('ping-poor');
    }
  }

  // Tizim xabarini chatga qo'shish
  displaySystemMessage(text) {
    const box = document.getElementById('lobby-chat-messages');
    if (!box) return;
    const hint = box.querySelector('.chat-hint');
    if (hint) hint.remove();

    const el = document.createElement('div');
    el.className = 'chat-system-msg';
    el.textContent = text;
    box.appendChild(el);
    box.scrollTop = box.scrollHeight;
  }

  // Host: O'yinchini xonadan chetlatish (Kick)
  kickPlayer(targetId) {
    if (!this.isHost) return;
    const target = this.players[targetId];
    const name = target ? target.name : "Ishtirokchi";
    this.sendMessage({
      type: 'KICK_PLAYER',
      targetId: targetId,
      targetName: name
    });
    delete this.players[targetId];
    this.updateLobbyUI();
    this.displaySystemMessage(`🚫 ${name} xonadan chiqarildi`);
  }

  // 1. Yangi xona yaratish (Host)
  createRoom(initialMode, initialLimit, initialLang) {
    this.roomId = this.generateRoomCode();
    this.isHost = true;
    this.isReady = true;
    this.roomMode = initialMode || 'time';
    this.roomLimit = initialLimit || (this.roomMode === 'time' ? 30 : 25);
    this.roomLang = initialLang || (window.state && window.state.language) || 'english';
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
      isReady: true,
      progress: 0,
      wpm: 0,
      finished: false,
      accuracy: 100
    };

    const codeEl = document.getElementById('lobby-room-code');
    if (codeEl) codeEl.textContent = this.roomId;

    this.updateLobbyUI();
    this.updateStatusText("Xona tayyor! Do'stingizga xona kodini bering.");

    this.connectToBroker();
    return this.roomId;
  }

  // Barcha xona ulanish taymerlarini tozalash
  clearJoinTimers() {
    if (this.joinVerificationTimeout) {
      clearTimeout(this.joinVerificationTimeout);
      this.joinVerificationTimeout = null;
    }
    if (this.joinRetryTimer) {
      clearTimeout(this.joinRetryTimer);
      this.joinRetryTimer = null;
    }
    if (this.joinWatchdogTimeout) {
      clearTimeout(this.joinWatchdogTimeout);
      this.joinWatchdogTimeout = null;
    }
  }

  // 2. Mavjud xonaga qo'shilish (Client)
  joinRoom(code) {
    code = (code || '').trim();
    if (!code) {
      alert("⚠️ Iltimos, xona kodini kiriting!");
      return;
    }

    const isPublic = (code === 'arena_public');
    if (!isPublic && !/^\d{6}$/.test(code)) {
      alert("⚠️ Noto'g'ri xona kodi!\n\nXona kodi 6 xonali raqamdan iborat bo'lishi kerak (masalan: 123456).");
      return;
    }

    // Tugmani yuklanish holatiga o'tkazish
    const joinBtn = document.getElementById('join-room-btn');
    if (joinBtn) {
      joinBtn.disabled = true;
      joinBtn.innerHTML = '⏳ Xonaga ulanilmoqda...';
    }

    this.roomId = code;
    this.isHost = false;
    this.isReady = false;
    this.isVerifyingRoom = !isPublic;
    this.players = {};

    const user = (window.authManager && window.authManager.currentUser) || {
      username: 'Mehmon_' + Math.floor(Math.random() * 900 + 100),
      avatar: '⌨️'
    };

    this.players[this.myId] = {
      id: this.myId,
      name: user.username,
      avatar: user.avatar || '⌨️',
      isHost: false,
      isReady: false,
      progress: 0,
      wpm: 0,
      finished: false,
      accuracy: 100
    };

    this.clearJoinTimers();

    // 14 soniyalik umumiy tarmoq xavfsizlik taymeri
    this.joinWatchdogTimeout = setTimeout(() => {
      this.joinWatchdogTimeout = null;
      if (this.isVerifyingRoom) {
        this.cleanupFailedJoin();
        alert("⚠️ Tarmoq xatosi: Xona bilan aloqa o'rnatib bo'lmadi.\n\nIltimos, internet aloqangizni tekshirib qaytadan urinib ko'ring.");
      }
    }, 14000);

    this.connectToBroker();
  }

  onRoomJoinSuccess() {
    this.clearJoinTimers();
    this.isVerifyingRoom = false;
    this.restoreJoinBtnUI();

    const multiModal = document.getElementById('multiplayer-modal');
    const lobbyModal = document.getElementById('multiplayer-lobby-modal');

    if (window.closeAppModal) {
      window.closeAppModal(multiModal);
    } else if (multiModal) {
      multiModal.classList.remove('active');
    }

    if (window.openAppModal) {
      window.openAppModal(lobbyModal);
    } else if (lobbyModal) {
      lobbyModal.classList.add('active');
    }

    const codeEl = document.getElementById('lobby-room-code');
    if (codeEl) codeEl.textContent = this.roomId;

    this.updateLobbyUI();
    this.updateStatusText("Xonaga muvaffaqiyatli ulandingiz! Tayyor bo'lgach 'Tayyorman' tugmasini bosing.");
  }

  onRoomNotFound() {
    this.cleanupFailedJoin();
    alert("❌ Bunday xona topilmadi!\n\nXona kodi noto'g'ri kiritilgan yoki xona egasi xonani tark etgan. Iltimos, xona kodini tekshirib qaytadan urinib ko'ring.");
  }

  cleanupFailedJoin() {
    this.isVerifyingRoom = false;
    this.clearJoinTimers();
    if (this.client) {
      try {
        this.client.disconnect();
      } catch (e) {}
      this.client = null;
    }
    this.roomId = null;
    this.players = {};
    this.stopPingLoop();
    this.restoreJoinBtnUI();
  }

  restoreJoinBtnUI() {
    const joinBtn = document.getElementById('join-room-btn');
    if (joinBtn) {
      joinBtn.disabled = false;
      joinBtn.innerHTML = `
        <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z"/></svg>
        xonaga ulanish
      `;
    }
  }

  // Host: Xona parametrlarini o'zgartirish (Vaqt yoki So'zlar)
  setRoomConfig(mode, limit) {
    if (!this.isHost) return;
    this.roomMode = mode;
    this.roomLimit = limit;
    this.updateLobbyUI();

    this.sendMessage({
      type: 'ROOM_CONFIG',
      roomMode: this.roomMode,
      roomLimit: this.roomLimit,
      roomLang: this.roomLang
    });

    this.sendMessage({
      type: 'ROOM_ANNOUNCE',
      roomId: this.roomId,
      hostId: this.myId,
      roomMode: this.roomMode,
      roomLimit: this.roomLimit,
      roomLang: this.roomLang,
      active: true
    }, true);
  }

  // Host: Lug'at tilini o'zgartirish
  setRoomLang(lang) {
    if (!this.isHost) return;
    this.roomLang = lang;
    if (window.state) {
      window.state.language = lang;
    }
    this.updateLobbyUI();

    this.sendMessage({
      type: 'ROOM_CONFIG',
      roomMode: this.roomMode,
      roomLimit: this.roomLimit,
      roomLang: this.roomLang
    });

    this.sendMessage({
      type: 'ROOM_ANNOUNCE',
      roomId: this.roomId,
      hostId: this.myId,
      roomMode: this.roomMode,
      roomLimit: this.roomLimit,
      roomLang: this.roomLang,
      active: true
    }, true);
  }

  // Guest: Tayyorlik holatini almashtirish (Ready toggle)
  toggleReady() {
    if (this.isHost) return;
    this.isReady = !this.isReady;
    if (this.players[this.myId]) {
      this.players[this.myId].isReady = this.isReady;
    }
    this.updateLobbyUI();

    this.sendMessage({
      type: 'PLAYER_READY',
      id: this.myId,
      isReady: this.isReady
    });
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
          this.updatePingUI(999);
          // Agar biz hali ham xonada bo'lsak, darhol avtomatik qayta ulanish
          if (this.roomId) {
            setTimeout(() => {
              if (this.roomId && (!this.client || !this.client.isConnected())) {
                console.log("MQTT xonaga avtomatik qayta ulanmoqda...");
                this.connectToBroker();
              }
            }, 1500);
          }
        }
      };

      this.client.onMessageArrived = (message) => {
        this.handleIncomingMessage(message.payloadString);
      };

      const connectOptions = {
        useSSL: true,
        timeout: 6,
        keepAliveInterval: 30,
        cleanSession: true,
        onSuccess: () => {
          console.log("MQTT Brokerga muvaffaqiyatli ulandik!");
          const topic = `mkt/race/${this.roomId}`;
          this.client.subscribe(topic);
          this.startPingLoop();

          const myPlayer = this.players[this.myId];

          if (this.isHost) {
            this.updateStatusText("Xona tayyor! Do'stlaringiz qo'shilishini kuting.");
            // Host xona mavjudligini brokerda e'lon qiladi (Retained MQTT message)
            this.sendMessage({
              type: 'ROOM_ANNOUNCE',
              roomId: this.roomId,
              hostId: this.myId,
              roomMode: this.roomMode,
              roomLimit: this.roomLimit,
              roomLang: this.roomLang,
              sentAt: Date.now(),
              active: true
            }, true);
          } else {
            const isPublic = (this.roomId === 'arena_public');
            if (isPublic) {
              this.onRoomJoinSuccess();
              this.sendMessage({
                type: 'PLAYER_JOIN',
                player: myPlayer
              });
            } else {
              const joinBtn = document.getElementById('join-room-btn');
              if (joinBtn) joinBtn.innerHTML = '⏳ Xona tekshirilmoqda...';

              // Hostga qo'shilganimiz haqida xabar yuboramiz
              this.sendMessage({
                type: 'PLAYER_JOIN',
                player: myPlayer
              });

              // Paket yo'qolishiga qarshi 1.6s va 3.4s da takroriy so'rov
              this.joinRetryTimer = setTimeout(() => {
                if (this.isVerifyingRoom) {
                  this.sendMessage({
                    type: 'PLAYER_JOIN',
                    player: myPlayer
                  });
                  this.joinRetryTimer = setTimeout(() => {
                    if (this.isVerifyingRoom) {
                      this.sendMessage({
                        type: 'PLAYER_JOIN',
                        player: myPlayer
                      });
                    }
                  }, 1800);
                }
              }, 1600);

              // 8.5 soniyada xona egasidan javob kelmasa (brokerga ulangan holda)
              this.joinVerificationTimeout = setTimeout(() => {
                this.joinVerificationTimeout = null;
                if (this.isVerifyingRoom) {
                  this.onRoomNotFound();
                }
              }, 8500);
            }
          }
        },
        onFailure: (err) => {
          console.error("Brokerga ulanish muvaffaqiyatsiz bo'ldi, zaxira brokerga urinilmoqda...", err);
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

      this.client.onConnectionLost = (responseObject) => {
        if (responseObject.errorCode !== 0) {
          console.warn("Zaxira broker ulanish uzildi:", responseObject.errorMessage);
          this.updatePingUI(999);
          if (this.roomId) {
            setTimeout(() => {
              if (this.roomId && (!this.client || !this.client.isConnected())) {
                this.connectToFallbackBroker();
              }
            }, 1500);
          }
        }
      };

      this.client.onMessageArrived = (message) => {
        this.handleIncomingMessage(message.payloadString);
      };

      this.client.connect({
        useSSL: true,
        timeout: 7,
        keepAliveInterval: 30,
        cleanSession: true,
        onSuccess: () => {
          const topic = `mkt/race/${this.roomId}`;
          this.client.subscribe(topic);
          this.startPingLoop();
          const myPlayer = this.players[this.myId];
          if (this.isHost) {
            this.updateStatusText("Xona tayyor! Do'stlaringiz qo'shilishini kuting.");
            this.sendMessage({
              type: 'ROOM_ANNOUNCE',
              roomId: this.roomId,
              hostId: this.myId,
              roomMode: this.roomMode,
              roomLimit: this.roomLimit,
              roomLang: this.roomLang,
              sentAt: Date.now(),
              active: true
            }, true);
          } else {
            const isPublic = (this.roomId === 'arena_public');
            if (isPublic) {
              this.onRoomJoinSuccess();
              this.sendMessage({
                type: 'PLAYER_JOIN',
                player: myPlayer
              });
            } else {
              const joinBtn = document.getElementById('join-room-btn');
              if (joinBtn) joinBtn.innerHTML = '⏳ Xona tekshirilmoqda...';

              this.sendMessage({
                type: 'PLAYER_JOIN',
                player: myPlayer
              });
              this.joinRetryTimer = setTimeout(() => {
                if (this.isVerifyingRoom) {
                  this.sendMessage({
                    type: 'PLAYER_JOIN',
                    player: myPlayer
                  });
                  this.joinRetryTimer = setTimeout(() => {
                    if (this.isVerifyingRoom) {
                      this.sendMessage({
                        type: 'PLAYER_JOIN',
                        player: myPlayer
                      });
                    }
                  }, 1800);
                }
              }, 1600);
              this.joinVerificationTimeout = setTimeout(() => {
                this.joinVerificationTimeout = null;
                if (this.isVerifyingRoom) {
                  this.onRoomNotFound();
                }
              }, 8500);
            }
          }
        },
        onFailure: () => {
          if (this.isVerifyingRoom) {
            this.cleanupFailedJoin();
            alert("⚠️ Tarmoq xatosi: Serverga ulanib bo'lmadi.\n\nIltimos, internet aloqangizni tekshirib qaytadan urinib ko'ring.");
          } else {
            this.updateStatusText("Tarmoq xatosi. Iltimos internet aloqasini tekshiring.");
          }
        }
      });
    } catch (err) {
      console.error(err);
    }
  }

  // Xabar yuborish
  sendMessage(dataObj, retained = false) {
    if (!this.client || !this.client.isConnected()) return;
    try {
      const topic = `mkt/race/${this.roomId}`;
      const msgStr = JSON.stringify(dataObj);
      const message = new Paho.MQTT.Message(msgStr);
      message.destinationName = topic;
      if (retained) {
        message.retained = true;
      }
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

    // 0. Xona e'loni (ROOM_ANNOUNCE) kelganda
    if (data.type === 'ROOM_ANNOUNCE') {
      if (data.roomId === this.roomId) {
        if (data.active === false) {
          // Faqat so'nggi 25 soniya ichida yuborilgan yangi yopilish xabari hisobga olinadi (eski xabarlardan himoya)
          if (!data.sentAt || Math.abs(Date.now() - data.sentAt) < 25000) {
            if (this.isVerifyingRoom) {
              this.cleanupFailedJoin();
              alert("❌ Bu xona yopilgan yoki xona egasi xonani tark etgan.");
            }
          }
          return;
        }

        if (this.isVerifyingRoom) {
          this.isVerifyingRoom = false;
          this.clearJoinTimers();
          this.onRoomJoinSuccess();
        }

        if (data.roomMode) this.roomMode = data.roomMode;
        if (data.roomLimit) this.roomLimit = data.roomLimit;
        if (data.roomLang) {
          this.roomLang = data.roomLang;
          if (window.state) window.state.language = data.roomLang;
        }
        this.updateLobbyUI();

        if (!this.isHost && this.players[this.myId]) {
          this.sendMessage({
            type: 'PLAYER_JOIN',
            player: this.players[this.myId]
          });
        }
      }
      return;
    }

    // 0. PING kelganda
    else if (data.type === 'PING') {
      if (data.senderId === this.myId) {
        const latency = Math.max(1, Date.now() - data.sentAt);
        this.updatePingUI(latency);
      }
      return;
    }

    // 1. Yangi o'yinchi qo'shilganda
    else if (data.type === 'PLAYER_JOIN') {
      const isNew = !this.players[data.player.id];
      this.players[data.player.id] = data.player;
      this.updateLobbyUI();

      if (isNew && data.player.id !== this.myId) {
        if (window.soundManager) window.soundManager.playChime();
        this.displaySystemMessage(`👋 ${escapeHtml(data.player.name)} xonaga qo'shildi`);
      }

      // Agar biz host bo'lsak, yangi o'yinchiga butun lobby holatini yuboramiz
      if (this.isHost) {
        if (this.isInRace) {
          this.sendMessage({
            type: 'ROOM_BUSY',
            targetId: data.player.id
          });
          return;
        }
        this.sendMessage({
          type: 'SYNC_LOBBY',
          hostId: this.myId,
          players: this.players,
          roomMode: this.roomMode,
          roomLimit: this.roomLimit,
          roomLang: this.roomLang
        });
      }
    }

    // 2. Lobby sinxronizatsiyasi
    else if (data.type === 'SYNC_LOBBY') {
      if (this.isVerifyingRoom) {
        this.isVerifyingRoom = false;
        this.clearJoinTimers();
        this.onRoomJoinSuccess();
      }

      this.players = Object.assign({}, this.players, data.players);
      if (data.roomMode) this.roomMode = data.roomMode;
      if (data.roomLimit) this.roomLimit = data.roomLimit;
      if (data.roomLang) {
        this.roomLang = data.roomLang;
        if (window.state) window.state.language = data.roomLang;
      }
      this.updateLobbyUI();
    }

    // Xona band bo'lganda (poyga ketayotgan bo'lsa)
    else if (data.type === 'ROOM_BUSY') {
      if (data.targetId === this.myId) {
        this.cleanupFailedJoin();
        alert("⚠️ Bu xonada ayni paytda poyga ketmoqda!\n\nIltimos, poyga tugashini kuting yoki o'zingiz yangi xona oching.");
      }
    }

    // 3. Xona egasi parametrlarni o'zgartirganda
    else if (data.type === 'ROOM_CONFIG') {
      this.roomMode = data.roomMode;
      this.roomLimit = data.roomLimit;
      if (data.roomLang) {
        this.roomLang = data.roomLang;
        if (window.state) window.state.language = data.roomLang;
      }
      const modeStr = this.roomMode === 'time' ? `${this.roomLimit}s` : `${this.roomLimit} so'z`;
      this.displaySystemMessage(`⚙️ Xona sozlamasi yangilandi: ${modeStr} (${this.roomLang || 'uzbek'})`);
      this.updateLobbyUI();
    }

    // 4. O'yinchi tayyorlik holatini o'zgartirganda
    else if (data.type === 'PLAYER_READY') {
      if (this.players[data.id]) {
        this.players[data.id].isReady = data.isReady;
        this.updateLobbyUI();
        if (window.soundManager) window.soundManager.playKey(false, false);
      }
    }

    // 5. Poyga boshlanishi (3.. 2.. 1.. START)
    else if (data.type === 'START_RACE') {
      this.raceWords = data.words;
      if (data.roomMode) this.roomMode = data.roomMode;
      if (data.roomLimit) this.roomLimit = data.roomLimit;
      if (data.roomLang && window.state) window.state.language = data.roomLang;
      this.startCountdownUI();
    }

    // 6. Progress yangilanishi
    else if (data.type === 'PROGRESS') {
      if (this.players[data.id]) {
        this.players[data.id].progress = data.progress;
        this.players[data.id].wpm = data.wpm;
        if (typeof data.wordIndex === 'number') this.players[data.id].wordIndex = data.wordIndex;
        if (typeof data.letterIndex === 'number') this.players[data.id].letterIndex = data.letterIndex;
        this.updateRaceTrackUI();
      }
    }

    // 7. Biror o'yinchi marraga yetganda
    else if (data.type === 'FINISH') {
      if (this.players[data.id]) {
        this.players[data.id].finished = true;
        this.players[data.id].wpm = data.wpm;
        this.players[data.id].accuracy = data.accuracy;
        this.updateRaceTrackUI();
      }
      if (this.isHost) {
        this.checkRaceFinish();
      }
    }

    // 8. G'oliblar yakuniy taxtasi
    else if (data.type === 'LEADERBOARD') {
      this.showRaceResults(data.leaderboard);
    }

    // 9. Yana o'ynash (Lobbyga qaytish)
    else if (data.type === 'RACE_AGAIN') {
      this.resetToLobby();
    }

    // 10. Jonli Chat xabari
    else if (data.type === 'CHAT') {
      this.displayChatMessage(data.sender, data.avatar, data.text, data.senderId === this.myId);
    }

    // 11. Jonli Emoji reaksiyasi
    else if (data.type === 'REACTION') {
      this.triggerFloatingEmoji(data.emoji, data.sender);
    }

    // 12. O'yinchini chetlatish (KICK_PLAYER)
    else if (data.type === 'KICK_PLAYER') {
      if (data.targetId === this.myId) {
        alert("⚠️ Siz xona egasi tomonidan xonadan chetlatildingiz.");
        this.leaveRoom();
        return;
      }
      delete this.players[data.targetId];
      this.updateLobbyUI();
      this.displaySystemMessage(`🚫 ${escapeHtml(data.targetName)} xonadan chetlatildi`);
    }

    // 13. O'yinchi xonadan chiqqanda
    else if (data.type === 'PLAYER_LEAVE') {
      const leftPlayer = this.players[data.id];
      const leftName = leftPlayer ? leftPlayer.name : "Ishtirokchi";
      const wasHost = leftPlayer ? leftPlayer.isHost : false;

      // Kursor va trek elementlarini tozalash
      const caretEl = document.getElementById('tribe-caret-' + data.id);
      if (caretEl) caretEl.remove();
      const trackEl = document.getElementById('track-' + data.id);
      if (trackEl) trackEl.remove();

      delete this.players[data.id];

      // Agar xona egasi chiqib ketgan bo'lsa, navbatdagi o'yinchiga host topshiriladi
      if (wasHost) {
        const remainingIds = Object.keys(this.players);
        if (remainingIds.length > 0) {
          const nextHostId = remainingIds[0];
          this.players[nextHostId].isHost = true;
          this.players[nextHostId].isReady = true;
          if (nextHostId === this.myId) {
            this.isHost = true;
            this.isReady = true;
            this.displaySystemMessage("👑 Siz yangi xona egasi (Host) bo'ldingiz!");
          }
        }
      }

      this.displaySystemMessage(`🚪 ${escapeHtml(leftName)} xonadan chiqdi`);
      this.updateLobbyUI();
      if (this.isInRace) {
        this.updateRaceTrackUI();
        if (this.isHost) {
          this.checkRaceFinish();
        }
      }
    }
  }

  // Jonli chat xabari yuborish
  sendChatMessage(text) {
    text = (text || '').trim();
    if (!text) return;
    const user = (window.authManager && window.authManager.currentUser) || {
      username: (this.isHost ? 'Host' : 'Mehmon'),
      avatar: '⌨️'
    };
    this.sendMessage({
      type: 'CHAT',
      senderId: this.myId,
      sender: user.username,
      avatar: user.avatar || '⌨️',
      text: text
    });
  }

  // Emoji reaksiyasi yuborish
  sendReaction(emoji) {
    const user = (window.authManager && window.authManager.currentUser) || {
      username: (this.isHost ? 'Host' : 'Mehmon')
    };
    this.sendMessage({
      type: 'REACTION',
      senderId: this.myId,
      sender: user.username,
      emoji: emoji
    });
  }

  displayChatMessage(sender, avatar, text, isMe) {
    const box = document.getElementById('lobby-chat-messages');
    if (!box) return;
    const hint = box.querySelector('.chat-hint');
    if (hint) hint.remove();

    const bubble = document.createElement('div');
    bubble.className = 'chat-bubble' + (isMe ? ' is-me' : '');
    bubble.innerHTML = `
      <span>${avatar || '⌨️'}</span>
      <span class="c-user">${escapeHtml(sender)}:</span>
      <span class="c-text">${escapeHtml(text)}</span>
    `;
    box.appendChild(bubble);
    box.scrollTop = box.scrollHeight;
  }

  triggerFloatingEmoji(emoji, sender) {
    const lobbyModal = document.querySelector('#multiplayer-lobby-modal .modal');
    if (!lobbyModal) return;
    const el = document.createElement('div');
    el.className = 'floating-emoji';
    el.textContent = emoji;
    const randomLeft = 25 + Math.random() * 50;
    el.style.left = `${randomLeft}%`;
    el.style.top = `60%`;
    lobbyModal.appendChild(el);
    setTimeout(() => { el.remove(); }, 1500);
  }

  // Host o'yinni boshlashi
  startRace() {
    if (!this.isHost) return;

    const lang = this.roomLang || (window.state && window.state.language) || 'english';
    const source = (window.WORDS && window.WORDS[lang]) || (window.WORDS && window.WORDS.english) || (window.WORDS && window.WORDS.uzbek) || [];
    const words = [];
    
    // Monkeytype 1:1 - Time rejimida so'zlar yetib ortishi uchun (kamida 300 - 800 ta so'z), words rejimida limit miqdoricha
    const count = this.roomMode === 'time' ? Math.max(300, Math.round((this.roomLimit || 30) * 8)) : (this.roomLimit || 25);
    let prev = '';
    for (let i = 0; i < count; i++) {
      let w = source[Math.floor(Math.random() * source.length)];
      if (source.length > 1) {
        let attempts = 0;
        while (w === prev && attempts < 10) {
          w = source[Math.floor(Math.random() * source.length)];
          attempts++;
        }
      }
      prev = w;
      words.push(w);
    }

    this.raceWords = words;

    // Barcha o'yinchilarga boshlash xabarini yuboramiz
    this.sendMessage({
      type: 'START_RACE',
      words: words,
      roomMode: this.roomMode,
      roomLimit: this.roomLimit,
      roomLang: this.roomLang
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
    if (window.soundManager) window.soundManager.playBeep(false);

    clearInterval(this.countdownTimer);
    this.countdownTimer = setInterval(() => {
      count--;
      if (count > 0) {
        numberEl.textContent = count;
        if (window.soundManager) window.soundManager.playBeep(false);
      } else if (count === 0) {
        numberEl.textContent = 'START!';
        if (window.soundManager) window.soundManager.playBeep(true);
      } else {
        clearInterval(this.countdownTimer);
        overlay.style.display = 'none';
        if (window.startMultiplayerGame) {
          window.startMultiplayerGame(this.raceWords, this.roomMode, this.roomLimit);
        }
      }
    }, 1000);
  }

  // Har bir harf bosilganda progress yuborish
  sendProgress(progressPercent, currentWpm, wordIndex, letterIndex) {
    if (this.players[this.myId]) {
      this.players[this.myId].progress = progressPercent;
      this.players[this.myId].wpm = currentWpm;
      if (typeof wordIndex === 'number') this.players[this.myId].wordIndex = wordIndex;
      if (typeof letterIndex === 'number') this.players[this.myId].letterIndex = letterIndex;
    }
    this.updateRaceTrackUI();

    this.sendMessage({
      type: 'PROGRESS',
      id: this.myId,
      progress: progressPercent,
      wpm: currentWpm,
      wordIndex: typeof wordIndex === 'number' ? wordIndex : 0,
      letterIndex: typeof letterIndex === 'number' ? letterIndex : 0
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

    // Agar o'zi host bo'lsa darhol marrani tekshirish
    if (this.isHost) {
      this.checkRaceFinish();
    }
  }

  // Host marrani tekshirib shohsupa e'lon qilishi
  checkRaceFinish(force = false) {
    const allPlayers = Object.values(this.players);
    if (allPlayers.length === 0) return;
    const allFinished = allPlayers.every(p => p.finished);

    if (allFinished || force) {
      if (this.raceFinishTimeout) {
        clearTimeout(this.raceFinishTimeout);
        this.raceFinishTimeout = null;
      }
      const sorted = [...allPlayers].sort((a, b) => (b.wpm || 0) - (a.wpm || 0));

      this.sendMessage({
        type: 'LEADERBOARD',
        leaderboard: sorted
      });
      // Host uchun natijani darhol ko'rsatish
      this.showRaceResults(sorted);
    } else if (!this.raceFinishTimeout) {
      // Birinchi o'yinchi marraga yetganda boshqalarga yakunlash uchun 8 soniya muhlat berish
      this.raceFinishTimeout = setTimeout(() => {
        this.raceFinishTimeout = null;
        this.checkRaceFinish(true);
      }, 8000);
    }
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

    // G'alaba shohsupasi jarangi
    if (window.soundManager) {
      window.soundManager.playVictory();
    }

    // Shohsupa (Podium top 3) elementlarini to'ldirish
    const step1 = document.getElementById('podium-step-1');
    const step2 = document.getElementById('podium-step-2');
    const step3 = document.getElementById('podium-step-3');

    if (leaderboard[0] && step1) {
      step1.style.display = 'flex';
      document.getElementById('podium-avatar-1').textContent = leaderboard[0].avatar || '⌨️';
      document.getElementById('podium-name-1').textContent = leaderboard[0].name;
      document.getElementById('podium-wpm-1').textContent = `${leaderboard[0].wpm || 0} WPM`;
    } else if (step1) {
      step1.style.display = 'none';
    }

    if (leaderboard[1] && step2) {
      step2.style.display = 'flex';
      document.getElementById('podium-avatar-2').textContent = leaderboard[1].avatar || '⌨️';
      document.getElementById('podium-name-2').textContent = leaderboard[1].name;
      document.getElementById('podium-wpm-2').textContent = `${leaderboard[1].wpm || 0} WPM`;
    } else if (step2) {
      step2.style.display = 'none';
    }

    if (leaderboard[2] && step3) {
      step3.style.display = 'flex';
      document.getElementById('podium-avatar-3').textContent = leaderboard[2].avatar || '⌨️';
      document.getElementById('podium-name-3').textContent = leaderboard[2].name;
      document.getElementById('podium-wpm-3').textContent = `${leaderboard[2].wpm || 0} WPM`;
    } else if (step3) {
      step3.style.display = 'none';
    }

    leaderboard.forEach((player, idx) => {
      const medals = ["🥇 1-o'rin (G'olib)", "🥈 2-o'rin", "🥉 3-o'rin"];
      const rankText = medals[idx] || `${idx + 1}-o'rin`;

      const item = document.createElement('div');
      item.className = 'leaderboard-item' + (player.id === this.myId ? ' is-me' : '');
      item.innerHTML = `
        <div style="display: flex; align-items: center; gap: 0.75rem;">
          <span style="font-size: 1.5rem;">${player.avatar || '⌨️'}</span>
          <div>
            <div style="font-weight: 700; color: var(--text-color);">${escapeHtml(player.name)} ${player.id === this.myId ? '<span style="color:var(--main-color);">(siz)</span>' : ''}</div>
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

    if (window.openAppModal) {
      window.openAppModal(modal);
    } else {
      modal.classList.add('active');
    }
  }

  // Yana o'ynash tugmasi bosilganda (barchani kutish zaliga qaytarish)
  requestRaceAgain() {
    this.sendMessage({
      type: 'RACE_AGAIN'
    });
    this.resetToLobby();
  }

  resetToLobby() {
    this.isInRace = false;
    if (this.raceFinishTimeout) {
      clearTimeout(this.raceFinishTimeout);
      this.raceFinishTimeout = null;
    }

    // Reset player scores
    Object.values(this.players).forEach(p => {
      p.progress = 0;
      p.wpm = 0;
      p.wordIndex = 0;
      p.letterIndex = 0;
      p.finished = false;
      if (!p.isHost) p.isReady = false;
    });

    if (!this.isHost) {
      this.isReady = false;
    }

    const resultsModal = document.getElementById('race-results-modal');
    if (window.closeAppModal) {
      window.closeAppModal(resultsModal);
    } else if (resultsModal) {
      resultsModal.classList.remove('active');
    }

    const lobbyModal = document.getElementById('multiplayer-lobby-modal');
    if (window.openAppModal) {
      window.openAppModal(lobbyModal);
    } else if (lobbyModal) {
      lobbyModal.classList.add('active');
    }

    const caretsContainer = document.getElementById('tribe-carets-container');
    if (caretsContainer) caretsContainer.innerHTML = '';
    const deltaEl = document.getElementById('tribe-delta');
    if (deltaEl) deltaEl.style.display = 'none';

    document.getElementById('race-track-section').style.display = 'none';
    document.getElementById('main-config-bar').style.display = 'flex';

    if (window.resetTest) {
      window.resetTest();
    }

    this.updateLobbyUI();
  }

  renderRaceTracks() {
    const container = document.getElementById('race-tracks-container');
    if (!container) return;
    container.innerHTML = '';

    const roomLabel = document.getElementById('arena-room-label');
    if (roomLabel) roomLabel.textContent = `tribe #${this.roomId || '------'}`;
    const modeLabel = document.getElementById('arena-spec-mode');
    if (modeLabel) modeLabel.textContent = this.roomMode === 'time' ? `${this.roomLimit}s` : `${this.roomLimit} so'z`;
    const langLabel = document.getElementById('arena-spec-lang');
    if (langLabel) langLabel.textContent = this.roomLang || 'uzbek';

    const playerColors = [
      '#e2b714', '#3b82f6', '#ec4899', '#8b5cf6', '#10b981', '#06b6d4', '#f97316'
    ];

    Object.values(this.players).forEach((player, idx) => {
      const isMe = player.id === this.myId;
      const color = isMe ? 'var(--main-color)' : playerColors[idx % playerColors.length];
      const track = document.createElement('div');
      track.className = 'tribe-track-row' + (isMe ? ' is-me' : '');
      track.id = 'track-' + player.id;
      track.innerHTML = `
        <div class="tribe-track-header">
          <div class="tribe-track-left">
            <span class="tribe-player-pip" style="background: ${color}; box-shadow: 0 0 6px ${color};"></span>
            <span class="tribe-player-name">${escapeHtml(player.name)}</span>
            ${isMe ? '<span class="tribe-me-badge">siz</span>' : ''}
            <span class="tribe-leader-crown" id="crown-${player.id}" style="display: none;">👑</span>
          </div>
          <div class="tribe-track-right" id="wpm-tag-${player.id}">
            <span class="t-wpm">${player.wpm || 0}</span> <span class="t-unit">wpm</span> • <span class="t-prog">0%</span>
          </div>
        </div>
        <div class="tribe-progress-bar">
          <div class="tribe-progress-fill" id="track-fill-${player.id}" style="width: 0%; background: ${color};"></div>
          <div class="tribe-progress-head" id="car-${player.id}" style="left: 0%; background: ${color}; box-shadow: 0 0 8px ${color};"></div>
        </div>
      `;
      container.appendChild(track);
    });
  }

  updateRaceTrackUI() {
    const playerList = Object.values(this.players);
    let leaderId = null;

    if (this.roomMode === 'words') {
      let maxProg = -1;
      let maxWpm = -1;
      playerList.forEach(p => {
        const prog = p.progress || 0;
        const wpm = p.wpm || 0;
        if (prog > maxProg || (prog === maxProg && wpm > maxWpm && prog > 0)) {
          maxProg = prog;
          maxWpm = wpm;
          if (prog > 0) leaderId = p.id;
        }
      });
    } else {
      // 'time' mode: yetakchi eng yuqori WPM ga ega bo'lgan o'yinchi
      let maxWpm = 0;
      playerList.forEach(p => {
        const wpm = p.wpm || 0;
        if (wpm > maxWpm) {
          maxWpm = wpm;
          leaderId = p.id;
        }
      });
    }

    playerList.forEach(player => {
      const fillEl = document.getElementById('track-fill-' + player.id);
      const headEl = document.getElementById('car-' + player.id);
      const wpmTag = document.getElementById('wpm-tag-' + player.id);
      const crownEl = document.getElementById('crown-' + player.id);
      const trackRow = document.getElementById('track-' + player.id);

      const percent = Math.min(Math.max(player.progress || 0, 0), 100);

      if (fillEl) {
        fillEl.style.width = `${percent}%`;
      }
      if (headEl) {
        headEl.style.left = `${percent}%`;
      }
      if (wpmTag) {
        if (player.finished) {
          wpmTag.innerHTML = `🏁 <span style="color: #a3e635; font-weight: 700;">marrada: ${player.wpm || 0} wpm (${player.accuracy || 100}%)</span>`;
        } else {
          wpmTag.innerHTML = `<span class="t-wpm">${player.wpm || 0}</span> <span class="t-unit">wpm</span> • <span class="t-prog">${percent}%</span>`;
        }
      }
      if (crownEl) {
        crownEl.style.display = (player.id === leaderId && leaderId) ? 'inline-block' : 'none';
      }
      if (trackRow) {
        if (player.id === leaderId && leaderId) {
          trackRow.classList.add('is-leading');
        } else {
          trackRow.classList.remove('is-leading');
        }
      }
    });

    this.renderTribeCarets();
  }

  // Monkeytype Tribe Carets (Raqib kursorlarini matn ustida aniq ko'rsatish)
  renderTribeCarets() {
    const container = document.getElementById('tribe-carets-container');
    if (!container) return;
    if (!this.isInRace) {
      container.innerHTML = '';
      return;
    }

    const wordsContainer = document.getElementById('words-container');
    if (!wordsContainer) return;
    const containerRect = wordsContainer.getBoundingClientRect();

    const playerColors = [
      '#3b82f6', '#ec4899', '#8b5cf6', '#10b981', '#f59e0b', '#06b6d4', '#e2b714'
    ];

    Object.values(this.players).forEach((p, idx) => {
      if (p.id === this.myId) return; // O'zimizning kursorimiz bor (#caret)
      let caretEl = document.getElementById('tribe-caret-' + p.id);
      if (!caretEl) {
        caretEl = document.createElement('div');
        caretEl.className = 'tribe-caret';
        caretEl.id = 'tribe-caret-' + p.id;
        const color = playerColors[idx % playerColors.length];
        caretEl.style.backgroundColor = color;
        caretEl.innerHTML = `<span class="tribe-caret-tag" style="background:${color}">${escapeHtml(p.name)}</span>`;
        container.appendChild(caretEl);
      }

      // Agar o'yinchi poygani yakunlagan bo'lsa
      if (p.finished) {
        caretEl.style.display = 'none';
        return;
      }

      const wordIdx = typeof p.wordIndex === 'number' ? p.wordIndex : 0;
      const letterIdx = typeof p.letterIndex === 'number' ? p.letterIndex : 0;

      const targetWordEl = wordsContainer.children[wordIdx];
      if (targetWordEl) {
        const letters = targetWordEl.querySelectorAll('.letter');
        let targetX = 0;
        let targetY = 0;

        const caretH = caretEl.offsetHeight || 26;
        if (letterIdx < letters.length) {
          const targetLetter = letters[letterIdx];
          const letterRect = targetLetter.getBoundingClientRect();
          targetX = letterRect.left - containerRect.left;
          targetY = letterRect.top - containerRect.top + (letterRect.height - caretH) / 2;
        } else if (letters.length > 0) {
          // So'zning oxirgi harfidan keyingi pozitsiya
          const lastLetter = letters[letters.length - 1];
          const letterRect = lastLetter.getBoundingClientRect();
          targetX = letterRect.right - containerRect.left;
          targetY = letterRect.top - containerRect.top + (letterRect.height - caretH) / 2;
        } else {
          const wordRect = targetWordEl.getBoundingClientRect();
          targetX = wordRect.left - containerRect.left;
          targetY = wordRect.top - containerRect.top;
        }

        // Ko'rinadigan sohadan tashqarida bo'lsa xiralashtirish
        if (targetY < -35 || targetY > containerRect.height + 25) {
          caretEl.style.opacity = '0';
        } else {
          caretEl.style.opacity = '1';
        }

        caretEl.style.left = `${targetX}px`;
        caretEl.style.top = `${targetY}px`;
        caretEl.style.display = 'block';
      } else {
        caretEl.style.display = 'none';
      }
    });
  }

  // Monkeytype Tribe Delta (Yetakchidan farq: +WPM / -WPM)
  updateTribeDelta(myWpm) {
    const deltaEl = document.getElementById('tribe-delta');
    if (!deltaEl) return;
    if (!this.isInRace) {
      deltaEl.style.display = 'none';
      return;
    }

    const otherPlayers = Object.values(this.players).filter(p => p.id !== this.myId);
    if (otherPlayers.length === 0) {
      deltaEl.style.display = 'none';
      return;
    }

    let leaderWpm = 0;
    otherPlayers.forEach(p => {
      if ((p.wpm || 0) > leaderWpm) leaderWpm = p.wpm;
    });

    const diff = (myWpm || 0) - leaderWpm;
    deltaEl.style.display = 'block';
    if (diff >= 0) {
      deltaEl.textContent = `Δ +${diff} wpm`;
      deltaEl.classList.remove('is-behind');
    } else {
      deltaEl.textContent = `Δ ${diff} wpm`;
      deltaEl.classList.add('is-behind');
    }
  }

  updateStatusText(msg) {
    const statusText = document.getElementById('lobby-status-text');
    if (statusText) statusText.textContent = msg;
  }

  updateLobbyUI() {
    const codeEl = document.getElementById('lobby-room-code');
    const modeBadge = document.getElementById('lobby-mode-badge');
    const langBadge = document.getElementById('lobby-lang-badge');
    const playersBadge = document.getElementById('lobby-players-badge');
    const configCard = document.getElementById('lobby-config-card');
    const playersList = document.getElementById('lobby-players-list');
    const startBtn = document.getElementById('lobby-start-btn');
    const readyBtn = document.getElementById('lobby-ready-btn');

    if (codeEl) codeEl.textContent = this.roomId || '------';

    // Xona rejimi badge
    if (modeBadge) {
      if (this.roomMode === 'time') {
        modeBadge.textContent = `⏱ ${this.roomLimit}s`;
      } else {
        modeBadge.textContent = `📝 ${this.roomLimit} so'z`;
      }
    }

    // Til badge
    if (langBadge) {
      const curLang = this.roomLang || (window.state && window.state.language) || 'english';
      const langNames = {
        english: "🌐 English (200)",
        english_1k: "🌐 English 1k",
        english_5k: "🌐 English 5k",
        english_10k: "🌐 English 10k",
        uzbek: "🌐 O'zbekcha",
        russian: "🌐 Русский"
      };
      langBadge.textContent = langNames[curLang] || `🌐 ${curLang}`;
    }

    // O'yinchilar soni badge
    const count = Object.keys(this.players).length;
    if (playersBadge) {
      playersBadge.textContent = `👥 ${count}/8 o'yinchi`;
    }

    // Host sozlamalar kartasi
    if (configCard) {
      configCard.style.display = this.isHost ? 'block' : 'none';
      if (this.isHost) {
        document.querySelectorAll('.lobby-cfg-btn').forEach(btn => {
          const btnMode = btn.dataset.lobbyMode;
          const btnLimit = parseInt(btn.dataset.lobbyLimit, 10);
          if (btnMode === this.roomMode && btnLimit === this.roomLimit) {
            btn.classList.add('active');
          } else {
            btn.classList.remove('active');
          }
        });

        document.querySelectorAll('.lobby-lang-btn').forEach(btn => {
          if (btn.dataset.lobbyLang === (this.roomLang || 'english')) {
            btn.classList.add('active');
          } else {
            btn.classList.remove('active');
          }
        });
      }
    }

    // O'yinchilar ro'yxati kartochkalari (Monkeytype style)
    if (playersList) {
      playersList.innerHTML = '';
      Object.values(this.players).forEach(p => {
        const isMe = p.id === this.myId;
        const statusClass = p.isHost ? 'is-host' : (p.isReady ? 'is-ready' : '');
        const card = document.createElement('div');
        card.className = `lobby-player-card ${statusClass} ${isMe ? 'is-me' : ''}`;

        let statusBadge = '';
        if (p.isHost) {
          statusBadge = '<span class="player-status-badge status-host">👑 XONA EGASI</span>';
        } else if (p.isReady) {
          statusBadge = '<span class="player-status-badge status-ready">✅ TAYYOR</span>';
        } else {
          statusBadge = '<span class="player-status-badge status-waiting">⏳ KUTILMOQDA</span>';
        }

        card.innerHTML = `
          <div class="lobby-avatar-ring">${p.avatar || '⌨️'}</div>
          <div style="font-weight: 700; font-size: 0.9rem; color: var(--text-color); display: flex; align-items: center; gap: 0.35rem;">
            ${escapeHtml(p.name)}
            ${isMe ? '<span style="font-size: 0.72rem; color: var(--sub-color);">(siz)</span>' : ''}
          </div>
          ${statusBadge}
        `;

        if (this.isHost && !p.isHost) {
          const kickBtn = document.createElement('button');
          kickBtn.className = 'kick-player-btn';
          kickBtn.title = "Xonadan chiqarish";
          kickBtn.innerHTML = '&times;';
          kickBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (confirm(`${p.name} ni xonadan chiqarishni xohlaysizmi?`)) {
              this.kickPlayer(p.id);
            }
          });
          card.appendChild(kickBtn);
        }

        playersList.appendChild(card);
      });
    }

    // Host va Guest tugmalari boshqaruvi
    if (this.isHost) {
      if (startBtn) {
        startBtn.style.display = 'flex';
        const otherPlayers = Object.values(this.players).filter(p => !p.isHost);
        const readyCount = otherPlayers.filter(p => p.isReady).length;
        if (otherPlayers.length > 0) {
          startBtn.innerHTML = `🏁 Poygani boshlash (${readyCount}/${otherPlayers.length} tayyor)`;
        } else {
          startBtn.innerHTML = `🏁 Poygani boshlash`;
        }
      }
      if (readyBtn) readyBtn.style.display = 'none';
    } else {
      if (startBtn) startBtn.style.display = 'none';
      if (readyBtn) {
        readyBtn.style.display = 'flex';
        if (this.isReady) {
          readyBtn.textContent = '❌ Bekor qilish (Tayyor emasman)';
          readyBtn.style.background = 'var(--sub-alt-color)';
          readyBtn.style.color = 'var(--error-color)';
          readyBtn.style.borderColor = 'var(--error-color)';
        } else {
          readyBtn.textContent = '✅ Tayyorman (Ready)';
          readyBtn.style.background = 'var(--main-color)';
          readyBtn.style.color = 'var(--bg-color)';
          readyBtn.style.borderColor = 'transparent';
        }
      }
    }
  }

  leaveRoom() {
    this.stopPingLoop();
    this.clearJoinTimers();
    if (this.raceFinishTimeout) {
      clearTimeout(this.raceFinishTimeout);
      this.raceFinishTimeout = null;
    }
    this.isVerifyingRoom = false;
    this.restoreJoinBtnUI();
    const pingBadge = document.getElementById('lobby-ping-badge');
    if (pingBadge) {
      pingBadge.textContent = '📶 --ms';
      pingBadge.classList.remove('ping-good', 'ping-medium', 'ping-poor');
    }

    if (this.client) {
      try {
        if (this.isHost && this.roomId) {
          this.sendMessage({
            type: 'ROOM_ANNOUNCE',
            roomId: this.roomId,
            sentAt: Date.now(),
            active: false
          }, true);
        }
        this.sendMessage({
          type: 'PLAYER_LEAVE',
          id: this.myId
        });
        this.client.disconnect();
      } catch (e) {}
    }
    this.client = null;
    this.roomId = null;
    this.players = {};
    this.isInRace = false;

    if (window.state) {
      window.state.isMultiplayer = false;
    }

    if (window.closeAppModal) {
      window.closeAppModal(document.getElementById('multiplayer-lobby-modal'));
    } else {
      document.getElementById('multiplayer-lobby-modal').classList.remove('active');
    }

    const caretsContainer = document.getElementById('tribe-carets-container');
    if (caretsContainer) caretsContainer.innerHTML = '';
    const deltaEl = document.getElementById('tribe-delta');
    if (deltaEl) deltaEl.style.display = 'none';

    document.getElementById('race-track-section').style.display = 'none';
    document.getElementById('test-section').style.display = 'flex';
    document.getElementById('main-config-bar').style.display = 'flex';
    if (window.resetTest) window.resetTest();
  }
}

window.multiplayerManager = new MultiplayerManager();
