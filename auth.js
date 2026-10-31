// MoonKeyType — Foydalanuvchi profili va autentifikatsiya tizimi

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

  register(username, password, avatar = '🏎️') {
    username = username.trim();
    if (!username || username.length < 3) {
      return { success: false, message: "Ism kamida 3 ta belgidan iborat bo'lishi kerak!" };
    }
    if (!password || password.length < 4) {
      return { success: false, message: "Parol kamida 4 ta belgidan iborat bo'lishi kerak!" };
    }

    const users = this.getUsers();
    const key = username.toLowerCase();

    if (users[key]) {
      return { success: false, message: "Bu ism allaqachon band qilingan!" };
    }

    const newUser = {
      username: username,
      password: password, // Lokal saqlanadi
      avatar: avatar,
      races: 0,
      wins: 0,
      bestWpm: 0,
      created: new Date().toLocaleDateString()
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
      return { success: false, message: "Bunday foydalanuvchi topilmadi!" };
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

  recordRace(won = false, wpm = 0) {
    if (!this.currentUser) return;
    this.currentUser.races = (this.currentUser.races || 0) + 1;
    if (won) {
      this.currentUser.wins = (this.currentUser.wins || 0) + 1;
    }
    if (wpm > (this.currentUser.bestWpm || 0)) {
      this.currentUser.bestWpm = wpm;
    }

    // Saqlash
    const users = this.getUsers();
    const key = this.currentUser.username.toLowerCase();
    if (users[key]) {
      users[key] = this.currentUser;
      this.saveUsers(users);
    }
    localStorage.setItem('mkt_current_user', JSON.stringify(this.currentUser));
    this.updateUI();
  }

  updateUI() {
    const authBtn = document.getElementById('auth-btn');
    const profileBtn = document.getElementById('profile-btn');
    const userAvatarEl = document.getElementById('user-avatar-display');
    const userNameEl = document.getElementById('user-name-display');

    if (this.currentUser) {
      if (authBtn) authBtn.style.display = 'none';
      if (profileBtn) profileBtn.style.display = 'flex';
      if (userAvatarEl) userAvatarEl.textContent = this.currentUser.avatar || '🏎️';
      if (userNameEl) userNameEl.textContent = this.currentUser.username;
    } else {
      if (authBtn) authBtn.style.display = 'flex';
      if (profileBtn) profileBtn.style.display = 'none';
    }
  }
}

window.authManager = new AuthManager();
