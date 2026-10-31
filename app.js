// MonkeyType Asosiy Logic
const WORDS = window.WORDS;
const soundManager = window.soundManager;

// Holat va Sozlamalar
const state = {
  mode: 'time', // 'time', 'words', 'code', 'quote', 'custom', 'zen'
  timeLimit: 30, // 15, 30, 60, 120
  wordsLimit: 25, // 10, 25, 50, 100
  codeLanguage: 'javascript', // 'javascript', 'python', 'html', 'cpp'
  language: 'uzbek', // 'uzbek', 'english', 'russian'
  punctuation: false,
  numbers: false,
  theme: 'serika_dark',
  sound: true,

  // Monkeytype imzo xususiyatlari
  customWords: [],
  masterMode: false,
  noBackspace: false,
  focusModeEnabled: true,
  virtualKeyboardEnabled: false,

  // Test jarayoni
  words: [],
  currentWordIndex: 0,
  currentLetterIndex: 0,
  currentQuoteAuthor: '',
  isRunning: false,
  isFinished: false,
  timer: null,
  timeRemaining: 30,
  timeElapsed: 0,
  
  // Statistika
  correctChars: 0,
  incorrectChars: 0,
  extraChars: 0,
  missedChars: 0,
  historyChartData: [], // Har soniyadagi { second, wpm, raw, errors }

  // Chart obyekti
  chartInstance: null
};

// DOM Elementlar
const elements = {
  wordsContainer: document.getElementById('words-container'),
  wordsWrapper: document.getElementById('words-wrapper'),
  caret: document.getElementById('caret'),
  typingInput: document.getElementById('typing-input'),
  liveStats: document.getElementById('live-stats'),
  testSection: document.getElementById('test-section'),
  resultSection: document.getElementById('result-section'),
  restartBtn: document.getElementById('restart-btn'),
  retryBtn: document.getElementById('retry-btn'),
  nextTestBtn: document.getElementById('next-test-btn'),
  
  // Monkeytype HUD & Qo'shimcha elementlar
  liveStatsHud: document.getElementById('live-stats-hud'),
  hudTimer: document.getElementById('hud-timer'),
  hudWpm: document.getElementById('hud-wpm'),
  hudAcc: document.getElementById('hud-acc'),
  zenHint: document.getElementById('zen-hint'),
  virtualKeyboard: document.getElementById('virtual-keyboard-wrapper'),
  capsLockWarning: document.getElementById('caps-lock-warning'),

  // Natija elementlari
  resultWpm: document.getElementById('result-wpm'),
  resultAcc: document.getElementById('result-acc'),
  resultRaw: document.getElementById('result-raw'),
  resultChars: document.getElementById('result-chars'),
  resultTime: document.getElementById('result-time'),
  resultConsistency: document.getElementById('result-consistency'),
  resultChart: document.getElementById('result-chart'),

  // Sozlamalar tugmalari
  modeBtns: document.querySelectorAll('[data-mode]'),
  timeBtns: document.querySelectorAll('[data-time]'),
  wordsBtns: document.querySelectorAll('[data-words]'),
  codeLangBtns: document.querySelectorAll('[data-code-lang]'),
  timeGroup: document.getElementById('time-config-group'),
  wordsGroup: document.getElementById('words-config-group'),
  codeGroup: document.getElementById('code-config-group'),
  punctToggle: document.getElementById('punct-toggle'),
  numbersToggle: document.getElementById('numbers-toggle'),
  
  // Modallar
  settingsModal: document.getElementById('settings-modal'),
  historyModal: document.getElementById('history-modal'),
  customTextModal: document.getElementById('custom-text-modal'),
  customTextInput: document.getElementById('custom-text-input'),
  customTextStartBtn: document.getElementById('custom-text-start-btn'),
  customTextCancelBtn: document.getElementById('custom-text-cancel-btn'),
  closeCustomTextBtn: document.getElementById('close-custom-text-btn'),

  openSettingsBtn: document.getElementById('open-settings-btn'),
  openHistoryBtn: document.getElementById('open-history-btn'),
  closeSettingsBtn: document.getElementById('close-settings-btn'),
  closeHistoryBtn: document.getElementById('close-history-btn'),
  soundToggle: document.getElementById('sound-toggle-btn'),
  languageSelect: document.getElementById('language-select'),
  focusModeSelect: document.getElementById('focus-mode-select'),
  virtualKeyboardSelect: document.getElementById('virtual-keyboard-select'),
  masterModeSelect: document.getElementById('master-mode-select'),
  noBackspaceSelect: document.getElementById('no-backspace-select'),
  themeButtons: document.querySelectorAll('.theme-btn'),
  historyList: document.getElementById('history-list'),
  clearHistoryBtn: document.getElementById('clear-history-btn'),
  bestWpmDisplay: document.getElementById('best-wpm-display')
};

// ----------------------------------------------------
// Dasturni ishga tushirish (Initialization)
// ----------------------------------------------------
function init() {
  loadStoredSettings();
  setupEventListeners();
  applyTheme(state.theme);
  updateConfigUI();
  resetTest();
  renderActivityHeatmap('12months');
}

// LocalStorage dan sozlamalarni yuklash
function loadStoredSettings() {
  const savedTheme = localStorage.getItem('mk_theme');
  if (savedTheme) state.theme = savedTheme;

  const savedMode = localStorage.getItem('mk_mode');
  if (savedMode) state.mode = savedMode;

  const savedCodeLang = localStorage.getItem('mk_code_lang');
  if (savedCodeLang) state.codeLanguage = savedCodeLang;

  const savedTime = localStorage.getItem('mk_time');
  if (savedTime) state.timeLimit = parseInt(savedTime, 10);

  const savedWords = localStorage.getItem('mk_words');
  if (savedWords) state.wordsLimit = parseInt(savedWords, 10);

  const savedLang = localStorage.getItem('mk_lang');
  if (savedLang) state.language = savedLang;

  const savedPunct = localStorage.getItem('mk_punct');
  if (savedPunct !== null) state.punctuation = savedPunct === 'true';

  const savedNums = localStorage.getItem('mk_nums');
  if (savedNums !== null) state.numbers = savedNums === 'true';

  const savedSound = localStorage.getItem('mk_sound');
  if (savedSound !== null) {
    state.sound = savedSound === 'true';
    soundManager.enabled = state.sound;
  }

  const savedCaret = localStorage.getItem('mk_caret_style') || 'line';
  state.caretStyle = savedCaret;
  applyCaretStyle(state.caretStyle);

  const savedFocus = localStorage.getItem('mkt_focus_mode');
  state.focusModeEnabled = (savedFocus !== 'off');
  if (elements.focusModeSelect) elements.focusModeSelect.value = state.focusModeEnabled ? 'on' : 'off';

  const savedVk = localStorage.getItem('mkt_virtual_keyboard');
  state.virtualKeyboardEnabled = (savedVk === 'on');
  if (elements.virtualKeyboardSelect) elements.virtualKeyboardSelect.value = state.virtualKeyboardEnabled ? 'on' : 'off';
  if (elements.virtualKeyboard) {
    elements.virtualKeyboard.classList.toggle('hidden', !state.virtualKeyboardEnabled);
  }

  const savedMaster = localStorage.getItem('mkt_master_mode');
  state.masterMode = (savedMaster === 'on');
  if (elements.masterModeSelect) elements.masterModeSelect.value = state.masterMode ? 'on' : 'off';

  const savedNoBack = localStorage.getItem('mkt_no_backspace');
  state.noBackspace = (savedNoBack === 'on');
  if (elements.noBackspaceSelect) elements.noBackspaceSelect.value = state.noBackspace ? 'on' : 'off';
}

// ----------------------------------------------------
// Caret va Kursor Boshqaruvi
// ----------------------------------------------------
function applyCaretStyle(style) {
  state.caretStyle = style;
  localStorage.setItem('mk_caret_style', style);
  if (elements.caret) {
    elements.caret.className = 'caret blink caret-' + style;
  }
  const sel = document.getElementById('caret-style-select');
  if (sel && sel.value !== style) sel.value = style;
}

// ----------------------------------------------------
// Mavzu va UI boshqaruvi
// ----------------------------------------------------
function applyTheme(themeName) {
  state.theme = themeName;
  document.body.setAttribute('data-theme', themeName);
  localStorage.setItem('mk_theme', themeName);

  elements.themeButtons.forEach(btn => {
    btn.classList.toggle('active', btn.dataset.themeName === themeName);
  });
}

function updateConfigUI() {
  // Rejim tugmalari
  elements.modeBtns.forEach(btn => {
    btn.classList.toggle('active', btn.dataset.mode === state.mode);
  });

  if (state.mode === 'time') {
    elements.timeGroup.style.display = 'flex';
    elements.wordsGroup.style.display = 'none';
    if (elements.codeGroup) elements.codeGroup.style.display = 'none';
  } else if (state.mode === 'words') {
    elements.timeGroup.style.display = 'none';
    elements.wordsGroup.style.display = 'flex';
    if (elements.codeGroup) elements.codeGroup.style.display = 'none';
  } else if (state.mode === 'code') {
    elements.timeGroup.style.display = 'none';
    elements.wordsGroup.style.display = 'none';
    if (elements.codeGroup) elements.codeGroup.style.display = 'flex';
  } else if (state.mode === 'quote') {
    elements.timeGroup.style.display = 'none';
    elements.wordsGroup.style.display = 'none';
    if (elements.codeGroup) elements.codeGroup.style.display = 'none';
  }

  // Dasturlash tili tugmalari
  if (elements.codeLangBtns) {
    elements.codeLangBtns.forEach(btn => {
      btn.classList.toggle('active', btn.dataset.codeLang === state.codeLanguage);
    });
  }

  // Vaqt tugmalari
  elements.timeBtns.forEach(btn => {
    btn.classList.toggle('active', parseInt(btn.dataset.time, 10) === state.timeLimit);
  });

  // So'zlar soni tugmalari
  elements.wordsBtns.forEach(btn => {
    btn.classList.toggle('active', parseInt(btn.dataset.words, 10) === state.wordsLimit);
  });

  // Tinish belgilari va Raqamlar
  elements.punctToggle.classList.toggle('active', state.punctuation);
  elements.numbersToggle.classList.toggle('active', state.numbers);

  // Til tanlash
  if (elements.languageSelect) {
    elements.languageSelect.value = state.language;
  }

  // Ovoz holati
  if (elements.soundToggle) {
    elements.soundToggle.classList.toggle('active', state.sound);
  }
}

// ----------------------------------------------------
// So'zlar generatsiyasi
// ----------------------------------------------------
function generateWords() {
  state.currentQuoteAuthor = '';

  // 1. Dasturlash tillari (Code rejimi)
  if (state.mode === 'code') {
    const codeObj = (WORDS && WORDS.code) || {};
    const codeList = codeObj[state.codeLanguage] || codeObj.javascript || [];
    const count = 25;
    const result = [];
    for (let i = 0; i < count; i++) {
      result.push(codeList[Math.floor(Math.random() * codeList.length)]);
    }
    return result;
  }

  // 2. Mashhur iqtiboslar (Quote rejimi)
  if (state.mode === 'quote') {
    const quotesList = (WORDS && WORDS.quotes) || [];
    const chosen = quotesList[Math.floor(Math.random() * quotesList.length)] || {
      text: "Bilim o'rganishdan to'xtagan kishi qariydi.",
      author: "Genri Ford"
    };
    state.currentQuoteAuthor = chosen.author;
    return chosen.text.split(' ');
  }

  const source = (WORDS && WORDS[state.language]) || (WORDS && WORDS.uzbek) || [];
  const count = state.mode === 'words' ? state.wordsLimit : Math.max(80, state.timeLimit * 3);
  const result = [];

  const punctuationList = [',', '.', '!', '?', ';', ':'];

  for (let i = 0; i < count; i++) {
    // Tasodifiy so'z
    let word = source[Math.floor(Math.random() * source.length)];

    // Raqamlar qo'shish
    if (state.numbers && Math.random() < 0.15) {
      word = String(Math.floor(Math.random() * 9000) + 10);
    }

    // Tinish belgilari
    if (state.punctuation && Math.random() < 0.25) {
      // 50% bosh harf
      if (Math.random() < 0.5) {
        word = word.charAt(0).toUpperCase() + word.slice(1);
      }
      // Tasodifiy belgi oxiriga
      const mark = punctuationList[Math.floor(Math.random() * punctuationList.length)];
      word += mark;
    }

    result.push(word);
  }

  return result;
}

// ----------------------------------------------------
// DOM da so'zlarni chizish
// ----------------------------------------------------
function renderWords() {
  elements.wordsContainer.innerHTML = '';
  state.words = generateWords();

  state.words.forEach((wordText, wIdx) => {
    const wordEl = document.createElement('div');
    wordEl.className = 'word' + (wIdx === 0 ? ' active' : '') + (state.mode === 'code' ? ' code-token' : '');
    wordEl.dataset.wordIndex = wIdx;

    for (let i = 0; i < wordText.length; i++) {
      const letterEl = document.createElement('span');
      letterEl.className = 'letter';
      letterEl.textContent = wordText[i];
      wordEl.appendChild(letterEl);
    }

    elements.wordsContainer.appendChild(wordEl);
  });

  if (state.mode === 'quote' && state.currentQuoteAuthor) {
    const authorEl = document.createElement('div');
    authorEl.className = 'quote-author';
    authorEl.textContent = '— ' + state.currentQuoteAuthor;
    elements.wordsContainer.appendChild(authorEl);
  }

  state.currentWordIndex = 0;
  state.currentLetterIndex = 0;

  // Caretni boshlang'ich harf ustiga qo'yish
  setTimeout(updateCaretPosition, 10);
}

// ----------------------------------------------------
// Caret (kursor) joylashuvini yangilash
// ----------------------------------------------------
function updateCaretPosition() {
  const currentWordEl = elements.wordsContainer.children[state.currentWordIndex];
  if (!currentWordEl) return;

  // Avval so'zlar konteynerini silliq avtomatik scroll qilish
  const wordTop = currentWordEl.offsetTop;
  if (wordTop > 48) {
    elements.wordsContainer.scrollTop = wordTop - 48;
  } else {
    elements.wordsContainer.scrollTop = 0;
  }

  const letters = currentWordEl.querySelectorAll('.letter');
  const containerRect = elements.wordsContainer.getBoundingClientRect();

  let targetX = 0;
  let targetY = 0;

  if (state.currentLetterIndex < letters.length) {
    const targetLetter = letters[state.currentLetterIndex];
    const letterRect = targetLetter.getBoundingClientRect();
    targetX = letterRect.left - containerRect.left;
    targetY = letterRect.top - containerRect.top + (letterRect.height - 30) / 2;
  } else if (letters.length > 0) {
    // So'zning oxirgi harfidan keyingi pozitsiya
    const lastLetter = letters[letters.length - 1];
    const letterRect = lastLetter.getBoundingClientRect();
    targetX = letterRect.right - containerRect.left;
    targetY = letterRect.top - containerRect.top + (letterRect.height - 30) / 2;
  } else {
    const wordRect = currentWordEl.getBoundingClientRect();
    targetX = wordRect.left - containerRect.left;
    targetY = wordRect.top - containerRect.top;
  }

  elements.caret.style.left = `${targetX}px`;
  elements.caret.style.top = `${targetY}px`;
}

// ----------------------------------------------------
// Testni qayta boshlash (Reset)
// ----------------------------------------------------
function resetTest() {
  clearInterval(state.timer);
  state.isRunning = false;
  state.isFinished = false;
  state.timeElapsed = 0;
  state.timeRemaining = state.timeLimit;
  state.correctChars = 0;
  state.incorrectChars = 0;
  state.extraChars = 0;
  state.missedChars = 0;
  state.historyChartData = [];

  // Fokus rejimidan chiqish
  document.body.classList.remove('focus-mode');
  elements.caret.classList.add('blink');

  // UI elementlarni tiklash
  elements.testSection.style.display = 'flex';
  elements.resultSection.classList.remove('active');
  elements.wordsContainer.scrollTop = 0;

  if (state.mode === 'time') {
    elements.liveStats.textContent = state.timeLimit;
    elements.liveStats.classList.remove('hidden');
  } else if (state.mode === 'words') {
    elements.liveStats.textContent = `0 / ${state.wordsLimit}`;
    elements.liveStats.classList.remove('hidden');
  } else if (state.mode === 'code') {
    elements.liveStats.textContent = `0 / 25`;
    elements.liveStats.classList.remove('hidden');
  } else if (state.mode === 'quote') {
    elements.liveStats.textContent = `quote`;
    elements.liveStats.classList.remove('hidden');
  }

  renderWords();
  elements.typingInput.value = '';
  elements.typingInput.focus();
}

// ----------------------------------------------------
// Testni boshlash (Start)
// ----------------------------------------------------
function startTest() {
  if (state.isRunning) return;
  state.isRunning = true;
  document.body.classList.add('focus-mode');
  elements.caret.classList.remove('blink');

  soundManager.init();

  const startTime = Date.now();

  state.timer = setInterval(() => {
    state.timeElapsed++;

    if (state.mode === 'time') {
      state.timeRemaining--;
      elements.liveStats.textContent = state.timeRemaining;

      if (state.timeRemaining <= 0) {
        finishTest();
        return;
      }
    } else {
      // Words rejimi: vaqtni 1, 2, 3 sanaydi
      elements.liveStats.textContent = `${state.currentWordIndex} / ${state.wordsLimit}`;
    }

    // Grafik uchun har soniyada WPM saqlash
    const currentWpm = calculateLiveWpm();
    state.historyChartData.push({
      second: state.timeElapsed,
      wpm: currentWpm,
      errors: state.incorrectChars + state.extraChars
    });

  }, 1000);
}

// Joriy WPM hisoblash (Live)
function calculateLiveWpm() {
  const minutes = Math.max(state.timeElapsed / 60, 0.016); // kamida 1 soniya
  const words = state.correctChars / 5;
  return Math.round(words / minutes);
}

// ----------------------------------------------------
// Klaviaturadan harflarni qabul qilish (Input handler)
// ----------------------------------------------------
function handleKeyDown(e) {
  // 1. Agar birorta modal ochiq bo'lsa yoki Command Palette ochiq bo'lsa
  const isModalOpen = document.querySelector('.modal-overlay.active') || 
                      (document.getElementById('command-palette-overlay') && document.getElementById('command-palette-overlay').style.display === 'flex');
  
  if (isModalOpen) {
    if (e.key === 'Escape') {
      // Escape bosilsa ochiq modalni yopish
      document.querySelectorAll('.modal-overlay.active').forEach(m => m.classList.remove('active'));
      if (window.closeCommandPalette) window.closeCommandPalette();
    }
    return; // Test klaviaturasi mutlaqo ishlamaydi!
  }

  // 2. Agar foydalanuvchi boshqa input yoki select maydonida yozayotgan bo'lsa
  if (e.target && e.target.tagName && ['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)) {
    if (e.target.id !== 'typing-input') {
      return; // Oddiy matn kiritishga ruxsat
    }
  }

  // 3. Agar test inputi o'chirilgan (disabled) bo'lsa
  if (elements.typingInput && elements.typingInput.disabled) {
    return;
  }

  if (state.isFinished) {
    if (e.key === 'Tab' || e.key === 'Enter') {
      e.preventDefault();
      resetTest();
    }
    return;
  }

  // Tab orqali testni qayta boshlash
  if (e.key === 'Tab') {
    e.preventDefault();
    resetTest();
    return;
  }

  // Esc orqali MonkeyType Command Palette ochish
  if (e.key === 'Escape') {
    e.preventDefault();
    if (window.openCommandPalette) {
      window.openCommandPalette();
    } else {
      resetTest();
    }
    return;
  }

  // Modifier tugmalarini e'tiborsiz qoldirish
  if (['Shift', 'Control', 'Alt', 'Meta', 'CapsLock'].includes(e.key)) {
    return;
  }

  // Birinchi harf kiritilganda testni boshlash
  if (!state.isRunning) {
    startTest();
  }

  const currentWordEl = elements.wordsContainer.children[state.currentWordIndex];
  if (!currentWordEl) return;

  const targetWord = state.words[state.currentWordIndex];
  const letters = currentWordEl.querySelectorAll('.letter');

  // SPACE BOSILGANDA (Keyingi so'zga o'tish)
  if (e.key === ' ') {
    e.preventDefault();

    // Agar so'zda hech narsa yozilmagan bo'lsa, o'tmaydi
    if (state.currentLetterIndex === 0) return;

    soundManager.playKey(false, true);

    // Kiritilmagan qolgan harflarni "missed" deb hisoblash
    for (let i = state.currentLetterIndex; i < targetWord.length; i++) {
      letters[i].classList.add('incorrect');
      state.missedChars++;
    }

    currentWordEl.classList.remove('active');
    state.currentWordIndex++;
    state.currentLetterIndex = 0;

    // Words, Code va Quote rejimlarida limit tekshirish
    const isWordBasedMode = (state.mode === 'words' || state.mode === 'code' || state.mode === 'quote');
    if (isWordBasedMode) {
      const targetCount = state.mode === 'words' ? state.wordsLimit : state.words.length;
      elements.liveStats.textContent = `${state.currentWordIndex} / ${targetCount}`;
      if (state.currentWordIndex >= targetCount) {
        finishTest();
        return;
      }
    }

    // Time rejimida so'zlar tugab qolmasligi uchun yangi so'zlar qo'shish
    if (state.currentWordIndex >= state.words.length - 10) {
      appendMoreWords(30);
    }

    const nextWordEl = elements.wordsContainer.children[state.currentWordIndex];
    if (nextWordEl) {
      nextWordEl.classList.add('active');
    }

    updateCaretPosition();
    if (state.isMultiplayer && window.checkMultiplayerProgress) {
      window.checkMultiplayerProgress();
    }
    return;
  }

  // BACKSPACE BOSILGANDA
  if (e.key === 'Backspace') {
    e.preventDefault();

    if (state.currentLetterIndex > 0) {
      state.currentLetterIndex--;
      const letterToUndo = letters[state.currentLetterIndex];

      if (letterToUndo.classList.contains('extra')) {
        letterToUndo.remove();
        state.extraChars = Math.max(0, state.extraChars - 1);
      } else {
        if (letterToUndo.classList.contains('correct')) {
          state.correctChars = Math.max(0, state.correctChars - 1);
        } else if (letterToUndo.classList.contains('incorrect')) {
          state.incorrectChars = Math.max(0, state.incorrectChars - 1);
        }
        letterToUndo.className = 'letter';
      }

      soundManager.playKey(false, false);
      updateCaretPosition();
    } else if (state.currentWordIndex > 0) {
      // Oldingi so'zga qaytish (agar xatoliklar bo'lsa)
      const prevWordEl = elements.wordsContainer.children[state.currentWordIndex - 1];
      const prevWordErrors = prevWordEl.querySelectorAll('.letter.incorrect, .letter.extra');
      if (prevWordErrors.length > 0) {
        currentWordEl.classList.remove('active');
        state.currentWordIndex--;
        prevWordEl.classList.add('active');
        state.currentLetterIndex = prevWordEl.querySelectorAll('.letter').length;
        soundManager.playKey(false, false);
        updateCaretPosition();
      }
    }
    return;
  }

  // ODDIY HARF BOSILGANDA (Faqat 1 ta belgi)
  if (e.key.length === 1) {
    e.preventDefault();
    const typedChar = e.key;

    if (state.currentLetterIndex < targetWord.length) {
      // Kutilayotgan harf bilan solishtirish
      const expectedChar = targetWord[state.currentLetterIndex];
      const letterEl = letters[state.currentLetterIndex];

      if (typedChar === expectedChar) {
        letterEl.classList.add('correct');
        state.correctChars++;
        soundManager.playKey(false, false);
      } else {
        letterEl.classList.add('incorrect');
        state.incorrectChars++;
        soundManager.playKey(true, false);
      }
      state.currentLetterIndex++;
    } else {
      // Ortiqcha (extra) harflar qo'shish
      if (state.currentLetterIndex < targetWord.length + 10) { // maksimal 10 ta ortiqcha
        const extraSpan = document.createElement('span');
        extraSpan.className = 'letter extra incorrect';
        extraSpan.textContent = typedChar;
        currentWordEl.appendChild(extraSpan);
        state.extraChars++;
        state.currentLetterIndex++;
        soundManager.playKey(true, false);
      }
    }

    // Words / Code / Quote rejimida oxirgi so'zning oxirgi harfi kiritilganda yakunlash
    const isWordBased = (state.mode === 'words' || state.mode === 'code' || state.mode === 'quote');
    const totalWordCount = state.mode === 'words' ? state.wordsLimit : state.words.length;
    if (isWordBased && 
        state.currentWordIndex === totalWordCount - 1 && 
        state.currentLetterIndex >= targetWord.length) {
      finishTest();
      return;
    }

    updateCaretPosition();
    if (state.isMultiplayer && window.checkMultiplayerProgress) {
      window.checkMultiplayerProgress();
    }
  }
}

// Qo'shimcha so'zlar ulash (Time rejimi uchun)
function appendMoreWords(count) {
  const source = WORDS[state.language] || WORDS.uzbek;
  for (let i = 0; i < count; i++) {
    let word = source[Math.floor(Math.random() * source.length)];
    if (state.numbers && Math.random() < 0.15) {
      word = String(Math.floor(Math.random() * 9000) + 10);
    }
    state.words.push(word);

    const wordEl = document.createElement('div');
    wordEl.className = 'word';
    wordEl.dataset.wordIndex = state.words.length - 1;

    for (let c = 0; c < word.length; c++) {
      const letterEl = document.createElement('span');
      letterEl.className = 'letter';
      letterEl.textContent = word[c];
      wordEl.appendChild(letterEl);
    }

    elements.wordsContainer.appendChild(wordEl);
  }
}

// ----------------------------------------------------
// Testni Yakunlash (Finish)
// ----------------------------------------------------
function finishTest() {
  clearInterval(state.timer);
  state.isRunning = false;
  state.isFinished = true;
  document.body.classList.remove('focus-mode');

  // Test vaqti
  const testDuration = state.mode === 'time' ? state.timeLimit : Math.max(state.timeElapsed, 1);
  const minutes = testDuration / 60;

  // WPM va Aniqlik hisoblash
  const totalTypedChars = state.correctChars + state.incorrectChars + state.extraChars;
  const netWpm = Math.max(0, Math.round((state.correctChars / 5) / minutes));
  const rawWpm = Math.max(0, Math.round((totalTypedChars / 5) / minutes));
  const accuracy = totalTypedChars > 0 ? Math.round((state.correctChars / totalTypedChars) * 100) : 0;

  // Agar test juda tez tugasa, grafik uchun kamida 1 ta nuqta qo'shish
  if (state.historyChartData.length === 0) {
    state.historyChartData.push({ second: 1, wpm: netWpm, errors: state.incorrectChars });
  }

  // Natijalarni ko'rsatish
  elements.resultWpm.textContent = netWpm;
  elements.resultAcc.textContent = `${accuracy}%`;
  elements.resultRaw.textContent = rawWpm;
  elements.resultChars.textContent = `${state.correctChars}/${state.incorrectChars}/${state.extraChars}/${state.missedChars}`;
  elements.resultTime.textContent = `${testDuration}s`;

  // UI almashtirish
  elements.testSection.style.display = 'none';
  elements.resultSection.classList.add('active');

  // Natijani saqlash
  saveResultToStorage({
    wpm: netWpm,
    acc: accuracy,
    raw: rawWpm,
    mode: state.mode,
    modeValue: state.mode === 'time' ? `${state.timeLimit}s` : `${state.wordsLimit} so'z`,
    lang: state.language,
    date: new Date().toLocaleDateString('uz-UZ', { hour: '2-digit', minute: '2-digit' })
  });

  // Foydalanuvchi hisobiga XP va statistika qo'shish
  const todayDateStr = new Date().toISOString().split('T')[0];
  if (window.authManager && window.authManager.currentUser) {
    window.authManager.addTestStats(state.correctChars, testDuration, netWpm, state.mode, state.mode === 'time' ? state.timeLimit : state.wordsLimit);
  } else {
    try {
      const guestAct = JSON.parse(localStorage.getItem('mkt_guest_activity') || '{}');
      guestAct[todayDateStr] = (guestAct[todayDateStr] || 0) + 1;
      localStorage.setItem('mkt_guest_activity', JSON.stringify(guestAct));
    } catch (e) {}
  }

  // Faollik xaritasini avtomatik yangilash
  const currentHeatmapRange = document.getElementById('heatmap-range-select') ? document.getElementById('heatmap-range-select').value : '12months';
  renderActivityHeatmap(currentHeatmapRange);

  // Chiziqli grafik chizish
  renderLineChart();
}

// ----------------------------------------------------
// Chiziqli Grafik (Line Chart - Chart.js)
// ----------------------------------------------------
function renderLineChart() {
  const ctx = elements.resultChart.getContext('2d');
  
  if (state.chartInstance) {
    state.chartInstance.destroy();
  }

  const labels = state.historyChartData.map(d => `${d.second}s`);
  const wpmData = state.historyChartData.map(d => d.wpm);
  const errorData = state.historyChartData.map(d => d.errors);

  const style = getComputedStyle(document.body);
  const mainColor = style.getPropertyValue('--main-color').trim() || '#e2b714';
  const subColor = style.getPropertyValue('--sub-color').trim() || '#646669';
  const errorColor = style.getPropertyValue('--error-color').trim() || '#ca4754';
  const textClr = style.getPropertyValue('--text-color').trim() || '#d1d0c5';

  // Chart.js kutubxonasi yuklanganligini tekshirish
  if (typeof Chart === 'undefined') {
    console.warn("Chart.js kutubxonasi mavjud emas");
    return;
  }

  // Fon uchun chiroyli gradient
  const gradient = ctx.createLinearGradient(0, 0, 0, 200);
  gradient.addColorStop(0, hexToRgba(mainColor, 0.25));
  gradient.addColorStop(1, hexToRgba(mainColor, 0.01));

  state.chartInstance = new Chart(ctx, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [
        {
          label: 'WPM',
          data: wpmData,
          borderColor: mainColor,
          backgroundColor: gradient,
          fill: true,
          tension: 0.35,
          borderWidth: 3,
          pointRadius: 2,
          pointHoverRadius: 5,
          pointBackgroundColor: mainColor,
          yAxisID: 'y'
        },
        {
          label: 'Xatolar',
          data: errorData,
          borderColor: errorColor,
          backgroundColor: 'transparent',
          borderWidth: 2,
          pointRadius: 3,
          pointStyle: 'crossRot',
          showLine: false,
          yAxisID: 'y1'
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        mode: 'index',
        intersect: false
      },
      plugins: {
        legend: {
          display: true,
          labels: {
            color: textClr,
            font: { family: 'JetBrains Mono', size: 12 }
          }
        },
        tooltip: {
          backgroundColor: style.getPropertyValue('--sub-alt-color').trim() || '#2c2e31',
          titleColor: textClr,
          bodyColor: textClr,
          borderColor: subColor,
          borderWidth: 1,
          padding: 10,
          titleFont: { family: 'JetBrains Mono' },
          bodyFont: { family: 'JetBrains Mono' }
        }
      },
      scales: {
        x: {
          grid: { color: 'rgba(255, 255, 255, 0.05)' },
          ticks: { color: subColor, font: { family: 'JetBrains Mono', size: 11 } }
        },
        y: {
          beginAtZero: true,
          grid: { color: 'rgba(255, 255, 255, 0.05)' },
          ticks: { color: subColor, font: { family: 'JetBrains Mono', size: 11 } }
        },
        y1: {
          position: 'right',
          beginAtZero: true,
          grid: { display: false },
          ticks: { color: errorColor, precision: 0, font: { family: 'JetBrains Mono', size: 11 } }
        }
      }
    }
  });
}

function hexToRgba(hex, alpha) {
  let c = hex.replace('#', '');
  if (c.length === 3) {
    c = c.split('').map(x => x + x).join('');
  }
  const num = parseInt(c, 16);
  if (isNaN(num)) return `rgba(226, 183, 20, ${alpha})`;
  return `rgba(${(num >> 16) & 255}, ${(num >> 8) & 255}, ${num & 255}, ${alpha})`;
}

// ----------------------------------------------------
// LocalStorage (Tarix va Rekordlar)
// ----------------------------------------------------
function saveResultToStorage(result) {
  let history = JSON.parse(localStorage.getItem('mk_history') || '[]');
  history.unshift(result);
  if (history.length > 50) history.pop(); // Oxirgi 50 ta natija
  localStorage.setItem('mk_history', JSON.stringify(history));

  // Eng yaxshi WPM
  const bestWpm = parseInt(localStorage.getItem('mk_best_wpm') || '0', 10);
  if (result.wpm > bestWpm) {
    localStorage.setItem('mk_best_wpm', result.wpm);
  }
  updateBestWpmUI();
}

function updateBestWpmUI() {
  const best = localStorage.getItem('mk_best_wpm') || '0';
  if (elements.bestWpmDisplay) {
    elements.bestWpmDisplay.textContent = `${best} WPM`;
  }
}

function renderHistoryUI() {
  const history = JSON.parse(localStorage.getItem('mk_history') || '[]');
  elements.historyList.innerHTML = '';

  if (history.length === 0) {
    elements.historyList.innerHTML = '<div class="empty-state">Hali hech qanday natija saqlanmagan.</div>';
    return;
  }

  history.forEach(item => {
    const row = document.createElement('div');
    row.className = 'history-item';
    row.innerHTML = `
      <div>
        <div class="hist-wpm">${item.wpm} WPM</div>
        <div class="hist-meta">Aniqlik: ${item.acc}% | Raw: ${item.raw}</div>
      </div>
      <div style="text-align: right;">
        <div style="color: var(--text-color); font-weight: 500;">${item.modeValue} (${item.lang})</div>
        <div class="hist-meta">${item.date}</div>
      </div>
    `;
    elements.historyList.appendChild(row);
  });
}

// ----------------------------------------------------
// MONKEYTYPE ACTIVITY HEATMAP (HAQIQIY FOYDALANUVCHI FAOLLIGI)
// ----------------------------------------------------
function getRealActivityData() {
  const user = window.authManager && window.authManager.currentUser;
  const today = new Date().toISOString().split('T')[0];

  if (user) {
    if (!user.activity || typeof user.activity !== 'object') {
      user.activity = {};
    }
    // Agar oldingi versiyalardagi soxta mock 492 ta test saqlanib qolgan bo'lsa:
    // Faqat haqiqiy testsCompleted bo'yicha tozalaymiz!
    const totalInAct = Object.values(user.activity).reduce((a, b) => a + b, 0);
    const realTests = user.testsCompleted || 0;
    if (totalInAct > realTests) {
      user.activity = {};
      if (realTests > 0) {
        user.activity[today] = realTests;
      }
      if (window.authManager) window.authManager.saveCurrentUserData();
    }
    return user.activity;
  } else {
    // Mehmon (Guest) uchun haqiqiy faoliyat
    try {
      return JSON.parse(localStorage.getItem('mkt_guest_activity') || '{}');
    } catch (e) {
      return {};
    }
  }
}

function renderActivityHeatmap(range = '12months') {
  const container = document.getElementById('heatmap-grid-container');
  const countEl = document.getElementById('heatmap-total-tests');
  if (!container) return;

  const activity = getRealActivityData();

  let numWeeks = 52;
  if (range === '6months') numWeeks = 26;
  if (range === '3months') numWeeks = 13;

  const today = new Date();
  const endDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  
  // Dushanba = 0, Yakshanba = 6
  const currentDayOfWeek = (endDate.getDay() + 6) % 7;
  
  const startDate = new Date(endDate);
  startDate.setDate(endDate.getDate() - currentDayOfWeek - ((numWeeks - 1) * 7));

  container.innerHTML = '';
  let totalTests = 0;
  const monthLabels = [];
  let lastMonth = -1;

  for (let w = 0; w < numWeeks; w++) {
    const colEl = document.createElement('div');
    colEl.className = 'heatmap-col';

    for (let d = 0; d < 7; d++) {
      const cellDate = new Date(startDate);
      cellDate.setDate(startDate.getDate() + (w * 7) + d);

      const isFuture = cellDate > endDate;
      const dateStr = cellDate.toISOString().split('T')[0];
      const count = isFuture ? 0 : (activity[dateStr] || 0);
      if (!isFuture) totalTests += count;

      // Oy o'zgarishi (O'zbekcha qisqa oylar)
      if (d === 0) {
        const m = cellDate.getMonth();
        if (m !== lastMonth) {
          const uzbekMonths = ['yan', 'fev', 'mar', 'apr', 'may', 'iyn', 'iyl', 'avg', 'sen', 'okt', 'noy', 'dek'];
          monthLabels.push({ colIndex: w, name: uzbekMonths[m] });
          lastMonth = m;
        }
      }

      const cellEl = document.createElement('div');
      cellEl.className = 'heat-box';

      if (isFuture) {
        cellEl.style.opacity = '0';
        cellEl.style.pointerEvents = 'none';
      } else {
        let lvl = 0;
        if (count >= 1 && count <= 2) lvl = 1;
        else if (count >= 3 && count <= 5) lvl = 2;
        else if (count >= 6 && count <= 9) lvl = 3;
        else if (count >= 10) lvl = 4;

        cellEl.classList.add('lvl-' + lvl);
        const dayNum = cellDate.getDate();
        const uzbekFullMonths = ['yanvar', 'fevral', 'mart', 'aprel', 'may', 'iyun', 'iyul', 'avgust', 'sentabr', 'oktabr', 'noyabr', 'dekabr'];
        const dateFormatted = `${dayNum}-${uzbekFullMonths[cellDate.getMonth()]}`;
        cellEl.title = count > 0 ? `${count} ta test (${dateFormatted})` : `0 ta test (${dateFormatted})`;
      }

      colEl.appendChild(cellEl);
    }

    container.appendChild(colEl);
  }

  if (countEl) {
    countEl.textContent = `${totalTests} ta test`;
  }

  renderHeatmapMonths(monthLabels, numWeeks);
}

function renderHeatmapMonths(monthLabels, numWeeks) {
  const monthsRow = document.getElementById('heatmap-months-row');
  if (!monthsRow) return;
  monthsRow.innerHTML = '';

  monthLabels.forEach((item, idx) => {
    if (idx > 0 && (item.colIndex - monthLabels[idx - 1].colIndex) < 3) return;

    const span = document.createElement('span');
    span.className = 'heatmap-month-label';
    span.textContent = item.name;
    const percent = ((item.colIndex + 0.5) / numWeeks) * 100;
    span.style.left = `${percent}%`;
    monthsRow.appendChild(span);
  });
}

// ----------------------------------------------------
// Hodisalar (Event Listeners)
// ----------------------------------------------------
function setupEventListeners() {
  // Input va Klaviatura
  document.addEventListener('keydown', handleKeyDown);

  // Caps Lock tekshiruvi (Monkeytype imzo ogohlantirish xususiyati)
  const updateCapsLock = (e) => {
    const capsEl = document.getElementById('caps-lock-warning');
    if (!capsEl) return;
    if (e.getModifierState && e.getModifierState('CapsLock')) {
      capsEl.style.display = 'inline-flex';
    } else {
      capsEl.style.display = 'none';
    }
  };
  document.addEventListener('keydown', updateCapsLock);
  document.addEventListener('keyup', updateCapsLock);

  // Mobil virtual klaviatura (input hodisasi)
  elements.typingInput.addEventListener('input', (e) => {
    if (elements.typingInput.disabled) {
      elements.typingInput.value = '';
      return;
    }
    const isModalOpen = document.querySelector('.modal-overlay.active') || 
                        (document.getElementById('command-palette-overlay') && document.getElementById('command-palette-overlay').style.display === 'flex');
    if (isModalOpen) {
      elements.typingInput.value = '';
      return;
    }

    if (e.inputType === 'deleteContentBackward') {
      handleKeyDown({ key: 'Backspace', preventDefault: () => {} });
    } else if (e.data) {
      for (const char of e.data) {
        handleKeyDown({ key: char, preventDefault: () => {} });
      }
    }
    elements.typingInput.value = '';
  });

  // Barcha modal inputlarida klaviatura hodisalarini testga o'tishidan 100% himoya qilish
  document.querySelectorAll('input, select, textarea').forEach(inp => {
    if (inp.id !== 'typing-input') {
      inp.addEventListener('keydown', (e) => {
        e.stopPropagation();
      });
      inp.addEventListener('focus', () => {
        if (elements.typingInput) {
          elements.typingInput.disabled = true;
          elements.typingInput.blur();
        }
      });
    }
  });

  // Logo bosilganda qayta boshlash
  const logoBtn = document.getElementById('logo-refresh');
  if (logoBtn) {
    logoBtn.addEventListener('click', resetTest);
  }

  // Fokusni doimo yashirin inputda ushlab turish (mobil va sichqoncha bosilganda)
  elements.wordsWrapper.addEventListener('click', () => {
    const isModalOpen = document.querySelector('.modal-overlay.active');
    if (!isModalOpen && elements.typingInput) {
      elements.typingInput.disabled = false;
      elements.typingInput.focus();
    }
  });

  document.addEventListener('click', (e) => {
    // Agar birorta modal ochiq bo'lsa, test inputiga fokus berilmaydi!
    const isModalOpen = document.querySelector('.modal-overlay.active') || 
                        (document.getElementById('command-palette-overlay') && document.getElementById('command-palette-overlay').style.display === 'flex');
    if (isModalOpen) return;

    // Agar tugma, select yoki boshqa element bosilmagan bo'lsa, inputga fokus qaytarish
    if (!e.target.closest('button') && !e.target.closest('select') && !e.target.closest('input')) {
      if (elements.typingInput) {
        elements.typingInput.disabled = false;
        elements.typingInput.focus();
      }
    }
  });

  // Qayta boshlash tugmalari
  elements.restartBtn.addEventListener('click', resetTest);
  elements.retryBtn.addEventListener('click', resetTest);
  elements.nextTestBtn.addEventListener('click', resetTest);

  // Rejim tanlash (time / words)
  elements.modeBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      state.mode = btn.dataset.mode;
      localStorage.setItem('mk_mode', state.mode);
      updateConfigUI();
      resetTest();
    });
  });

  // Vaqt tanlash (15, 30, 60, 120s)
  elements.timeBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      state.timeLimit = parseInt(btn.dataset.time, 10);
      localStorage.setItem('mk_time', state.timeLimit);
      updateConfigUI();
      resetTest();
    });
  });

  // So'zlar soni tanlash (10, 25, 50, 100)
  elements.wordsBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      state.wordsLimit = parseInt(btn.dataset.words, 10);
      localStorage.setItem('mk_words', state.wordsLimit);
      updateConfigUI();
      resetTest();
    });
  });

  // Dasturlash tili tanlash (javascript, python, html, cpp)
  if (elements.codeLangBtns) {
    elements.codeLangBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        state.codeLanguage = btn.dataset.codeLang;
        localStorage.setItem('mk_code_lang', state.codeLanguage);
        updateConfigUI();
        resetTest();
      });
    });
  }

  // Tinish belgilari
  elements.punctToggle.addEventListener('click', () => {
    state.punctuation = !state.punctuation;
    localStorage.setItem('mk_punct', state.punctuation);
    updateConfigUI();
    resetTest();
  });

  // Raqamlar
  elements.numbersToggle.addEventListener('click', () => {
    state.numbers = !state.numbers;
    localStorage.setItem('mk_nums', state.numbers);
    updateConfigUI();
    resetTest();
  });

  // Ovoz tugmasi
  if (elements.soundToggle) {
    elements.soundToggle.addEventListener('click', () => {
      state.sound = !state.sound;
      soundManager.enabled = state.sound;
      localStorage.setItem('mk_sound', state.sound);
      updateConfigUI();
    });
  }

  // Til tanlash
  if (elements.languageSelect) {
    elements.languageSelect.addEventListener('change', (e) => {
      state.language = e.target.value;
      localStorage.setItem('mk_lang', state.language);
      resetTest();
    });
  }

  // Mavzular tugmalari
  elements.themeButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      applyTheme(btn.dataset.themeName);
    });
  });

  // Yagona xavfsiz modal ochish va yopish funksiyalari (orqa fondagi testni muzlatish)
  window.openAppModal = function(modalEl) {
    if (!modalEl) return;
    modalEl.classList.add('active');
    if (elements.typingInput) {
      elements.typingInput.disabled = true;
      elements.typingInput.blur();
    }
  };

  window.closeAppModal = function(modalEl) {
    if (!modalEl) return;
    modalEl.classList.remove('active');
    const anyModalOpen = document.querySelector('.modal-overlay.active') || 
                        (document.getElementById('command-palette-overlay') && document.getElementById('command-palette-overlay').style.display === 'flex');
    if (!anyModalOpen && elements.typingInput) {
      elements.typingInput.disabled = false;
      setTimeout(() => { elements.typingInput.focus(); }, 60);
    }
  };

  elements.openSettingsBtn.addEventListener('click', () => {
    window.openAppModal(elements.settingsModal);
  });

  elements.closeSettingsBtn.addEventListener('click', () => {
    window.closeAppModal(elements.settingsModal);
  });

  elements.openHistoryBtn.addEventListener('click', () => {
    renderHistoryUI();
    updateBestWpmUI();
    window.openAppModal(elements.historyModal);
  });

  elements.closeHistoryBtn.addEventListener('click', () => {
    window.closeAppModal(elements.historyModal);
  });

  // Modal tashqarisiga bosilganda yopish
  [elements.settingsModal, elements.historyModal].forEach(modal => {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        window.closeAppModal(modal);
      }
    });
  });

  // Tarixni tozalash
  if (elements.clearHistoryBtn) {
    elements.clearHistoryBtn.addEventListener('click', () => {
      if (confirm("Haqiqatan ham barcha natijalar tarixini tozalamoqchimisiz?")) {
        localStorage.removeItem('mk_history');
        localStorage.removeItem('mk_best_wpm');
        renderHistoryUI();
        updateBestWpmUI();
      }
    });
  }

  // ===================================================
  // AUTH HODISALARI (Kirish / Ro'yxat / Profil)
  // ===================================================
  const authModal = document.getElementById('auth-modal');
  const profileModal = document.getElementById('profile-modal');
  const authBtn = document.getElementById('auth-btn');
  const profileBtn = document.getElementById('profile-btn');
  const closeAuthBtn = document.getElementById('close-auth-btn');
  const closeProfileBtn = document.getElementById('close-profile-btn');
  const tabLoginBtn = document.getElementById('tab-login-btn');
  const tabRegisterBtn = document.getElementById('tab-register-btn');
  const loginForm = document.getElementById('login-form');
  const registerForm = document.getElementById('register-form');
  const logoutBtn = document.getElementById('logout-btn');

  let selectedAvatar = '⌨️';

  if (authBtn) {
    authBtn.addEventListener('click', () => {
      window.openAppModal(authModal);
      setTimeout(() => {
        const uInput = document.getElementById('login-username');
        if (uInput) uInput.focus();
      }, 100);
    });
  }

  if (closeAuthBtn) {
    closeAuthBtn.addEventListener('click', () => {
      window.closeAppModal(authModal);
    });
  }

  if (profileBtn) {
    profileBtn.addEventListener('click', () => {
      const u = window.authManager.currentUser;
      if (u) {
        document.getElementById('prof-avatar').textContent = u.avatar || '⌨️';
        document.getElementById('prof-name').textContent = u.username;
        document.getElementById('prof-joined').textContent = `A'zo bo'lingan: ${u.joinedDate || 'yaqinda'}`;
        
        // XP va Level
        const xpPercent = Math.min(Math.round(((u.xp || 0) / (u.xpToNextLevel || 400)) * 100), 100);
        document.getElementById('prof-xp-bar').style.width = `${xpPercent}%`;
        document.getElementById('prof-xp-text').textContent = `${u.xp || 0} / ${u.xpToNextLevel || 400} XP (lvl ${u.level || 1})`;

        // Rekordlar (Barcha davrlar)
        const bests = u.bestWpm || {};
        document.getElementById('best-15s').textContent = bests.time15 || 0;
        document.getElementById('best-30s').textContent = bests.time30 || 0;
        document.getElementById('best-60s').textContent = bests.time60 || 0;
        document.getElementById('best-120s').textContent = bests.time120 || 0;

        // Boshqa statistikalar
        document.getElementById('prof-tests').textContent = u.testsCompleted || 0;
        document.getElementById('prof-wins').textContent = u.wins || 0;
        const mins = Math.floor((u.totalTimeTyping || 0) / 60);
        document.getElementById('prof-time').textContent = `${mins} daq`;
        renderActivityHeatmap('12months');
      } else {
        renderActivityHeatmap('12months');
      }
      window.openAppModal(profileModal);
    });
  }

  const heatmapSelect = document.getElementById('heatmap-range-select');
  if (heatmapSelect) {
    heatmapSelect.addEventListener('change', (e) => {
      renderActivityHeatmap(e.target.value);
    });
  }

  if (closeProfileBtn) {
    closeProfileBtn.addEventListener('click', () => {
      window.closeAppModal(profileModal);
    });
  }

  if (tabLoginBtn && tabRegisterBtn) {
    tabLoginBtn.addEventListener('click', () => {
      tabLoginBtn.classList.add('active');
      tabRegisterBtn.classList.remove('active');
      loginForm.style.display = 'block';
      registerForm.style.display = 'none';
      setTimeout(() => { document.getElementById('login-username').focus(); }, 50);
    });

    tabRegisterBtn.addEventListener('click', () => {
      tabRegisterBtn.classList.add('active');
      tabLoginBtn.classList.remove('active');
      loginForm.style.display = 'none';
      registerForm.style.display = 'block';
      setTimeout(() => { document.getElementById('reg-username').focus(); }, 50);
    });
  }

  // Avatar tanlash
  document.querySelectorAll('#reg-avatar-selector .avatar-opt').forEach(opt => {
    opt.addEventListener('click', () => {
      document.querySelectorAll('#reg-avatar-selector .avatar-opt').forEach(o => o.classList.remove('active'));
      opt.classList.add('active');
      selectedAvatar = opt.dataset.avatar;
    });
  });

  // Login form submit
  if (loginForm) {
    loginForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const u = document.getElementById('login-username').value;
      const p = document.getElementById('login-password').value;
      const res = window.authManager.login(u, p);
      if (res.success) {
        window.closeAppModal(authModal);
        alert("Xush kelibsiz, " + res.user.username + "!");
      } else {
        alert(res.message);
      }
    });
  }

  // Register form submit
  if (registerForm) {
    registerForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const u = document.getElementById('reg-username').value;
      const p = document.getElementById('reg-password').value;
      const res = window.authManager.register(u, p, selectedAvatar);
      if (res.success) {
        window.closeAppModal(authModal);
        alert("Tabriklaymiz, " + res.user.username + "! Profilingiz yaratildi.");
      } else {
        alert(res.message);
      }
    });
  }

  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      window.authManager.logout();
      window.closeAppModal(profileModal);
    });
  }

  // Sound Pack Select
  const soundPackSelect = document.getElementById('sound-pack-select');
  if (soundPackSelect) {
    soundPackSelect.value = soundManager.soundPack;
    soundPackSelect.addEventListener('change', (e) => {
      soundManager.setSoundPack(e.target.value);
    });
  }

  // Caret Style Select (Monkeytype signature)
  const caretSelect = document.getElementById('caret-style-select');
  if (caretSelect) {
    caretSelect.value = state.caretStyle || 'line';
    caretSelect.addEventListener('change', (e) => {
      applyCaretStyle(e.target.value);
    });
  }

  // ===================================================
  // MONKEYTYPE COMMAND PALETTE (ESC BOSILGANDA)
  // ===================================================
  const cmdOverlay = document.getElementById('command-palette-overlay');
  const cmdInput = document.getElementById('command-input');
  const cmdList = document.getElementById('command-list');

  const commands = [
    { label: "theme: serika dark", action: () => applyTheme('serika_dark') },
    { label: "theme: carbon", action: () => applyTheme('carbon') },
    { label: "theme: dracula", action: () => applyTheme('dracula') },
    { label: "theme: nord", action: () => applyTheme('nord') },
    { label: "theme: cyberpunk", action: () => applyTheme('cyberpunk') },
    { label: "mode: time 15", action: () => { state.mode = 'time'; state.timeLimit = 15; updateConfigUI(); resetTest(); } },
    { label: "mode: time 30", action: () => { state.mode = 'time'; state.timeLimit = 30; updateConfigUI(); resetTest(); } },
    { label: "mode: time 60", action: () => { state.mode = 'time'; state.timeLimit = 60; updateConfigUI(); resetTest(); } },
    { label: "mode: words 25", action: () => { state.mode = 'words'; state.wordsLimit = 25; updateConfigUI(); resetTest(); } },
    { label: "mode: words 50", action: () => { state.mode = 'words'; state.wordsLimit = 50; updateConfigUI(); resetTest(); } },
    { label: "language: uzbek", action: () => { state.language = 'uzbek'; resetTest(); } },
    { label: "language: english", action: () => { state.language = 'english'; resetTest(); } },
    { label: "language: russian", action: () => { state.language = 'russian'; resetTest(); } },
    { label: "sound: thock", action: () => soundManager.setSoundPack('thock') },
    { label: "sound: clicky", action: () => soundManager.setSoundPack('click') },
    { label: "sound: bubble pop", action: () => soundManager.setSoundPack('pop') },
    { label: "sound: off", action: () => soundManager.setSoundPack('off') },
    { label: "multiplayer: custom room", action: () => window.openAppModal(document.getElementById('multiplayer-modal')) },
    { label: "view: account / profile", action: () => profileBtn.click() },
    { label: "restart test", action: () => resetTest() }
  ];

  window.openCommandPalette = function() {
    cmdOverlay.style.display = 'flex';
    cmdInput.value = '';
    renderCommandList('');
    if (elements.typingInput) {
      elements.typingInput.disabled = true;
      elements.typingInput.blur();
    }
    cmdInput.focus();
  };

  window.closeCommandPalette = function() {
    cmdOverlay.style.display = 'none';
    if (elements.typingInput) {
      elements.typingInput.disabled = false;
      setTimeout(() => { elements.typingInput.focus(); }, 60);
    }
  };

  function renderCommandList(query) {
    cmdList.innerHTML = '';
    const filtered = commands.filter(c => c.label.toLowerCase().includes(query.toLowerCase()));
    filtered.forEach((cmd, idx) => {
      const item = document.createElement('div');
      item.className = 'command-item' + (idx === 0 ? ' selected' : '');
      item.textContent = cmd.label;
      item.addEventListener('click', () => {
        cmd.action();
        window.closeCommandPalette();
      });
      cmdList.appendChild(item);
    });
  }

  if (cmdInput) {
    cmdInput.addEventListener('input', (e) => {
      renderCommandList(e.target.value);
    });

    cmdInput.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        window.closeCommandPalette();
      } else if (e.key === 'Enter') {
        const first = cmdList.querySelector('.command-item');
        if (first) first.click();
      }
    });
  }

  if (cmdOverlay) {
    cmdOverlay.addEventListener('click', (e) => {
      if (e.target === cmdOverlay) window.closeCommandPalette();
    });
  }

  // ===================================================
  // MULTIPLAYER HODISALARI (Poyga va Xonalar)
  // ===================================================
  const multiModal = document.getElementById('multiplayer-modal');
  const openMultiBtn = document.getElementById('open-multiplayer-btn');
  const closeMultiBtn = document.getElementById('close-multiplayer-btn');
  const createRoomBtn = document.getElementById('create-room-btn');
  const joinRoomBtn = document.getElementById('join-room-btn');
  const joinRoomInput = document.getElementById('join-room-input');
  const lobbyModal = document.getElementById('multiplayer-lobby-modal');
  const closeLobbyBtn = document.getElementById('close-lobby-btn');
  const lobbyStartBtn = document.getElementById('lobby-start-btn');
  const copyLinkBtn = document.getElementById('copy-room-link-btn');
  const leaveRaceBtn = document.getElementById('leave-race-btn');
  const raceResultsModal = document.getElementById('race-results-modal');
  const closeRaceResultsBtn = document.getElementById('close-race-results-btn');
  const raceAgainBtn = document.getElementById('race-again-btn');
  const raceExitBtn = document.getElementById('race-exit-btn');

  if (openMultiBtn) {
    openMultiBtn.addEventListener('click', () => {
      window.openAppModal(multiModal);
    });
  }

  if (closeMultiBtn) {
    closeMultiBtn.addEventListener('click', () => {
      window.closeAppModal(multiModal);
    });
  }

  if (createRoomBtn) {
    createRoomBtn.addEventListener('click', () => {
      window.closeAppModal(multiModal);
      window.openAppModal(lobbyModal);
      window.multiplayerManager.createRoom();
    });
  }

  if (joinRoomBtn) {
    joinRoomBtn.addEventListener('click', () => {
      const code = joinRoomInput.value.trim();
      if (!code) {
        alert("Iltimos, xona kodini kiriting!");
        return;
      }
      window.closeAppModal(multiModal);
      window.openAppModal(lobbyModal);
      window.multiplayerManager.joinRoom(code);
    });
  }

  if (copyLinkBtn) {
    copyLinkBtn.addEventListener('click', () => {
      const room = window.multiplayerManager.roomId;
      if (!room) return;
      const url = window.location.origin + window.location.pathname + '?room=' + room;
      navigator.clipboard.writeText(url).then(() => {
        copyLinkBtn.textContent = "✅ Nusxalandi!";
        setTimeout(() => { copyLinkBtn.textContent = "📋 Copy Room Link"; }, 2000);
      });
    });
  }

  if (lobbyStartBtn) {
    lobbyStartBtn.addEventListener('click', () => {
      window.multiplayerManager.startRace();
    });
  }

  if (closeLobbyBtn) {
    closeLobbyBtn.addEventListener('click', () => {
      window.closeAppModal(lobbyModal);
      window.multiplayerManager.leaveRoom();
    });
  }

  // Lobby Chat va Emojilar hodisalari
  const chatForm = document.getElementById('lobby-chat-form');
  const chatInput = document.getElementById('lobby-chat-input');
  if (chatForm && chatInput) {
    chatForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const txt = chatInput.value.trim();
      if (txt && window.multiplayerManager) {
        window.multiplayerManager.sendChatMessage(txt);
        chatInput.value = '';
      }
    });
  }

  document.querySelectorAll('.emoji-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const emoji = btn.dataset.emoji;
      if (emoji && window.multiplayerManager) {
        window.multiplayerManager.sendReaction(emoji);
      }
    });
  });

  if (leaveRaceBtn) {
    leaveRaceBtn.addEventListener('click', () => {
      window.multiplayerManager.leaveRoom();
    });
  }

  if (closeRaceResultsBtn) {
    closeRaceResultsBtn.addEventListener('click', () => {
      window.closeAppModal(raceResultsModal);
      window.multiplayerManager.leaveRoom();
    });
  }

  if (raceExitBtn) {
    raceExitBtn.addEventListener('click', () => {
      window.closeAppModal(raceResultsModal);
      window.multiplayerManager.leaveRoom();
    });
  }

  if (raceAgainBtn) {
    raceAgainBtn.addEventListener('click', () => {
      window.closeAppModal(raceResultsModal);
      if (window.multiplayerManager.isHost) {
        window.openAppModal(lobbyModal);
        document.getElementById('race-track-section').style.display = 'none';
      } else {
        alert("Xona egasi yangi poyga boshlashini kuting.");
      }
    });
  }

  // URL da ?room=XXXXXX bormi tekshirish
  const urlParams = new URLSearchParams(window.location.search);
  const roomParam = urlParams.get('room');
  if (roomParam) {
    setTimeout(() => {
      if (confirm(`Siz ${roomParam} xonasiga taklif qilindingiz. Qo'shilasizmi?`)) {
        window.openAppModal(lobbyModal);
        window.multiplayerManager.joinRoom(roomParam);
      }
    }, 500);
  }

  // Oyna o'lchami o'zgarganda kursor joyini to'g'rilash
  window.addEventListener('resize', updateCaretPosition);
}

// ===================================================
// MULTIPLAYER POYGA BOSHLANISH FUNKSIYASI
// ===================================================
window.startMultiplayerGame = function(words) {
  state.isMultiplayer = true;
  state.mode = 'words';
  state.wordsLimit = words.length;

  // UI tayyorlash
  document.getElementById('test-section').style.display = 'flex';
  document.getElementById('main-config-bar').style.display = 'none'; // Poygada sozlamalarni yashirish

  state.words = words;
  elements.wordsContainer.innerHTML = '';
  state.words.forEach((wordText, wIdx) => {
    const wordEl = document.createElement('div');
    wordEl.className = 'word' + (wIdx === 0 ? ' active' : '');
    wordEl.dataset.wordIndex = wIdx;

    for (let i = 0; i < wordText.length; i++) {
      const letterEl = document.createElement('span');
      letterEl.className = 'letter';
      letterEl.textContent = wordText[i];
      wordEl.appendChild(letterEl);
    }
    elements.wordsContainer.appendChild(wordEl);
  });

  state.currentWordIndex = 0;
  state.currentLetterIndex = 0;
  state.correctChars = 0;
  state.incorrectChars = 0;
  state.extraChars = 0;
  state.missedChars = 0;
  state.timeElapsed = 0;
  state.historyChartData = [];

  elements.liveStats.textContent = `0 / ${words.length}`;
  elements.typingInput.value = '';
  elements.typingInput.focus();

  startTest();
  setTimeout(updateCaretPosition, 20);
};

// Har safar harf yozilganda progressni do'stlarga yuborish
window.checkMultiplayerProgress = function() {
  if (state.isMultiplayer && window.multiplayerManager && window.multiplayerManager.isInRace) {
    const totalChars = Math.max(state.words.join(' ').length, 1);
    let typedChars = 0;
    for (let i = 0; i < state.currentWordIndex; i++) {
      typedChars += state.words[i].length + 1;
    }
    typedChars += state.currentLetterIndex;

    const progress = Math.min(Math.round((typedChars / totalChars) * 100), 100);
    const liveWpm = calculateLiveWpm();
    window.multiplayerManager.sendProgress(progress, liveWpm);
  }
};

// Finish test ni kengaytirish
const originalFinishTest = finishTest;
finishTest = function() {
  originalFinishTest();
  if (state.isMultiplayer && window.multiplayerManager) {
    const minutes = Math.max(state.timeElapsed, 1) / 60;
    const netWpm = Math.max(0, Math.round((state.correctChars / 5) / minutes));
    const totalTyped = state.correctChars + state.incorrectChars + state.extraChars;
    const accuracy = totalTyped > 0 ? Math.round((state.correctChars / totalTyped) * 100) : 0;
    window.multiplayerManager.sendFinish(netWpm, accuracy);
    document.getElementById('main-config-bar').style.display = 'flex';
  }
};

// Boshlash
window.addEventListener('DOMContentLoaded', init);
