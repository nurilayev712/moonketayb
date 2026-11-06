// MonkeyType Asosiy Logic
const WORDS = window.WORDS;
const soundManager = window.soundManager;

// Mahalliy vaqt bo'yicha YYYY-MM-DD formatlovchi yordamchi funksiya
function getLocalDateString(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
window.getLocalDateString = getLocalDateString;

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
  fingerGuidesEnabled: false,
  replayKeystrokes: [],
  lastCompletedTestReplay: null,
  quoteLength: 'all',
  paceCaretMode: 'off',
  fontFamily: "'Roboto Mono', monospace",
  caretAnim: 'smooth',
  blindMode: false,
  dynamicTabTitle: true,
  miniHudEnabled: true,
  wordStartTime: null,
  lastBurstWpm: 0,
  baseTitle: 'moonketayb | typex712',
  paceCaretTimer: null,
  testStartTime: 0,

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
  paceCaret: document.getElementById('pace-caret'),
  typingInput: document.getElementById('typing-input'),
  liveStats: document.getElementById('live-stats'),
  testSection: document.getElementById('test-section'),
  resultSection: document.getElementById('result-section'),
  restartBtn: document.getElementById('restart-btn'),
  retryBtn: document.getElementById('retry-btn'),
  nextTestBtn: document.getElementById('next-test-btn'),
  
  // Monkeytype Qo'shimcha elementlar
  zenHint: document.getElementById('zen-hint'),
  virtualKeyboard: document.getElementById('virtual-keyboard-wrapper'),
  capsLockWarning: document.getElementById('caps-lock-warning'),

  // Maxsus vaqt elementlari
  customTimeBtn: document.getElementById('custom-time-btn'),
  customTimeLabel: document.getElementById('custom-time-label'),
  customTimeModal: document.getElementById('custom-time-modal'),
  customTimeInput: document.getElementById('custom-time-input'),
  customTimeSaveBtn: document.getElementById('custom-time-save-btn'),
  customTimeCancelBtn: document.getElementById('custom-time-cancel-btn'),
  closeCustomTimeBtn: document.getElementById('close-custom-time-btn'),

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
  quoteLenBtns: document.querySelectorAll('[data-quote-len]'),
  timeGroup: document.getElementById('time-config-group'),
  wordsGroup: document.getElementById('words-config-group'),
  codeGroup: document.getElementById('code-config-group'),
  quoteGroup: document.getElementById('quote-config-group'),
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

  // Foydalanuvchi talabiga ko'ra birlamchi til qilib o'zbek tili (uzbek) o'rnatiladi
  if (localStorage.getItem('mkt_uzbek_default_v3') !== 'applied') {
    state.language = 'uzbek';
    localStorage.setItem('mk_lang', 'uzbek');
    localStorage.setItem('mkt_uzbek_default_v3', 'applied');
  } else {
    const savedLang = localStorage.getItem('mk_lang');
    if (savedLang) state.language = savedLang;
  }

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

  // Matn shrifti
  state.fontFamily = localStorage.getItem('mkt_font_family') || "'Roboto Mono', monospace";
  document.documentElement.style.setProperty('--font-family', state.fontFamily);
  const fontSel = document.getElementById('font-family-select');
  if (fontSel) fontSel.value = state.fontFamily;

  // Kursor animatsiyasi
  state.caretAnim = localStorage.getItem('mkt_caret_anim') || 'smooth';
  applyCaretAnim(state.caretAnim);

  // Ko'r-ko'rona rejim
  state.blindMode = localStorage.getItem('mkt_blind_mode') === 'true';
  document.body.classList.toggle('blind-mode', state.blindMode);
  const blindSel = document.getElementById('blind-mode-select');
  if (blindSel) blindSel.value = state.blindMode ? 'on' : 'off';

  // Soya kursor (Pace Caret)
  state.paceCaretMode = localStorage.getItem('mkt_pace_caret') || 'off';
  const paceSel = document.getElementById('pace-caret-select');
  if (paceSel) paceSel.value = state.paceCaretMode;

  // Jonli Mini-HUD
  const savedHud = localStorage.getItem('mk_mini_hud');
  state.miniHudEnabled = (savedHud !== 'off');
  const hudSel = document.getElementById('mini-hud-select');
  if (hudSel) hudSel.value = state.miniHudEnabled ? 'on' : 'off';
  updateMiniHud();

  // Ovoz balandligi
  const volSlider = document.getElementById('sound-volume-slider');
  const volDisp = document.getElementById('sound-volume-display');
  if (volSlider && window.soundManager) {
    volSlider.value = Math.round(soundManager.volume * 100);
    if (volDisp) volDisp.textContent = `${volSlider.value}%`;
  }

  // Barmoqlar yo'riqnomasi (Finger Guides)
  state.fingerGuidesEnabled = (localStorage.getItem('mkt_finger_guides') === 'on');
  const fgSel = document.getElementById('finger-guides-select');
  if (fgSel) fgSel.value = state.fingerGuidesEnabled ? 'on' : 'off';
  updateFingerGuide();
}

// ----------------------------------------------------
// Caret va Kursor Boshqaruvi
// ----------------------------------------------------
function applyCaretStyle(style) {
  state.caretStyle = style;
  localStorage.setItem('mk_caret_style', style);
  if (elements.caret) {
    elements.caret.className = 'caret blink caret-' + style + ' ' + (state.caretAnim || 'smooth');
  }
  const sel = document.getElementById('caret-style-select');
  if (sel && sel.value !== style) sel.value = style;
}

function applyCaretAnim(anim) {
  state.caretAnim = anim;
  localStorage.setItem('mkt_caret_anim', anim);
  if (elements.caret) {
    elements.caret.classList.toggle('smooth', anim === 'smooth');
    elements.caret.classList.toggle('anim-off', anim === 'off');
    elements.caret.classList.toggle('anim-default', anim === 'default');
  }
  const sel = document.getElementById('caret-anim-select');
  if (sel && sel.value !== anim) sel.value = anim;
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
    if (elements.quoteGroup) elements.quoteGroup.style.display = 'none';
  } else if (state.mode === 'words') {
    elements.timeGroup.style.display = 'none';
    elements.wordsGroup.style.display = 'flex';
    if (elements.codeGroup) elements.codeGroup.style.display = 'none';
    if (elements.quoteGroup) elements.quoteGroup.style.display = 'none';
  } else if (state.mode === 'code') {
    elements.timeGroup.style.display = 'none';
    elements.wordsGroup.style.display = 'none';
    if (elements.codeGroup) elements.codeGroup.style.display = 'flex';
    if (elements.quoteGroup) elements.quoteGroup.style.display = 'none';
  } else if (state.mode === 'quote') {
    elements.timeGroup.style.display = 'none';
    elements.wordsGroup.style.display = 'none';
    if (elements.codeGroup) elements.codeGroup.style.display = 'none';
    if (elements.quoteGroup) elements.quoteGroup.style.display = 'flex';
  } else {
    // custom, zen
    elements.timeGroup.style.display = 'none';
    elements.wordsGroup.style.display = 'none';
    if (elements.codeGroup) elements.codeGroup.style.display = 'none';
    if (elements.quoteGroup) elements.quoteGroup.style.display = 'none';
  }

  // Iqtibos uzunligi tugmalari
  if (elements.quoteLenBtns) {
    elements.quoteLenBtns.forEach(btn => {
      btn.classList.toggle('active', btn.dataset.quoteLen === state.quoteLength);
    });
  }

  // Dasturlash tili tugmalari
  if (elements.codeLangBtns) {
    elements.codeLangBtns.forEach(btn => {
      btn.classList.toggle('active', btn.dataset.codeLang === state.codeLanguage);
    });
  }

  // Vaqt tugmalari
  const standardTimes = [15, 30, 60, 120];
  const isCustomTime = !standardTimes.includes(state.timeLimit);

  elements.timeBtns.forEach(btn => {
    if (btn.dataset.time === 'custom') {
      btn.classList.toggle('active', isCustomTime);
    } else {
      btn.classList.toggle('active', parseInt(btn.dataset.time, 10) === state.timeLimit);
    }
  });

  if (elements.customTimeLabel) {
    elements.customTimeLabel.textContent = isCustomTime ? `${state.timeLimit}s` : 'maxsus';
  }

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
  const langLabel = document.getElementById('current-language-label');
  if (langLabel) {
    langLabel.textContent = state.language || 'english';
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

  // 0. Maxsus matn (Custom Text rejimi)
  if (state.mode === 'custom') {
    if (state.customWords && state.customWords.length > 0) {
      return [...state.customWords];
    }
    return ["Maxsus", "matn", "kiritilmadi.", "Iltimos,", "maxsus", "tugmasi", "orqali", "matn", "yozing."];
  }

  // 1. Zen rejimi (cheksiz erkin yozish oqimi)
  if (state.mode === 'zen') {
    const source = (WORDS && WORDS[state.language]) || (WORDS && WORDS.uzbek) || [];
    const result = [];
    for (let i = 0; i < 200; i++) {
      result.push(source[Math.floor(Math.random() * source.length)]);
    }
    return result;
  }

  // 2. Dasturlash tillari (Code rejimi)
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
    let quotesList = (WORDS && WORDS.quotes) || [];
    if (state.quoteLength === 'short') {
      quotesList = quotesList.filter(q => q.text.length < 90);
    } else if (state.quoteLength === 'medium') {
      quotesList = quotesList.filter(q => q.text.length >= 90 && q.text.length <= 180);
    } else if (state.quoteLength === 'long') {
      quotesList = quotesList.filter(q => q.text.length > 180);
    }
    if (quotesList.length === 0) quotesList = (WORDS && WORDS.quotes) || [];
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
  let lastWord = '';

  for (let i = 0; i < count; i++) {
    // Tasodifiy so'z (Monkeytype uslubida ketma-ket bir xil so'z takrorlanishidan himoya)
    let word = source[Math.floor(Math.random() * source.length)];
    if (source.length > 1) {
      let attempts = 0;
      while (word === lastWord && attempts < 10) {
        word = source[Math.floor(Math.random() * source.length)];
        attempts++;
      }
    }
    lastWord = word;

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

  // Avval so'zlar konteynerini silliq avtomatik scroll qilish (Monkeytype 3 qator tizimi)
  const wordTop = currentWordEl.offsetTop;
  const lineH = currentWordEl.offsetHeight || 44;
  if (wordTop > lineH * 1.5) {
    elements.wordsContainer.scrollTop = wordTop - lineH;
  } else {
    elements.wordsContainer.scrollTop = 0;
  }

  const letters = currentWordEl.querySelectorAll('.letter');
  const containerRect = elements.wordsContainer.getBoundingClientRect();

  let targetX = 0;
  let targetY = 0;
  const caretH = (elements.caret && elements.caret.offsetHeight) || 30;

  if (state.currentLetterIndex < letters.length) {
    const targetLetter = letters[state.currentLetterIndex];
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
    const wordRect = currentWordEl.getBoundingClientRect();
    targetX = wordRect.left - containerRect.left;
    targetY = wordRect.top - containerRect.top;
  }

  elements.caret.style.left = `${targetX}px`;
  elements.caret.style.top = `${targetY}px`;

  if (state.isMultiplayer && window.multiplayerManager && window.multiplayerManager.isInRace) {
    window.multiplayerManager.renderTribeCarets();
  }

  if (state.virtualKeyboardEnabled && state.fingerGuidesEnabled) {
    updateFingerGuide();
  }
}

// ----------------------------------------------------
// Soya Kursor (Pace Caret - Monkeytype Target WPM ghost)
// ----------------------------------------------------
function startPaceCaret() {
  stopPaceCaret();
  if (state.paceCaretMode === 'off' || !elements.paceCaret) return;

  let targetWpm = 60;
  if (state.paceCaretMode === 'pb') {
    if (window.authManager && window.authManager.currentUser && window.authManager.currentUser.bestWpm) {
      targetWpm = window.authManager.currentUser.bestWpm.time30 || window.authManager.currentUser.bestWpm.time15 || 60;
    } else {
      targetWpm = 60;
    }
  } else {
    targetWpm = parseInt(state.paceCaretMode, 10) || 60;
  }

  const charsPerSec = (targetWpm * 5) / 60;
  elements.paceCaret.style.display = 'block';

  state.paceCaretTimer = setInterval(() => {
    if (!state.isRunning || state.isFinished) {
      stopPaceCaret();
      return;
    }
    const elapsed = Math.max(0, (Date.now() - state.testStartTime) / 1000);
    const targetCharCount = Math.floor(charsPerSec * elapsed);

    let cCount = 0;
    let targetWordIdx = 0;
    let targetLetterIdx = 0;

    for (let w = 0; w < state.words.length; w++) {
      const wLen = state.words[w].length + 1;
      if (cCount + wLen > targetCharCount) {
        targetWordIdx = w;
        targetLetterIdx = targetCharCount - cCount;
        break;
      }
      cCount += wLen;
      if (w === state.words.length - 1) {
        targetWordIdx = w;
        targetLetterIdx = state.words[w].length;
      }
    }

    const currentWordEl = elements.wordsContainer.children[targetWordIdx];
    if (!currentWordEl) return;
    const letters = currentWordEl.querySelectorAll('.letter');
    const containerRect = elements.wordsContainer.getBoundingClientRect();

    let targetX = 0;
    let targetY = 0;

    if (targetLetterIdx < letters.length) {
      const letterRect = letters[targetLetterIdx].getBoundingClientRect();
      targetX = letterRect.left - containerRect.left;
      targetY = letterRect.top - containerRect.top + (letterRect.height - 30) / 2;
    } else if (letters.length > 0) {
      const lastLetter = letters[letters.length - 1];
      const letterRect = lastLetter.getBoundingClientRect();
      targetX = letterRect.right - containerRect.left;
      targetY = letterRect.top - containerRect.top + (letterRect.height - 30) / 2;
    }

    elements.paceCaret.style.left = `${targetX}px`;
    elements.paceCaret.style.top = `${targetY}px`;
  }, 50);
}

function stopPaceCaret() {
  if (state.paceCaretTimer) {
    clearInterval(state.paceCaretTimer);
    state.paceCaretTimer = null;
  }
  if (elements.paceCaret) {
    elements.paceCaret.style.display = 'none';
  }
}

// ----------------------------------------------------
// Testni qayta boshlash (Reset)
// ----------------------------------------------------
function resetTest() {
  clearInterval(state.timer);
  stopPaceCaret();
  resetTabTitle();
  if (!window.multiplayerManager || !window.multiplayerManager.isInRace) {
    state.isMultiplayer = false;
  }
  state.isRunning = false;
  state.isFinished = false;
  state.timeElapsed = 0;
  state.timeRemaining = state.timeLimit;
  state.correctChars = 0;
  state.incorrectChars = 0;
  state.extraChars = 0;
  state.missedChars = 0;
  state.historyChartData = [];

  // Fokus rejimidan chiqish va test holatini tozalash
  document.body.classList.remove('focus-mode');
  document.body.classList.remove('test-running');
  elements.caret.classList.add('blink');

  // UI elementlarni tiklash
  elements.testSection.style.display = 'flex';
  elements.resultSection.classList.remove('active');
  elements.wordsContainer.scrollTop = 0;

  // Zen mode va Virtual Klaviatura boshqaruvi
  if (elements.zenHint) {
    elements.zenHint.style.display = (state.mode === 'zen') ? 'block' : 'none';
  }
  if (elements.virtualKeyboard) {
    elements.virtualKeyboard.classList.toggle('hidden', !state.virtualKeyboardEnabled);
  }

  renderWords();

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
  } else if (state.mode === 'custom') {
    elements.liveStats.textContent = `0 / ${state.words.length}`;
    elements.liveStats.classList.remove('hidden');
  } else if (state.mode === 'zen') {
    elements.liveStats.textContent = `zen`;
    elements.liveStats.classList.remove('hidden');
  }

  elements.typingInput.value = '';
  elements.typingInput.focus();

  state.wordStartTime = null;
  state.lastBurstWpm = 0;
  state.replayKeystrokes = [];
  updateMiniHud();
  updateFingerGuide();
}

// ----------------------------------------------------
// Testni boshlash (Start)
// ----------------------------------------------------
function startTest() {
  if (state.isRunning) return;
  state.isRunning = true;
  document.body.classList.add('test-running');
  state.testStartTime = Date.now();
  state.replayKeystrokes = [];
  startPaceCaret();
  
  if (state.focusModeEnabled) {
    document.body.classList.add('focus-mode');
  }
  elements.caret.classList.remove('blink');

  soundManager.init();

  const startTime = Date.now();

  state.timer = setInterval(() => {
    state.timeElapsed++;

    const live = calculateLiveStats();

    if (state.mode === 'time') {
      state.timeRemaining--;
      elements.liveStats.textContent = state.timeRemaining;

      if (state.timeRemaining <= 0) {
        finishTest();
        return;
      }
    } else if (state.mode === 'words' || state.mode === 'custom') {
      const targetCount = state.mode === 'words' ? state.wordsLimit : state.words.length;
      elements.liveStats.textContent = `${state.currentWordIndex} / ${targetCount}`;
    } else {
      elements.liveStats.textContent = `${state.timeElapsed}s`;
    }

    // Grafik uchun har soniyada WPM saqlash
    state.historyChartData.push({
      second: state.timeElapsed,
      wpm: live.netWpm,
      raw: live.rawWpm,
      errors: state.incorrectChars + state.extraChars
    });

    // Dinamik tab sarlavhasi (Live Tab Title)
    updateLiveTabTitle();
    updateMiniHud();

    if (state.isMultiplayer && window.checkMultiplayerProgress) {
      window.checkMultiplayerProgress();
    }

  }, 1000);
}

// Joriy jonli statistika (Live WPM, Raw va Aniqlik)
function calculateLiveStats() {
  let elapsedSeconds = state.timeElapsed;
  if (state.testStartTime && state.isRunning) {
    elapsedSeconds = Math.max(0.5, (Date.now() - state.testStartTime) / 1000);
  }
  const minutes = Math.max(elapsedSeconds / 60, 0.008);
  const totalTyped = state.correctChars + state.incorrectChars + state.extraChars;
  const netWpm = Math.max(0, Math.round((state.correctChars / 5) / minutes));
  const rawWpm = Math.max(0, Math.round((totalTyped / 5) / minutes));
  const acc = totalTyped > 0 ? Math.round((state.correctChars / totalTyped) * 100) : 100;
  return { netWpm, rawWpm, acc };
}

// Jonli WPM olish (Do'stlar poygasi va indikatorlar uchun)
function calculateLiveWpm() {
  return calculateLiveStats().netWpm;
}

// Monkeytype Barqarorlik (Consistency %) hisoblash formulasi
function calculateConsistency(chartData) {
  if (!chartData || chartData.length < 2) return 100;
  const wpms = chartData.map(d => d.wpm);
  const avg = wpms.reduce((a, b) => a + b, 0) / wpms.length;
  if (avg === 0) return 0;
  const squareDiffs = wpms.map(v => Math.pow(v - avg, 2));
  const avgSquareDiff = squareDiffs.reduce((a, b) => a + b, 0) / squareDiffs.length;
  const stdDev = Math.sqrt(avgSquareDiff);
  return Math.max(0, Math.min(100, Math.round(100 * (1 - (stdDev / avg)))));
}

// ----------------------------------------------------
// Monkeytype Dinamik Brauzer Sarlavhasi (Live Tab Title)
// ----------------------------------------------------
function updateLiveTabTitle() {
  if (!state.dynamicTabTitle) return;
  if (!state.isRunning || state.isFinished) return;

  const live = calculateLiveStats();
  const wpm = live.netWpm;

  if (state.mode === 'time') {
    document.title = `(${state.timeRemaining}s) ${wpm} wpm | moonketayb`;
  } else if (state.mode === 'words') {
    document.title = `(${state.currentWordIndex}/${state.wordsLimit}) ${wpm} wpm | moonketayb`;
  } else if (state.mode === 'code' || state.mode === 'custom' || state.mode === 'quote') {
    const totalWords = state.words.length || 25;
    document.title = `(${state.currentWordIndex}/${totalWords}) ${wpm} wpm | moonketayb`;
  } else {
    document.title = `(${state.timeElapsed}s) ${wpm} wpm | moonketayb`;
  }
}

function resetTabTitle() {
  document.title = state.baseTitle || 'moonketayb | typex712';
}

function setFinishedTabTitle(wpm, acc) {
  if (!state.dynamicTabTitle) return;
  document.title = `${wpm} wpm • ${acc}% | moonketayb`;
}

// ----------------------------------------------------
// Jonli Mini-HUD (Monkeytype Live Stats HUD)
// ----------------------------------------------------
function updateMiniHud() {
  const hud = document.getElementById('live-mini-hud');
  if (!hud) return;
  if (!state.miniHudEnabled) {
    hud.classList.add('hidden');
    return;
  }
  hud.classList.remove('hidden');

  const live = calculateLiveStats();
  const hudWpm = document.getElementById('hud-wpm');
  const hudAcc = document.getElementById('hud-acc');
  const hudBurst = document.getElementById('hud-burst');

  if (hudWpm) hudWpm.textContent = live.netWpm || 0;
  if (hudAcc) hudAcc.textContent = `${live.acc ?? 100}%`;
  if (hudBurst) hudBurst.textContent = state.lastBurstWpm || 0;
}

// ----------------------------------------------------
// 10 Barmoq bilan Yozish Yo'riqnomasi (Finger Guides)
// ----------------------------------------------------
const FINGER_NAMES = {
  lp: "chap jimjiloq",
  lr: "chap nomsiz",
  lm: "chap o'rta",
  li: "chap ko'rsatkich",
  th: "bosh barmoq (space)",
  ri: "o'ng ko'rsatkich",
  rm: "o'ng o'rta",
  rr: "o'ng nomsiz",
  rp: "o'ng jimjiloq"
};

const FINGER_COLORS = {
  lp: "#f43f5e",
  lr: "#f97316",
  lm: "#eab308",
  li: "#10b981",
  th: "#06b6d4",
  ri: "#6366f1",
  rm: "#a855f7",
  rr: "#d946ef",
  rp: "#ec4899"
};

function updateFingerGuide() {
  const vk = elements.virtualKeyboard;
  if (!vk) return;
  const hintEl = document.getElementById('finger-guide-hint');
  const dotEl = document.getElementById('finger-hint-dot');
  const textEl = document.getElementById('finger-hint-text');

  if (!state.fingerGuidesEnabled || !state.virtualKeyboardEnabled) {
    vk.classList.remove('finger-guides-enabled');
    if (hintEl) hintEl.style.display = 'none';
    vk.querySelectorAll('.vkey.next-target').forEach(k => {
      k.classList.remove('next-target');
      k.style.color = '';
      k.style.borderColor = '';
    });
    return;
  }

  vk.classList.add('finger-guides-enabled');
  if (hintEl) hintEl.style.display = 'flex';

  let targetChar = '';
  if (state.words && state.currentWordIndex < state.words.length) {
    const word = state.words[state.currentWordIndex];
    if (state.currentLetterIndex < word.length) {
      targetChar = word[state.currentLetterIndex].toLowerCase();
      if (["'", "`", "’", "‘", "ʻ", "ʼ"].includes(targetChar)) {
        targetChar = "'";
      }
    } else {
      targetChar = ' ';
    }
  }

  vk.querySelectorAll('.vkey.next-target').forEach(k => {
    k.classList.remove('next-target');
    k.style.color = '';
    k.style.borderColor = '';
  });

  if (!targetChar) return;

  const targetKeyEl = vk.querySelector(`.vkey[data-key="${targetChar}"]`);
  if (targetKeyEl) {
    targetKeyEl.classList.add('next-target');
    const fingerCode = targetKeyEl.dataset.finger || 'li';
    const fingerColor = FINGER_COLORS[fingerCode] || 'var(--main-color)';
    const fingerName = FINGER_NAMES[fingerCode] || "ko'rsatkich barmoq";

    targetKeyEl.style.color = fingerColor;
    targetKeyEl.style.borderColor = fingerColor;

    if (dotEl) {
      dotEl.style.background = fingerColor;
      dotEl.style.boxShadow = `0 0 10px ${fingerColor}`;
    }
    if (textEl) {
      const displayKey = targetChar === ' ' ? 'space' : targetChar;
      textEl.innerHTML = `Keyingi tugma: <b style="color: ${fingerColor}; text-transform: uppercase;">[${displayKey}]</b> — ${fingerName}`;
    }
  }
}

// ----------------------------------------------------
// Replay uchun har bir tugma bosilishini yozib borish
// ----------------------------------------------------
function logReplayKeystroke(key, isBs = false, isSp = false) {
  if (!state.testStartTime) return;
  state.replayKeystrokes.push({
    t: Date.now() - state.testStartTime,
    key: key,
    isBs: isBs,
    isSp: isSp,
    wIdx: state.currentWordIndex,
    lIdx: state.currentLetterIndex,
    correct: state.correctChars,
    incorrect: state.incorrectChars,
    extra: state.extraChars,
    wpm: calculateLiveStats().netWpm
  });
}

// Harflarni solishtirish (Monkeytype 1:1 - harflar katta-kichikligiga (case-sensitive) qat'iy rioya qilinadi)
// Katta harf bilan yozilganda yoki Caps Lock yoniq bo'lsa xato deb hisoblanadi
function areCharsEqual(typed, expected) {
  if (typed === expected) return true;
  // Barcha turdagi apostrof va tutuq belgilari bir-biriga 100% ekvivalent
  const APOS = ["'", "`", "’", "‘", "ʻ", "ʼ", "´", "ʹ", "\u02bb", "\u02bc", "\u2019", "\u2018"];
  if (APOS.includes(typed) && APOS.includes(expected)) return true;
  return false;
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

  // 3. Agar test inputi adashib o'chirilgan bo'lsa, darhol faollashtirish
  if (elements.typingInput && elements.typingInput.disabled) {
    elements.typingInput.disabled = false;
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
    if (state.isMultiplayer && window.multiplayerManager && window.multiplayerManager.isInRace) {
      return; // Do'stlar poygasi paytida adashib Tab bosilganda o'yin buzilib ketmasligi uchun
    }
    resetTest();
    return;
  }

  // Esc orqali MonkeyType Command Palette ochish
  if (e.key === 'Escape') {
    e.preventDefault();
    if (state.isMultiplayer && window.multiplayerManager && window.multiplayerManager.isInRace) {
      return; // Do'stlar poygasi paytida Command Palette poygani to'xtatib qo'ymasligi uchun
    }
    if (window.openCommandPalette) {
      window.openCommandPalette();
    } else {
      resetTest();
    }
    return;
  }

  // Zen rejimida Shift + Enter orqali testni yakunlash
  if (state.mode === 'zen' && e.shiftKey && e.key === 'Enter') {
    e.preventDefault();
    finishTest();
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

  // SPACE BOSILGANDA (Keyingi so'zga o'tish yoki so'zni o'tkazib yuborish)
  const isSpaceKey = (
    e.key === ' ' || 
    e.key === 'Spacebar' || 
    e.key === 'Space' || 
    e.code === 'Space' || 
    e.keyCode === 32 || 
    e.which === 32
  );

  if (isSpaceKey) {
    e.preventDefault();
    if (window.triggerVKeyGlow) window.triggerVKeyGlow(' ');

    if (!state.isRunning) {
      startTest();
      return;
    }

    // Probel bosilganda (Monkeytype 1:1 - darhol keyingi so'zga o'tish)
    const now = Date.now();
    if (state.lastSpaceTime && (now - state.lastSpaceTime < 40)) {
      return; // Faqat juda tez apparat tebranishidan (hardware chatter) himoya
    }
    state.lastSpaceTime = now;

    soundManager.playKey(false, true);

    // Kiritilmagan qolgan harflarni "missed" deb hisoblash (Monkeytype skip)
    for (let i = state.currentLetterIndex; i < targetWord.length; i++) {
      letters[i].classList.add('incorrect');
      state.missedChars++;
      if (state.masterMode) {
        finishTest();
        return;
      }
    }

    currentWordEl.classList.remove('active');
    state.currentWordIndex++;
    state.currentLetterIndex = 0;

    // Words, Code, Quote va Custom rejimlarida limit tekshirish
    const isWordBasedMode = (state.mode === 'words' || state.mode === 'code' || state.mode === 'quote' || state.mode === 'custom');
    if (isWordBasedMode) {
      const targetCount = state.mode === 'words' ? state.wordsLimit : state.words.length;
      elements.liveStats.textContent = `${state.currentWordIndex} / ${targetCount}`;
      if (state.currentWordIndex >= targetCount) {
        finishTest();
        return;
      }
    }

    // Burst WPM hisoblash (Monkeytype Live Burst)
    if (state.wordStartTime) {
      const wordSecs = Math.max((Date.now() - state.wordStartTime) / 1000, 0.08);
      const charsInWord = targetWord.length + 1;
      const burst = Math.round((charsInWord / 5) / (wordSecs / 60));
      state.lastBurstWpm = Math.min(burst, 350);
    }
    state.wordStartTime = Date.now();

    // Time yoki Zen rejimida so'zlar tugab qolmasligi uchun yangi so'zlar qo'shish (Multiplayerda so'zlar oldindan sinxron bo'ladi)
    if (!state.isMultiplayer && state.currentWordIndex >= state.words.length - 10) {
      appendMoreWords(30);
    }

    const nextWordEl = elements.wordsContainer.children[state.currentWordIndex];
    if (nextWordEl) {
      nextWordEl.classList.add('active');
    }

    logReplayKeystroke(' ', false, true);
    updateCaretPosition();
    updateMiniHud();
    if (state.isMultiplayer && window.checkMultiplayerProgress) {
      window.checkMultiplayerProgress();
    }
    return;
  }

  // BACKSPACE BOSILGANDA
  if (e.key === 'Backspace') {
    e.preventDefault();
    if (window.triggerVKeyGlow) window.triggerVKeyGlow('Backspace');

    // No Backspace rejimi yoqilgan bo'lsa xatolarni o'chirish taqiqlanadi
    if (state.noBackspace) {
      return;
    }

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
      updateMiniHud();
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
        updateMiniHud();
      }
    }
    if (state.isMultiplayer && window.checkMultiplayerProgress) {
      window.checkMultiplayerProgress();
    }
    logReplayKeystroke('Backspace', true, false);
    return;
  }

  // ODDIY HARF BOSILGANDA (Faqat 1 ta belgi)
  if (e.key.length === 1) {
    e.preventDefault();
    if (!state.wordStartTime) {
      state.wordStartTime = Date.now();
    }
    const typedChar = e.key;
    if (window.triggerVKeyGlow) window.triggerVKeyGlow(typedChar);

    if (state.currentLetterIndex < targetWord.length) {
      // Kutilayotgan harf bilan solishtirish
      const expectedChar = targetWord[state.currentLetterIndex];
      const letterEl = letters[state.currentLetterIndex];

      if (areCharsEqual(typedChar, expectedChar)) {
        letterEl.classList.add('correct');
        state.correctChars++;
        soundManager.playKey(false, false);
      } else {
        letterEl.classList.add('incorrect');
        state.incorrectChars++;
        soundManager.playKey(true, false);

        // Master Mode (Sudden Death): Birinchi xato bilanoq to'xtatish!
        if (state.masterMode) {
          updateCaretPosition();
          updateMiniHud();
          finishTest();
          return;
        }
      }
      state.currentLetterIndex++;
    } else {
      // Ortiqcha (extra) harflar qo'shish
      if (state.masterMode) {
        soundManager.playKey(true, false);
        finishTest();
        return;
      }
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

    // Words / Code / Quote / Custom rejimida oxirgi so'zning oxirgi harfi kiritilganda yakunlash
    const isWordBased = (state.mode === 'words' || state.mode === 'code' || state.mode === 'quote' || state.mode === 'custom');
    const totalWordCount = state.mode === 'words' ? state.wordsLimit : state.words.length;
    if (isWordBased && 
        state.currentWordIndex === totalWordCount - 1 && 
        state.currentLetterIndex >= targetWord.length) {
      finishTest();
      return;
    }

    logReplayKeystroke(typedChar, false, false);
    updateCaretPosition();
    updateMiniHud();
    if (state.isMultiplayer && window.checkMultiplayerProgress) {
      window.checkMultiplayerProgress();
    }
  }
}

// Qo'shimcha so'zlar ulash (Time rejimi uchun)
function appendMoreWords(count) {
  const source = WORDS[state.language] || WORDS.uzbek;
  let lastWord = state.words[state.words.length - 1] || '';
  for (let i = 0; i < count; i++) {
    let word = source[Math.floor(Math.random() * source.length)];
    if (source.length > 1) {
      let attempts = 0;
      while (word === lastWord && attempts < 10) {
        word = source[Math.floor(Math.random() * source.length)];
        attempts++;
      }
    }
    lastWord = word;
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
  stopPaceCaret();
  state.isRunning = false;
  state.isFinished = true;
  document.body.classList.remove('focus-mode');
  document.body.classList.remove('test-running');

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

  // Barqarorlik (Consistency %) hisoblash
  const consistency = calculateConsistency(state.historyChartData);
  if (elements.resultConsistency) {
    elements.resultConsistency.textContent = `${consistency}%`;
  }

  // UI almashtirish
  elements.testSection.style.display = 'none';
  elements.resultSection.classList.add('active');

  // Dinamik tab sarlavhasi (Yakuniy natija bilan)
  setFinishedTabTitle(netWpm, accuracy);

  // Replay va Share Card uchun oxirgi testni to'liq saqlash
  state.lastCompletedTestReplay = {
    words: [...state.words],
    events: [...state.replayKeystrokes],
    netWpm: netWpm,
    rawWpm: rawWpm,
    acc: accuracy,
    consistency: consistency,
    correctChars: state.correctChars,
    incorrectChars: state.incorrectChars,
    extraChars: state.extraChars,
    missedChars: state.missedChars,
    time: testDuration,
    mode: state.mode,
    modeValue: state.mode === 'time' ? `${state.timeLimit}s` : `${state.wordsLimit} so'z`,
    lang: state.language,
    chartData: [...state.historyChartData]
  };

  // Natijani saqlash
  const todayDateStr = getLocalDateString();
  saveResultToStorage({
    wpm: netWpm,
    acc: accuracy,
    raw: rawWpm,
    mode: state.mode,
    modeValue: state.mode === 'time' ? `${state.timeLimit}s` : `${state.wordsLimit} so'z`,
    lang: state.language,
    date: new Date().toLocaleDateString('uz-UZ', { hour: '2-digit', minute: '2-digit' }),
    dateStr: todayDateStr,
    timestamp: Date.now()
  });

  // Foydalanuvchi hisobiga XP va statistika qo'shish
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
  const rawData = state.historyChartData.map(d => d.raw !== undefined ? d.raw : d.wpm);
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
          label: 'Sof WPM (Raw)',
          data: rawData,
          borderColor: subColor,
          borderDash: [5, 5],
          backgroundColor: 'transparent',
          fill: false,
          tension: 0.35,
          borderWidth: 2,
          pointRadius: 1,
          pointBackgroundColor: subColor,
          yAxisID: 'y'
        },
        {
          label: 'Xatolar',
          data: errorData,
          borderColor: errorColor,
          backgroundColor: 'transparent',
          borderWidth: 2,
          pointRadius: 4,
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

// Kunlik ketma-ketlik (Streak) hisoblash funksiyasi
function calculateStreakStats(activity) {
  const dates = Object.keys(activity).filter(d => (activity[d] || 0) > 0).sort();
  if (dates.length === 0) {
    return { currentStreak: 0, maxStreak: 0, activeDays: 0 };
  }

  const activeDays = dates.length;
  const todayStr = getLocalDateString();
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = getLocalDateString(yesterday);

  // Joriy streak (Current streak)
  let currentStreak = 0;
  let checkDate = null;
  if ((activity[todayStr] || 0) > 0) {
    checkDate = new Date();
  } else if ((activity[yesterdayStr] || 0) > 0) {
    checkDate = yesterday;
  }

  if (checkDate) {
    const iter = new Date(checkDate.getFullYear(), checkDate.getMonth(), checkDate.getDate());
    while (true) {
      const dStr = getLocalDateString(iter);
      if ((activity[dStr] || 0) > 0) {
        currentStreak++;
        iter.setDate(iter.getDate() - 1);
      } else {
        break;
      }
    }
  }

  // Maksimal streak (Max streak)
  let maxStreak = 0;
  let runningStreak = 0;
  let prevDate = null;

  dates.forEach(dStr => {
    const parts = dStr.split('-').map(Number);
    const cur = new Date(parts[0], parts[1] - 1, parts[2]);
    if (!prevDate) {
      runningStreak = 1;
    } else {
      const diffTime = cur.getTime() - prevDate.getTime();
      const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
      if (diffDays === 1) {
        runningStreak++;
      } else if (diffDays > 1) {
        runningStreak = 1;
      }
    }
    if (runningStreak > maxStreak) maxStreak = runningStreak;
    prevDate = cur;
  });

  return { currentStreak, maxStreak, activeDays };
}

// Barcha haqiqiy faoliyatni xavfsiz birlashtirib olish (hech qanday kun o'chirilmaydi!)
function getRealActivityData() {
  const user = window.authManager && window.authManager.currentUser;
  let activity = {};

  if (user) {
    if (!user.activity || typeof user.activity !== 'object') {
      user.activity = {};
    }
    // Mehmon paytidagi faollik bo'lsa uni ham birlashtiramiz
    try {
      const guestAct = JSON.parse(localStorage.getItem('mkt_guest_activity') || '{}');
      for (const [d, count] of Object.entries(guestAct)) {
        user.activity[d] = Math.max(user.activity[d] || 0, Number(count) || 0);
      }
    } catch (e) {}
    activity = user.activity;
  } else {
    // Mehmon foydalanuvchi
    try {
      activity = JSON.parse(localStorage.getItem('mkt_guest_activity') || '{}');
    } catch (e) {
      activity = {};
    }
  }

  // mk_history orqali mavjud bo'lgan testlarni ham qayta tiklash
  try {
    const history = JSON.parse(localStorage.getItem('mk_history') || '[]');
    let historyChanged = false;
    history.forEach(item => {
      let dStr = item.dateStr;
      if (!dStr && item.timestamp) {
        dStr = getLocalDateString(new Date(item.timestamp));
        item.dateStr = dStr;
        historyChanged = true;
      }
      if (dStr) {
        if (!activity[dStr]) {
          activity[dStr] = 1;
        }
      }
    });
    if (historyChanged) {
      localStorage.setItem('mk_history', JSON.stringify(history));
    }
  } catch (e) {}

  // O'zgarishlarni doimiy saqlash
  if (user) {
    user.activity = activity;
    if (window.authManager) window.authManager.saveCurrentUserData();
  } else {
    try {
      localStorage.setItem('mkt_guest_activity', JSON.stringify(activity));
    } catch (e) {}
  }

  return activity;
}

// Floating Tooltip ko'rsatish
function showHeatmapTooltip(e, text) {
  let tip = document.getElementById('heatmap-tooltip');
  if (!tip) {
    tip = document.createElement('div');
    tip.id = 'heatmap-tooltip';
    tip.className = 'heatmap-tooltip';
    document.body.appendChild(tip);
  }
  tip.textContent = text;
  tip.style.display = 'block';
  const rect = e.target.getBoundingClientRect();
  tip.style.left = `${rect.left + rect.width / 2}px`;
  tip.style.top = `${rect.top - 8}px`;
}

function hideHeatmapTooltip() {
  const tip = document.getElementById('heatmap-tooltip');
  if (tip) {
    tip.style.display = 'none';
  }
}

function renderActivityHeatmap(range = '12months') {
  const container = document.getElementById('heatmap-grid-container');
  const countEl = document.getElementById('heatmap-total-tests');
  const activeDaysEl = document.getElementById('heatmap-active-days');
  const streakEl = document.getElementById('prof-streak');
  const maxStreakEl = document.getElementById('prof-max-streak');
  if (!container) return;

  const activity = getRealActivityData();
  const streakStats = calculateStreakStats(activity);

  if (streakEl) {
    streakEl.innerHTML = `<span class="flame-icon">🔥</span> ${streakStats.currentStreak} kun`;
  }
  if (maxStreakEl) {
    maxStreakEl.textContent = `⚡ ${streakStats.maxStreak} kun`;
  }
  if (activeDaysEl) {
    activeDaysEl.textContent = `• ${streakStats.activeDays} faol kun`;
  }

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

  const uzbekMonths = ['yan', 'fev', 'mar', 'apr', 'may', 'iyn', 'iyl', 'avg', 'sen', 'okt', 'noy', 'dek'];
  const uzbekFullMonths = ['yanvar', 'fevral', 'mart', 'aprel', 'may', 'iyun', 'iyul', 'avgust', 'sentabr', 'oktabr', 'noyabr', 'dekabr'];

  for (let w = 0; w < numWeeks; w++) {
    const colEl = document.createElement('div');
    colEl.className = 'heatmap-col';

    for (let d = 0; d < 7; d++) {
      const cellDate = new Date(startDate);
      cellDate.setDate(startDate.getDate() + (w * 7) + d);

      const isFuture = cellDate > endDate;
      const dateStr = getLocalDateString(cellDate);
      const count = isFuture ? 0 : (Number(activity[dateStr]) || 0);
      if (!isFuture) totalTests += count;

      // Oy o'zgarishi
      if (d === 0) {
        const m = cellDate.getMonth();
        if (m !== lastMonth) {
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
        cellEl.dataset.date = dateStr;
        cellEl.dataset.count = count;

        const dayNum = cellDate.getDate();
        const dateFormatted = `${dayNum}-${uzbekFullMonths[cellDate.getMonth()]}, ${cellDate.getFullYear()}`;
        const tooltipText = count > 0 ? `${count} ta test • ${dateFormatted}` : `Faollik yo'q • ${dateFormatted}`;
        cellEl.title = tooltipText;

        cellEl.addEventListener('mouseenter', (e) => {
          showHeatmapTooltip(e, tooltipText);
        });
        cellEl.addEventListener('mouseleave', () => {
          hideHeatmapTooltip();
        });
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
    // Har bir colEl 11px + 3px gap = 14px
    span.style.left = `${item.colIndex * 14}px`;
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
      elements.typingInput.disabled = false;
    }
    const isModalOpen = document.querySelector('.modal-overlay.active') || 
                        (document.getElementById('command-palette-overlay') && document.getElementById('command-palette-overlay').style.display === 'flex');
    if (isModalOpen) {
      elements.typingInput.value = '';
      return;
    }

    if (e.inputType && e.inputType.startsWith('delete')) {
      handleKeyDown({ key: 'Backspace', preventDefault: () => {} });
    } else {
      const textToProcess = (typeof e.data === 'string' && e.data.length > 0) ? e.data : elements.typingInput.value;
      if (textToProcess) {
        for (const char of textToProcess) {
          handleKeyDown({ key: char, preventDefault: () => {} });
        }
      }
    }
    elements.typingInput.value = '';
  });

  function ensureInputFocus() {
    const isModalOpen = document.querySelector('.modal-overlay.active') || 
                        (document.getElementById('command-palette-overlay') && document.getElementById('command-palette-overlay').style.display === 'flex');
    if (!isModalOpen && elements.typingInput) {
      elements.typingInput.disabled = false;
      elements.typingInput.focus();
    }
  }
  window.ensureInputFocus = ensureInputFocus;

  // Barcha modal inputlarida klaviatura hodisalarini testga o'tishidan 100% himoya qilish
  document.querySelectorAll('input, select, textarea').forEach(inp => {
    if (inp.id !== 'typing-input') {
      inp.addEventListener('keydown', (e) => {
        e.stopPropagation();
      });
      inp.addEventListener('blur', () => {
        setTimeout(ensureInputFocus, 60);
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

  // Rejim tanlash (time / words / custom / zen / code / quote)
  elements.modeBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const selectedMode = btn.dataset.mode;
      if (selectedMode === 'custom') {
        window.openAppModal(elements.customTextModal);
        return;
      }
      state.mode = selectedMode;
      localStorage.setItem('mk_mode', state.mode);
      updateConfigUI();
      resetTest();
    });
  });

  // Maxsus matn (Custom Text) modali hodisalari
  if (elements.customTextStartBtn) {
    elements.customTextStartBtn.addEventListener('click', () => {
      const text = elements.customTextInput ? elements.customTextInput.value.trim() : '';
      if (!text) {
        alert("Iltimos, matn kiriting!");
        return;
      }
      state.customWords = text.split(/\s+/).filter(Boolean);
      state.mode = 'custom';
      localStorage.setItem('mk_mode', 'custom');
      window.closeAppModal(elements.customTextModal);
      updateConfigUI();
      resetTest();
    });
  }

  if (elements.customTextCancelBtn) {
    elements.customTextCancelBtn.addEventListener('click', () => {
      window.closeAppModal(elements.customTextModal);
    });
  }

  if (elements.closeCustomTextBtn) {
    elements.closeCustomTextBtn.addEventListener('click', () => {
      window.closeAppModal(elements.customTextModal);
    });
  }

  // Sozlamalar: Fokus rejimi
  if (elements.focusModeSelect) {
    elements.focusModeSelect.addEventListener('change', (e) => {
      state.focusModeEnabled = (e.target.value === 'on');
      localStorage.setItem('mkt_focus_mode', e.target.value);
    });
  }

  // Sozlamalar: Ekrandagi virtual klaviatura
  if (elements.virtualKeyboardSelect) {
    elements.virtualKeyboardSelect.addEventListener('change', (e) => {
      state.virtualKeyboardEnabled = (e.target.value === 'on');
      localStorage.setItem('mkt_virtual_keyboard', e.target.value);
      if (elements.virtualKeyboard) {
        elements.virtualKeyboard.classList.toggle('hidden', !state.virtualKeyboardEnabled);
      }
    });
  }

  // Sozlamalar: Master rejimi (Sudden Death)
  if (elements.masterModeSelect) {
    elements.masterModeSelect.addEventListener('change', (e) => {
      state.masterMode = (e.target.value === 'on');
      localStorage.setItem('mkt_master_mode', e.target.value);
    });
  }

  // Sozlamalar: No Backspace
  if (elements.noBackspaceSelect) {
    elements.noBackspaceSelect.addEventListener('change', (e) => {
      state.noBackspace = (e.target.value === 'on');
      localStorage.setItem('mkt_no_backspace', e.target.value);
    });
  }

  // Ekrandagi klaviatura tugmalarini jonli yoritish (Interaktivlik & Ripple Glow)
  function triggerVKeyGlow(keyChar) {
    if (!elements.virtualKeyboard || !state.virtualKeyboardEnabled) return;
    const key = (keyChar === ' ' ? ' ' : (keyChar || '').toLowerCase());
    const vkey = elements.virtualKeyboard.querySelector(`.vkey[data-key="${key}"]`);
    if (vkey) {
      vkey.classList.remove('glow-pulse');
      void vkey.offsetWidth; // trigger reflow
      vkey.classList.add('active', 'glow-pulse');
      setTimeout(() => {
        vkey.classList.remove('active');
      }, 160);
    }
  }
  window.triggerVKeyGlow = triggerVKeyGlow;

  window.addEventListener('keydown', (e) => {
    if (elements.virtualKeyboard && state.virtualKeyboardEnabled) {
      triggerVKeyGlow(e.key);
    }
  });

  window.addEventListener('keyup', (e) => {
    if (elements.virtualKeyboard && state.virtualKeyboardEnabled) {
      let key = e.key === ' ' ? ' ' : e.key.toLowerCase();
      const vkey = elements.virtualKeyboard.querySelector(`.vkey[data-key="${key}"]`);
      if (vkey) vkey.classList.remove('active');
    }
  });

  // Ekrandagi jonli klaviaturani sichqoncha yoki sensorli ekranda bosganda harflar va bo'shliqni (space) yozish
  if (elements.virtualKeyboard) {
    elements.virtualKeyboard.addEventListener('pointerdown', (e) => {
      const vkey = e.target.closest('.vkey');
      if (!vkey) return;
      e.preventDefault(); // Input fokusini yo'qotmaslik uchun!

      const keyChar = vkey.dataset.key;
      if (keyChar !== undefined) {
        triggerVKeyGlow(keyChar);
        if (keyChar === ' ') {
          handleKeyDown({ key: ' ', code: 'Space', keyCode: 32, preventDefault: () => {} });
        } else {
          handleKeyDown({ key: keyChar, code: 'Key' + keyChar.toUpperCase(), keyCode: keyChar.charCodeAt(0), preventDefault: () => {} });
        }
      }
      if (elements.typingInput) {
        elements.typingInput.disabled = false;
        elements.typingInput.focus();
      }
    });
  }

  // Fokus rejimi: Sichqoncha qimirlaganda interfeysni vaqtincha ko'rsatish
  let focusMouseMoveTimer = null;
  window.addEventListener('mousemove', () => {
    if (state.isRunning && state.focusModeEnabled && document.body.classList.contains('focus-mode')) {
      document.body.classList.remove('focus-mode');
      clearTimeout(focusMouseMoveTimer);
      focusMouseMoveTimer = setTimeout(() => {
        if (state.isRunning && state.focusModeEnabled) {
          document.body.classList.add('focus-mode');
        }
      }, 1800);
    }
  });

  // Vaqt tanlash (15, 30, 60, 120s yoki maxsus)
  elements.timeBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      if (btn.dataset.time === 'custom') {
        if (elements.customTimeInput) {
          elements.customTimeInput.value = state.timeLimit || 45;
        }
        window.openAppModal(elements.customTimeModal);
        setTimeout(() => {
          if (elements.customTimeInput) {
            elements.customTimeInput.focus();
            elements.customTimeInput.select();
          }
        }, 100);
        return;
      }
      state.timeLimit = parseInt(btn.dataset.time, 10);
      localStorage.setItem('mk_time', state.timeLimit);
      updateConfigUI();
      resetTest();
    });
  });

  // Maxsus vaqtni saqlash va boshqarish
  if (elements.customTimeSaveBtn) {
    elements.customTimeSaveBtn.addEventListener('click', () => {
      const val = parseInt(elements.customTimeInput ? elements.customTimeInput.value : '', 10);
      if (isNaN(val) || val < 5 || val > 3600) {
        alert("Iltimos, 5 dan 3600 gacha bo'lgan soniya kiriting!");
        return;
      }
      state.timeLimit = val;
      localStorage.setItem('mk_time', state.timeLimit);
      window.closeAppModal(elements.customTimeModal);
      updateConfigUI();
      resetTest();
    });
  }

  if (elements.customTimeCancelBtn) {
    elements.customTimeCancelBtn.addEventListener('click', () => {
      window.closeAppModal(elements.customTimeModal);
    });
  }

  if (elements.closeCustomTimeBtn) {
    elements.closeCustomTimeBtn.addEventListener('click', () => {
      window.closeAppModal(elements.customTimeModal);
    });
  }

  if (elements.customTimeInput) {
    elements.customTimeInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        if (elements.customTimeSaveBtn) elements.customTimeSaveBtn.click();
      }
    });
  }

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
      updateConfigUI();
      resetTest();
    });
  }

  // Jonli til ko'rsatkichini bosganda tillarni o'zgartirish (Monkeytype 1:1)
  const langPill = document.getElementById('current-language-pill');
  if (langPill) {
    langPill.addEventListener('click', () => {
      const languages = ['english', 'uzbek', 'russian'];
      const curIdx = languages.indexOf(state.language);
      const nextLang = languages[(curIdx + 1) % languages.length];
      state.language = nextLang;
      localStorage.setItem('mk_lang', state.language);
      updateConfigUI();
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
  [elements.settingsModal, elements.historyModal, elements.customTextModal, elements.customTimeModal].forEach(modal => {
    if (modal) {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) {
          window.closeAppModal(modal);
        }
      });
    }
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
        const act = getRealActivityData();
        const totalGuestTests = Object.values(act).reduce((a, b) => a + (Number(b) || 0), 0);
        if (document.getElementById('prof-tests')) document.getElementById('prof-tests').textContent = totalGuestTests;
        if (document.getElementById('prof-wins')) document.getElementById('prof-wins').textContent = 0;
        if (document.getElementById('prof-time')) document.getElementById('prof-time').textContent = `0 daq`;
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

  // Ovoz balandligi slider
  const soundVolSlider = document.getElementById('sound-volume-slider');
  const soundVolDisplay = document.getElementById('sound-volume-display');
  if (soundVolSlider && window.soundManager) {
    soundVolSlider.value = Math.round(soundManager.volume * 100);
    if (soundVolDisplay) soundVolDisplay.textContent = `${soundVolSlider.value}%`;
    soundVolSlider.addEventListener('input', (e) => {
      const val = parseInt(e.target.value, 10);
      soundManager.setVolume(val / 100);
      if (soundVolDisplay) soundVolDisplay.textContent = `${val}%`;
    });
  }

  // Jonli Mini-HUD Select
  const miniHudSelect = document.getElementById('mini-hud-select');
  if (miniHudSelect) {
    miniHudSelect.value = state.miniHudEnabled ? 'on' : 'off';
    miniHudSelect.addEventListener('change', (e) => {
      state.miniHudEnabled = (e.target.value === 'on');
      localStorage.setItem('mk_mini_hud', e.target.value);
      updateMiniHud();
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

  // Matn Shrifti (Font Family)
  const fontSelect = document.getElementById('font-family-select');
  if (fontSelect) {
    fontSelect.value = state.fontFamily;
    fontSelect.addEventListener('change', (e) => {
      state.fontFamily = e.target.value;
      document.documentElement.style.setProperty('--font-family', state.fontFamily);
      localStorage.setItem('mkt_font_family', state.fontFamily);
      setTimeout(updateCaretPosition, 20);
    });
  }

  // Soya Kursor (Pace Caret)
  const paceSelect = document.getElementById('pace-caret-select');
  if (paceSelect) {
    paceSelect.value = state.paceCaretMode;
    paceSelect.addEventListener('change', (e) => {
      state.paceCaretMode = e.target.value;
      localStorage.setItem('mkt_pace_caret', state.paceCaretMode);
    });
  }

  // Kursor Animatsiyasi
  const caretAnimSelect = document.getElementById('caret-anim-select');
  if (caretAnimSelect) {
    caretAnimSelect.value = state.caretAnim;
    caretAnimSelect.addEventListener('change', (e) => {
      applyCaretAnim(e.target.value);
    });
  }

  // Ko'r-ko'rona rejim (Blind Mode)
  const blindSelect = document.getElementById('blind-mode-select');
  if (blindSelect) {
    blindSelect.value = state.blindMode ? 'on' : 'off';
    blindSelect.addEventListener('change', (e) => {
      state.blindMode = e.target.value === 'on';
      document.body.classList.toggle('blind-mode', state.blindMode);
      localStorage.setItem('mkt_blind_mode', state.blindMode);
    });
  }

  // Iqtibos uzunligi tanlash
  document.querySelectorAll('[data-quote-len]').forEach(btn => {
    btn.addEventListener('click', () => {
      state.quoteLength = btn.dataset.quoteLen;
      document.querySelectorAll('[data-quote-len]').forEach(b => {
        b.classList.toggle('active', b.dataset.quoteLen === state.quoteLength);
      });
      resetTest();
    });
  });

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
    { label: "sound: nk creams", action: () => soundManager.setSoundPack('cream') },
    { label: "sound: typewriter", action: () => soundManager.setSoundPack('typewriter') },
    { label: "sound: bubble pop", action: () => soundManager.setSoundPack('pop') },
    { label: "sound: retro beep", action: () => soundManager.setSoundPack('beep') },
    { label: "sound: off", action: () => soundManager.setSoundPack('off') },
    { label: "hud: toggle live mini-hud (wpm, acc, burst)", action: () => {
      state.miniHudEnabled = !state.miniHudEnabled;
      localStorage.setItem('mk_mini_hud', state.miniHudEnabled ? 'on' : 'off');
      const hudSel = document.getElementById('mini-hud-select');
      if (hudSel) hudSel.value = state.miniHudEnabled ? 'on' : 'off';
      updateMiniHud();
    }},
    { label: "virtual keyboard: on/off", action: () => {
      state.virtualKeyboardEnabled = !state.virtualKeyboardEnabled;
      localStorage.setItem('mkt_virtual_keyboard', state.virtualKeyboardEnabled ? 'on' : 'off');
      if (elements.virtualKeyboardSelect) elements.virtualKeyboardSelect.value = state.virtualKeyboardEnabled ? 'on' : 'off';
      if (elements.virtualKeyboard) elements.virtualKeyboard.classList.toggle('hidden', !state.virtualKeyboardEnabled);
    }},
    { label: "tab title: toggle dynamic live title", action: () => {
      state.dynamicTabTitle = !state.dynamicTabTitle;
      if (!state.dynamicTabTitle) resetTabTitle();
    }},
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

  // Tribe Nav Tabs Switching (Monkeytype 1-to-1)
  document.querySelectorAll('.tribe-tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tribe-tab-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const targetTab = btn.dataset.tribeTab;
      document.querySelectorAll('.tribe-tab-content').forEach(c => c.style.display = 'none');
      const targetContent = document.getElementById('tribe-tab-' + targetTab);
      if (targetContent) targetContent.style.display = 'block';
    });
  });

  // Tribe Create Room Capsule Configuration
  let tribeSelectedMode = 'time';
  let tribeSelectedLimit = 30;
  let tribeSelectedLang = 'uzbek';

  function attachTribeLimitListeners() {
    document.querySelectorAll('#tribe-create-limit .tribe-cfg-pill').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('#tribe-create-limit .tribe-cfg-pill').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        tribeSelectedLimit = parseInt(btn.dataset.limit, 10);
      });
    });
  }
  attachTribeLimitListeners();

  document.querySelectorAll('#tribe-create-mode .tribe-cfg-pill').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('#tribe-create-mode .tribe-cfg-pill').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      tribeSelectedMode = btn.dataset.mode;

      const limitBox = document.getElementById('tribe-create-limit');
      if (limitBox) {
        if (tribeSelectedMode === 'time') {
          limitBox.innerHTML = `
            <button type="button" class="tribe-cfg-pill" data-limit="15">15</button>
            <button type="button" class="tribe-cfg-pill active" data-limit="30">30</button>
            <button type="button" class="tribe-cfg-pill" data-limit="60">60</button>
          `;
          tribeSelectedLimit = 30;
        } else {
          limitBox.innerHTML = `
            <button type="button" class="tribe-cfg-pill active" data-limit="25">25</button>
            <button type="button" class="tribe-cfg-pill" data-limit="50">50</button>
            <button type="button" class="tribe-cfg-pill" data-limit="100">100</button>
          `;
          tribeSelectedLimit = 25;
        }
        attachTribeLimitListeners();
      }
    });
  });

  document.querySelectorAll('#tribe-create-lang .tribe-cfg-pill').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('#tribe-create-lang .tribe-cfg-pill').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      tribeSelectedLang = btn.dataset.lang;
    });
  });

  const joinPublicBtn = document.getElementById('join-public-room-btn');
  if (joinPublicBtn) {
    joinPublicBtn.addEventListener('click', () => {
      window.multiplayerManager.joinRoom('arena_public');
    });
  }

  if (createRoomBtn) {
    createRoomBtn.addEventListener('click', () => {
      window.closeAppModal(multiModal);
      window.openAppModal(lobbyModal);
      window.multiplayerManager.createRoom(tribeSelectedMode, tribeSelectedLimit, tribeSelectedLang);
    });
  }

  if (joinRoomBtn) {
    joinRoomBtn.addEventListener('click', () => {
      const code = joinRoomInput.value.trim();
      if (!code) {
        alert("⚠️ Iltimos, xona kodini kiriting!");
        return;
      }
      window.multiplayerManager.joinRoom(code);
    });
  }

  if (joinRoomInput) {
    joinRoomInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        if (joinRoomBtn) joinRoomBtn.click();
      }
    });
  }

  if (copyLinkBtn) {
    copyLinkBtn.addEventListener('click', () => {
      const room = window.multiplayerManager.roomId;
      if (!room) return;
      const url = window.location.origin + window.location.pathname + '?room=' + room;
      navigator.clipboard.writeText(url).then(() => {
        copyLinkBtn.textContent = "✅ Nusxalandi!";
        setTimeout(() => { copyLinkBtn.textContent = "📋 Nusxalash"; }, 2000);
      });
    });
  }

  if (lobbyStartBtn) {
    lobbyStartBtn.addEventListener('click', () => {
      window.multiplayerManager.startRace();
    });
  }

  const lobbyReadyBtn = document.getElementById('lobby-ready-btn');
  if (lobbyReadyBtn) {
    lobbyReadyBtn.addEventListener('click', () => {
      if (window.multiplayerManager) {
        window.multiplayerManager.toggleReady();
      }
    });
  }

  const lobbyLeaveBtn = document.getElementById('lobby-leave-btn');
  if (lobbyLeaveBtn) {
    lobbyLeaveBtn.addEventListener('click', () => {
      window.multiplayerManager.leaveRoom();
    });
  }

  document.querySelectorAll('.lobby-cfg-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      if (window.multiplayerManager && window.multiplayerManager.isHost) {
        const mode = btn.dataset.lobbyMode;
        const limit = parseInt(btn.dataset.lobbyLimit, 10);
        window.multiplayerManager.setRoomConfig(mode, limit);
      }
    });
  });

  document.querySelectorAll('.lobby-lang-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      if (window.multiplayerManager && window.multiplayerManager.isHost) {
        const lang = btn.dataset.lobbyLang;
        window.multiplayerManager.setRoomLang(lang);
      }
    });
  });

  // Shift + Enter tezkor klaviatura buyrug'i
  document.addEventListener('keydown', (e) => {
    if (lobbyModal && lobbyModal.classList.contains('active')) {
      if (e.key === 'Enter' && e.shiftKey) {
        e.preventDefault();
        if (window.multiplayerManager) {
          if (window.multiplayerManager.isHost) {
            window.multiplayerManager.startRace();
          } else {
            window.multiplayerManager.toggleReady();
          }
        }
      }
    }
  });

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
      if (window.multiplayerManager) {
        window.multiplayerManager.requestRaceAgain();
      }
    });
  }

  // 📸 Natija kartochkasi (Share Card)
  const shareCardBtn = document.getElementById('share-card-btn');
  const shareCardModal = document.getElementById('share-card-modal');
  const closeShareCardBtn = document.getElementById('close-share-card-btn');
  const downloadShareCardBtn = document.getElementById('download-share-card-btn');
  const copyShareCardBtn = document.getElementById('copy-share-card-btn');

  if (shareCardBtn) {
    shareCardBtn.addEventListener('click', openShareCardModal);
  }
  if (closeShareCardBtn && shareCardModal) {
    closeShareCardBtn.addEventListener('click', () => {
      window.closeAppModal(shareCardModal);
    });
  }
  if (downloadShareCardBtn) {
    downloadShareCardBtn.addEventListener('click', downloadShareCard);
  }
  if (copyShareCardBtn) {
    copyShareCardBtn.addEventListener('click', copyShareCard);
  }

  // 🎬 Yozish takrori (Replay)
  const replayBtn = document.getElementById('replay-btn');
  const replayModal = document.getElementById('replay-modal');
  const closeReplayBtn = document.getElementById('close-replay-btn');
  const replayPlayBtn = document.getElementById('replay-play-btn');
  const replayRestartBtn = document.getElementById('replay-restart-btn');
  const replayScrubber = document.getElementById('replay-scrubber');

  if (replayBtn) {
    replayBtn.addEventListener('click', openReplayModal);
  }
  if (closeReplayBtn && replayModal) {
    closeReplayBtn.addEventListener('click', () => {
      if (replayState.timer) {
        clearInterval(replayState.timer);
        replayState.timer = null;
      }
      replayState.isPlaying = false;
      window.closeAppModal(replayModal);
    });
  }
  if (replayPlayBtn) {
    replayPlayBtn.addEventListener('click', () => toggleReplayPlay());
  }
  if (replayRestartBtn) {
    replayRestartBtn.addEventListener('click', () => {
      replayState.currentMs = 0;
      renderReplayAt(0);
      toggleReplayPlay(true);
    });
  }
  if (replayScrubber) {
    replayScrubber.addEventListener('input', (e) => {
      const val = parseFloat(e.target.value) || 0;
      const ms = (val / 1000) * replayState.totalMs;
      replayState.currentMs = ms;
      renderReplayAt(ms);
    });
  }
  document.querySelectorAll('.replay-speed-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      replayState.speed = parseFloat(btn.dataset.speed) || 1;
      updateReplaySpeedUI();
    });
  });

  // ⌨️ Barmoqlar yo'riqnomasi (Finger Guides)
  const fingerGuidesSelect = document.getElementById('finger-guides-select');
  if (fingerGuidesSelect) {
    fingerGuidesSelect.addEventListener('change', (e) => {
      state.fingerGuidesEnabled = (e.target.value === 'on');
      localStorage.setItem('mkt_finger_guides', e.target.value);
      updateFingerGuide();
    });
  }

  // URL da ?room=XXXXXX bormi tekshirish (Bir zumda avtomatik ulanish)
  const urlParams = new URLSearchParams(window.location.search);
  const roomParam = urlParams.get('room');
  if (roomParam) {
    setTimeout(() => {
      window.multiplayerManager.joinRoom(roomParam);
    }, 400);
  }

  // Oyna o'lchami o'zgarganda kursor joyini to'g'rilash
  window.addEventListener('resize', updateCaretPosition);
}

// ===================================================
// 📸 MONKEYTYPE NATIJA KARTOCHKASI (SHARE CARD GENERATOR)
// ===================================================
function openShareCardModal() {
  const modal = document.getElementById('share-card-modal');
  drawShareCard();
  if (window.openAppModal) {
    window.openAppModal(modal);
  } else if (modal) {
    modal.classList.add('active');
  }
}

function drawShareCard() {
  const canvas = document.getElementById('share-card-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const d = state.lastCompletedTestReplay || {
    netWpm: 0,
    acc: 100,
    consistency: 100,
    rawWpm: 0,
    time: 30,
    correctChars: 0,
    incorrectChars: 0,
    extraChars: 0,
    missedChars: 0,
    modeValue: '30s',
    lang: 'uzbek',
    chartData: state.historyChartData
  };

  const compStyle = getComputedStyle(document.body);
  const bgColor = compStyle.getPropertyValue('--bg-color').trim() || '#323437';
  const mainColor = compStyle.getPropertyValue('--main-color').trim() || '#e2b714';
  const subColor = compStyle.getPropertyValue('--sub-color').trim() || '#646669';
  const textColor = compStyle.getPropertyValue('--text-color').trim() || '#d1d0c5';
  const subAltColor = compStyle.getPropertyValue('--sub-alt-color').trim() || '#2c2e31';

  // 1. Fon chizish
  ctx.fillStyle = bgColor;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Gradient kartochka ramkasi
  ctx.strokeStyle = subAltColor;
  ctx.lineWidth = 4;
  ctx.strokeRect(10, 10, canvas.width - 20, canvas.height - 20);

  // Nozik ichki ramka
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
  ctx.lineWidth = 1;
  ctx.strokeRect(20, 20, canvas.width - 40, canvas.height - 40);

  // 2. Sarlavha: Logo va foydalanuvchi
  ctx.fillStyle = mainColor;
  ctx.font = 'bold 30px "Roboto Mono", monospace';
  ctx.fillText('moonketayb', 45, 65);

  ctx.fillStyle = subColor;
  ctx.font = '18px "Roboto Mono", monospace';
  ctx.fillText('| typex712', 230, 65);

  // O'ng tomonda foydalanuvchi ma'lumotlari
  const username = (window.authManager && window.authManager.currentUser && window.authManager.currentUser.username) || 'Mehmon';
  const userAvatar = (window.authManager && window.authManager.currentUser && window.authManager.currentUser.avatar) || '⌨️';
  const todayStr = new Date().toLocaleDateString('uz-UZ', { day: '2-digit', month: 'short', year: 'numeric' });
  ctx.textAlign = 'right';
  ctx.fillStyle = textColor;
  ctx.font = '16px "Roboto Mono", monospace';
  ctx.fillText(`${userAvatar} ${username}`, canvas.width - 45, 58);
  ctx.fillStyle = subColor;
  ctx.font = '13px "Roboto Mono", monospace';
  ctx.fillText(todayStr, canvas.width - 45, 80);
  ctx.textAlign = 'left';

  // 3. Rejim tabletkasi (Badge)
  const modeText = `⚡ ${d.modeValue} • ${d.lang}`;
  ctx.font = 'bold 14px "Roboto Mono", monospace';
  const modeMetrics = ctx.measureText(modeText);
  const badgeWidth = modeMetrics.width + 24;
  const badgeHeight = 30;
  const badgeX = 45;
  const badgeY = 95;

  ctx.fillStyle = subAltColor;
  ctx.beginPath();
  if (ctx.roundRect) ctx.roundRect(badgeX, badgeY, badgeWidth, badgeHeight, 6);
  else ctx.rect(badgeX, badgeY, badgeWidth, badgeHeight);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
  ctx.stroke();

  ctx.fillStyle = mainColor;
  ctx.fillText(modeText, badgeX + 12, badgeY + 20);

  // 4. Asosiy statistika (WPM, Aniqlik, Barqarorlik)
  // WPM
  ctx.fillStyle = subColor;
  ctx.font = '15px "Roboto Mono", monospace';
  ctx.fillText('wpm', 45, 175);

  ctx.fillStyle = mainColor;
  ctx.font = 'bold 78px "Roboto Mono", monospace';
  ctx.fillText(String(d.netWpm), 45, 245);

  // Aniqlik (acc)
  const accX = 260;
  ctx.fillStyle = subColor;
  ctx.font = '15px "Roboto Mono", monospace';
  ctx.fillText('aniqlik', accX, 175);

  ctx.fillStyle = textColor;
  ctx.font = 'bold 54px "Roboto Mono", monospace';
  ctx.fillText(`${d.acc}%`, accX, 235);

  // Barqarorlik (consistency)
  const conX = 450;
  ctx.fillStyle = subColor;
  ctx.font = '15px "Roboto Mono", monospace';
  ctx.fillText('barqarorlik', conX, 175);

  ctx.fillStyle = textColor;
  ctx.font = 'bold 54px "Roboto Mono", monospace';
  ctx.fillText(`${d.consistency || 100}%`, conX, 235);

  // 5. Kichik detallar qatori
  ctx.fillStyle = subColor;
  ctx.font = '14px "Roboto Mono", monospace';
  const detailsY = 285;
  ctx.fillText(`sof wpm: `, 45, detailsY);
  ctx.fillStyle = textColor;
  ctx.fillText(`${d.rawWpm}`, 120, detailsY);

  ctx.fillStyle = subColor;
  ctx.fillText(`vaqt: `, 180, detailsY);
  ctx.fillStyle = textColor;
  ctx.fillText(`${d.time}s`, 230, detailsY);

  ctx.fillStyle = subColor;
  ctx.fillText(`belgilar: `, 290, detailsY);
  ctx.fillStyle = textColor;
  ctx.fillText(`${d.correctChars}/${d.incorrectChars}/${d.extraChars}/${d.missedChars}`, 375, detailsY);

  // 6. Mini WPM Chiziqli Grafiki (Pastki sohada)
  const chartData = (d.chartData && d.chartData.length > 0) ? d.chartData : [{ second: 1, wpm: d.netWpm, errors: 0 }];
  const cX = 45;
  const cY = 320;
  const cW = canvas.width - 90;
  const cH = 100;

  // Grafik foni
  ctx.fillStyle = 'rgba(0, 0, 0, 0.15)';
  ctx.beginPath();
  if (ctx.roundRect) ctx.roundRect(cX, cY, cW, cH, 8);
  else ctx.rect(cX, cY, cW, cH);
  ctx.fill();

  const maxWpm = Math.max(...chartData.map(c => c.wpm || 0), d.netWpm, 20);
  const minWpm = 0;
  const points = chartData.map((pt, idx) => {
    const x = cX + (idx / Math.max(chartData.length - 1, 1)) * cW;
    const y = cY + cH - ((pt.wpm - minWpm) / (maxWpm - minWpm || 1)) * (cH - 16) - 8;
    return { x, y, errors: pt.errors };
  });

  if (points.length > 0) {
    const grad = ctx.createLinearGradient(0, cY, 0, cY + cH);
    grad.addColorStop(0, mainColor + '40');
    grad.addColorStop(1, 'transparent');

    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    points.forEach(p => ctx.lineTo(p.x, p.y));
    ctx.lineTo(points[points.length - 1].x, cY + cH);
    ctx.lineTo(points[0].x, cY + cH);
    ctx.closePath();
    ctx.fillStyle = grad;
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    points.forEach(p => ctx.lineTo(p.x, p.y));
    ctx.strokeStyle = mainColor;
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();

    points.forEach(p => {
      if (p.errors > 0) {
        ctx.fillStyle = '#ef4444';
        ctx.beginPath();
        ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
        ctx.fill();
      }
    });
  }

  // 7. Watermark
  ctx.fillStyle = subColor;
  ctx.font = '12px "Roboto Mono", monospace';
  ctx.fillText('nurilayev712.github.io/moonketayb', 45, canvas.height - 28);
}

function downloadShareCard() {
  const canvas = document.getElementById('share-card-canvas');
  if (!canvas) return;
  const link = document.createElement('a');
  const wpm = state.lastCompletedTestReplay ? state.lastCompletedTestReplay.netWpm : 0;
  link.download = `moonketayb_${wpm}wpm_${Date.now()}.png`;
  link.href = canvas.toDataURL('image/png');
  link.click();
}

function copyShareCard() {
  const canvas = document.getElementById('share-card-canvas');
  const btn = document.getElementById('copy-share-card-btn');
  if (!canvas) return;
  try {
    canvas.toBlob((blob) => {
      if (!blob) return;
      if (navigator.clipboard && window.ClipboardItem) {
        const item = new ClipboardItem({ 'image/png': blob });
        navigator.clipboard.write([item]).then(() => {
          if (btn) {
            const orig = btn.innerHTML;
            btn.innerHTML = '✅ Nusxalandi!';
            setTimeout(() => { btn.innerHTML = orig; }, 2000);
          }
        }).catch(err => {
          console.warn('Clipboard write error:', err);
        });
      }
    });
  } catch (e) {
    console.warn(e);
  }
}

// ===================================================
// 🎬 YOZISH JARAYONINI QAYTA KO'RISH (REPLAY PLAYER)
// ===================================================
let replayState = {
  isPlaying: false,
  timer: null,
  currentMs: 0,
  totalMs: 0,
  speed: 1,
  data: null
};

function openReplayModal() {
  if (!state.lastCompletedTestReplay || !state.lastCompletedTestReplay.words) {
    alert("Hozircha qayta ko'rish uchun test natijasi mavjud emas. Avval bitta testni yakunlang.");
    return;
  }
  const modal = document.getElementById('replay-modal');
  if (window.openAppModal) {
    window.openAppModal(modal);
  } else if (modal) {
    modal.classList.add('active');
  }

  setupReplayPlayer(state.lastCompletedTestReplay);
}

function setupReplayPlayer(d) {
  replayState.data = d;
  replayState.speed = 1;
  replayState.isPlaying = false;
  if (replayState.timer) {
    clearInterval(replayState.timer);
    replayState.timer = null;
  }

  const events = d.events || [];
  replayState.totalMs = events.length > 0 ? events[events.length - 1].t : (d.time * 1000);
  replayState.currentMs = 0;

  const badge = document.getElementById('replay-info-badge');
  if (badge) badge.textContent = `${d.modeValue} (${d.lang}) • ${d.netWpm} WPM`;

  const container = document.getElementById('replay-words-container');
  if (container) {
    container.innerHTML = '';
    d.words.forEach((w, wIdx) => {
      const wordEl = document.createElement('div');
      wordEl.className = 'word' + (wIdx === 0 ? ' active' : '');
      wordEl.dataset.wordIndex = wIdx;
      for (let i = 0; i < w.length; i++) {
        const letterEl = document.createElement('span');
        letterEl.className = 'letter';
        letterEl.textContent = w[i];
        wordEl.appendChild(letterEl);
      }
      container.appendChild(wordEl);
    });
  }

  updateReplaySpeedUI();
  renderReplayAt(0);
  toggleReplayPlay(true);
}

function renderReplayAt(ms) {
  if (!replayState.data) return;
  const d = replayState.data;
  const events = d.events || [];
  const container = document.getElementById('replay-words-container');
  const caret = document.getElementById('replay-caret');
  const scrubber = document.getElementById('replay-scrubber');
  const timeEl = document.getElementById('replay-time');
  const wpmEl = document.getElementById('replay-wpm');
  const accEl = document.getElementById('replay-acc');
  const charsEl = document.getElementById('replay-chars');

  if (scrubber) {
    scrubber.value = replayState.totalMs > 0 ? Math.round((ms / replayState.totalMs) * 1000) : 0;
  }

  const secs = Math.floor(ms / 1000);
  const mins = Math.floor(secs / 60);
  const remSecs = secs % 60;
  if (timeEl) {
    timeEl.textContent = `${String(mins).padStart(2, '0')}:${String(remSecs).padStart(2, '0')}`;
  }

  let activeEvent = null;
  let eventIdx = 0;
  while (eventIdx < events.length && events[eventIdx].t <= ms) {
    activeEvent = events[eventIdx];
    eventIdx++;
  }

  if (activeEvent) {
    if (wpmEl) wpmEl.textContent = activeEvent.wpm || 0;
    const totalChars = (activeEvent.correct || 0) + (activeEvent.incorrect || 0) + (activeEvent.extra || 0);
    const acc = totalChars > 0 ? Math.round(((activeEvent.correct || 0) / totalChars) * 100) : 100;
    if (accEl) accEl.textContent = `${acc}%`;
    if (charsEl) charsEl.textContent = totalChars;
  } else {
    if (wpmEl) wpmEl.textContent = 0;
    if (accEl) accEl.textContent = '100%';
    if (charsEl) charsEl.textContent = 0;
  }

  if (!container || container.children.length === 0) return;

  const currentWordIdx = activeEvent ? activeEvent.wIdx : 0;
  const currentLetterIdx = activeEvent ? activeEvent.lIdx : 0;

  for (let w = 0; w < container.children.length; w++) {
    const wordEl = container.children[w];
    wordEl.className = 'word' + (w === currentWordIdx ? ' active' : '');
    const letters = wordEl.querySelectorAll('.letter');

    if (w < currentWordIdx) {
      letters.forEach(l => {
        l.className = 'letter correct';
      });
    } else if (w === currentWordIdx) {
      letters.forEach((l, lIdx) => {
        if (lIdx < currentLetterIdx) {
          l.className = 'letter correct';
        } else {
          l.className = 'letter';
        }
      });
    } else {
      letters.forEach(l => {
        l.className = 'letter';
      });
    }
  }

  const curWordEl = container.children[currentWordIdx];
  if (curWordEl) {
    const wordTop = curWordEl.offsetTop;
    if (wordTop > 40) {
      container.scrollTop = wordTop - 40;
    } else {
      container.scrollTop = 0;
    }

    if (caret) {
      const letters = curWordEl.querySelectorAll('.letter');
      const containerRect = container.getBoundingClientRect();
      let targetX = 0;
      let targetY = 0;

      if (currentLetterIdx < letters.length) {
        const lRect = letters[currentLetterIdx].getBoundingClientRect();
        targetX = lRect.left - containerRect.left;
        targetY = lRect.top - containerRect.top + (lRect.height - 28) / 2;
      } else if (letters.length > 0) {
        const lRect = letters[letters.length - 1].getBoundingClientRect();
        targetX = lRect.right - containerRect.left;
        targetY = lRect.top - containerRect.top + (lRect.height - 28) / 2;
      } else {
        const wRect = curWordEl.getBoundingClientRect();
        targetX = wRect.left - containerRect.left;
        targetY = wRect.top - containerRect.top;
      }

      caret.style.left = `${targetX}px`;
      caret.style.top = `${targetY}px`;
      caret.style.display = 'block';
    }
  }
}

function toggleReplayPlay(forcePlay) {
  const shouldPlay = (typeof forcePlay === 'boolean') ? forcePlay : !replayState.isPlaying;
  replayState.isPlaying = shouldPlay;

  const playIcon = document.getElementById('replay-play-icon');
  if (replayState.timer) {
    clearInterval(replayState.timer);
    replayState.timer = null;
  }

  if (shouldPlay) {
    if (playIcon) {
      playIcon.innerHTML = '<path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>';
    }
    if (replayState.currentMs >= replayState.totalMs) {
      replayState.currentMs = 0;
    }

    const intervalStep = 25;
    replayState.timer = setInterval(() => {
      replayState.currentMs += intervalStep * replayState.speed;
      if (replayState.currentMs >= replayState.totalMs) {
        replayState.currentMs = replayState.totalMs;
        renderReplayAt(replayState.currentMs);
        toggleReplayPlay(false);
      } else {
        renderReplayAt(replayState.currentMs);
      }
    }, intervalStep);
  } else {
    if (playIcon) {
      playIcon.innerHTML = '<path d="M8 5v14l11-7z"/>';
    }
  }
}

function updateReplaySpeedUI() {
  document.querySelectorAll('.replay-speed-btn').forEach(btn => {
    const sp = parseFloat(btn.dataset.speed) || 1;
    btn.classList.toggle('active', sp === replayState.speed);
  });
}

// ===================================================
// MULTIPLAYER POYGA BOSHLANISH FUNKSIYASI
// ===================================================
window.startMultiplayerGame = function(words, mode = 'time', limit = 30) {
  // Avvalgi intervallarni tozalash va holatni boshlang'ichga qaytarish
  clearInterval(state.timer);
  state.timer = null;
  state.isRunning = false;
  state.isFinished = false;
  state.isMultiplayer = true;
  state.mode = (mode === 'words' || mode === 'time') ? mode : 'time';

  const parsedLimit = parseInt(limit, 10);
  if (state.mode === 'time') {
    state.timeLimit = (!isNaN(parsedLimit) && parsedLimit > 0) ? parsedLimit : 30;
    state.timeRemaining = state.timeLimit;
  } else {
    state.wordsLimit = (!isNaN(parsedLimit) && parsedLimit > 0) ? parsedLimit : (words ? words.length : 25);
  }

  // Barcha modal overlaylarni yopish va olib tashlash
  document.querySelectorAll('.modal-overlay.active').forEach(m => m.classList.remove('active'));

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

  // Sekund nomer / taymerni ekranda aniq ko'rsatish
  elements.liveStats.classList.remove('hidden');
  elements.liveStats.style.display = 'block';
  if (state.mode === 'time') {
    elements.liveStats.textContent = state.timeRemaining;
  } else {
    elements.liveStats.textContent = `0 / ${state.wordsLimit}`;
  }

  if (elements.typingInput) {
    elements.typingInput.disabled = false;
    elements.typingInput.value = '';
    elements.typingInput.focus();
  }

  startTest();
  setTimeout(updateCaretPosition, 20);

  // Poyga boshlanganda darhol 0% holatni yangilash
  if (window.checkMultiplayerProgress) {
    window.checkMultiplayerProgress();
  }
};

// Har safar harf yozilganda progressni do'stlarga yuborish
window.checkMultiplayerProgress = function() {
  if (state.isMultiplayer && window.multiplayerManager && window.multiplayerManager.isInRace) {
    const targetWords = (state.mode === 'words')
      ? (state.wordsLimit || (state.words ? state.words.length : 25))
      : Math.max(Math.round((state.timeLimit || 30) * 1.3), 20);

    const currentWord = (state.words && state.words[state.currentWordIndex]) || '';
    const currentWordLen = Math.max(currentWord.length, 1);
    const wordProgress = state.currentWordIndex + Math.min(state.currentLetterIndex / currentWordLen, 1);
    const progress = Math.min(100, Math.max(0, Math.round((wordProgress / targetWords) * 100)));

    const liveWpm = calculateLiveWpm();

    window.multiplayerManager.sendProgress(
      progress,
      liveWpm,
      state.currentWordIndex,
      state.currentLetterIndex
    );
    window.multiplayerManager.updateTribeDelta(liveWpm);
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
    elements.resultSection.classList.remove('active');
    elements.testSection.style.display = 'flex';

    window.multiplayerManager.sendProgress(100, netWpm, state.currentWordIndex, state.currentLetterIndex);
    window.multiplayerManager.sendFinish(netWpm, accuracy);
    document.getElementById('main-config-bar').style.display = 'flex';
  }
};

// Boshlash
window.addEventListener('DOMContentLoaded', init);
