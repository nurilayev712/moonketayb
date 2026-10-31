// MonkeyType uslubidagi Kengaytirilgan Profil va XP Tizimi

class AuthManager {
  constructor() {
    this.currentUser = null;
    this.init();
  }

  init() {
    const savedUser = localStorage.getItem('mkt_current_user');
    if (savedUser) {
      try {
        this.currentUser = JSON.parse(savedUser);
      } catch (e) {
        this.currentUser = null;
      }
    }
    this.updateUI();
  }

  getUsers() {
    return JSON.parse(localStorage.getItem('mkt_users') || '{}');
  }

  saveUsers(users) {
    localStorage.setItem('mkt_users', JSON.stringify(users));
  }

  register(username, password, avatar = '⌨️') {
    username = username.trim();
    if (!username || username.length < 3) {
      return { success: false, message: "Foydalanuvchi nomi kamida 3 ta harfdan iborat bo'lishi kerak!" };
    }
    if (!password || password.length < 4) {
      return { success: false, message: "Parol kamida 4 ta belgidan iborat bo'lishi kerak!" };
    }

    const users = this.getUsers();
    const key = username.toLowerCase();

    if (users[key]) {
      return { success: false, message: "Bu foydalanuvchi nomi allaqachon mavjud!" };
    }

    const newUser = {
      username: username,
      password: password,
      avatar: avatar,
      level: 1,
      xp: 0,
      xpToNextLevel: 500,
      testsCompleted: 0,
      totalTimeTyping: 0, // soniyalarda
      bestWpm: {
        time15: 0,
        time30: 0,
        time60: 0,
        time120: 0,
        words25: 0
      },
      races: 0,
      wins: 0,
      joinedDate: new Date().toLocaleDateString('uz-UZ', { month: 'short', year: 'numeric' })
    };

    users[key] = newUser;
    this.saveUsers(users);
    this.setCurrentUser(newUser);
    return { success: true, user: newUser };
  }

  login(username, password) {
    username = username.trim();
    const users = this.getUsers();
    const key = username.toLowerCase();
    const user = users[key];

    if (!user) {
      return { success: false, message: "Foydalanuvchi topilmadi!" };
    }

    if (user.password !== password) {
      return { success: false, message: "Parol noto'g'ri!" };
    }

    this.setCurrentUser(user);
    return { success: true, user: user };
  }

  setCurrentUser(user) {
    this.currentUser = user;
    localStorage.setItem('mkt_current_user', JSON.stringify(user));
    this.updateUI();
  }

  logout() {
    this.currentUser = null;
    localStorage.removeItem('mkt_current_user');
    this.updateUI();
  }

  // Har bir test tugaganda XP va statistikani oshirish
  addTestStats(charsTyped, secondsSpent, wpm, mode, modeValue) {
    if (!this.currentUser) return;

    // Har bir to'g'ri belgi uchun 2 XP
    const earnedXp = Math.round(charsTyped * 1.5);
    this.currentUser.xp = (this.currentUser.xp || 0) + earnedXp;
    this.currentUser.testsCompleted = (this.currentUser.testsCompleted || 0) + 1;
    this.currentUser.totalTimeTyping = (this.currentUser.totalTimeTyping || 0) + secondsSpent;

    // Level hisoblash (har bir level oldingisidan ko'proq XP talab qiladi)
    let neededXp = this.currentUser.level * 400;
    while (this.currentUser.xp >= neededXp) {
      this.currentUser.xp -= neededXp;
      this.currentUser.level += 1;
      neededXp = this.currentUser.level * 400;
    }
    this.currentUser.xpToNextLevel = neededXp;

    // Rekordlar
    if (!this.currentUser.bestWpm) this.currentUser.bestWpm = {};
    if (mode === 'time') {
      const key = `time${modeValue}`;
      if (wpm > (this.currentUser.bestWpm[key] || 0)) {
        this.currentUser.bestWpm[key] = wpm;
      }
    }

    // Kunlik faollik xaritasi (Activity Heatmap)
    const today = new Date().toISOString().split('T')[0];
    if (!this.currentUser.activity) this.currentUser.activity = {};
    this.currentUser.activity[today] = (this.currentUser.activity[today] || 0) + 1;

    this.saveCurrentUserData();
    this.updateUI();
  }

  recordRace(won = false, wpm = 0) {
    if (!this.currentUser) return;
    this.currentUser.races = (this.currentUser.races || 0) + 1;
    if (won) {
      this.currentUser.wins = (this.currentUser.wins || 0) + 1;
      this.currentUser.xp += 150; // G'alaba uchun bonus XP
    } else {
      this.currentUser.xp += 50;
    }

    this.saveCurrentUserData();
    this.updateUI();
  }

  saveCurrentUserData() {
    const users = this.getUsers();
    const key = this.currentUser.username.toLowerCase();
    if (users[key]) {
      users[key] = this.currentUser;
      this.saveUsers(users);
    }
    localStorage.setItem('mkt_current_user', JSON.stringify(this.currentUser));
  }

  updateUI() {
    const authBtn = document.getElementById('auth-btn');
    const profileBtn = document.getElementById('profile-btn');
    const userAvatarEl = document.getElementById('user-avatar-display');
    const userNameEl = document.getElementById('user-name-display');
    const userLevelEl = document.getElementById('user-level-badge');

    if (this.currentUser) {
      if (authBtn) authBtn.style.display = 'none';
      if (profileBtn) profileBtn.style.display = 'flex';
      if (userAvatarEl) userAvatarEl.textContent = this.currentUser.avatar || '⌨️';
      if (userNameEl) userNameEl.textContent = this.currentUser.username;
      if (userLevelEl) userLevelEl.textContent = `lvl ${this.currentUser.level || 1}`;
    } else {
      if (authBtn) authBtn.style.display = 'flex';
      if (profileBtn) profileBtn.style.display = 'none';
    }
  }
}

window.authManager = new AuthManager();
