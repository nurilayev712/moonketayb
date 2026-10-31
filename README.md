# ⌨️ MoonKeyType — Tez Yozish (Typing Speed) Testi Sayti

**MoonKeyType** — mashhur MonkeyType uslubida yaratilgan, minimalist, tezkor va zamonaviy tez yozish testi platformasi. Sayt foydalanuvchining klaviaturada yozish tezligini (WPM), aniqligini va xatolarini real vaqt rejimida o'lchaydi.

---

## 🚀 Asosiy Xususiyatlar va Imkoniyatlar

### 1. Yozish Tajribasi va Ko'rinish
- **Avtomatik boshlanish:** Foydalanuvchi birinchi harfni bosishi bilan taymer o'z-o'zidan ishga tushadi.
- **Silliq kursor (Smooth Caret):** Yozilayotgan harf ustida silliq harakatlanuvchi kursor.
- **Fokus rejimi (Focus Mode):** Yozish boshlanganda sarlavha va panellar xiralashadi, butun e'tibor matnga qaratiladi.
- **Jonli harflar vizualizatsiyasi:** 
  - To'g'ri harflar — yorqin rangda
  - Xato harflar — qizil rangda va tagiga chizilgan
  - Ortiqcha kiritilgan harflar — alohida xato rangda
  - Joriy so'z osti chiziq bilan ajratib ko'rsatiladi.
- **Avtomatik qator aylanishi:** 3 qatorli qulay ko'rinish va yozgan sari yangi qatorlarga silliq o'tish.

### 2. Vaqt va Rejimlar
- **Vaqt rejimi:** `15s`, `30s`, `60s`, `120s`
- **So'zlar soni rejimi:** `10`, `25`, `50`, `100` ta so'z
- Vaqt yoki so'zlar tugashi bilan test avtomatik to'xtaydi va natijalar ekrani ochiladi.

### 3. Natijalar Ekrani (Result Screen)
- **Net WPM:** Daqiqadagi toza so'zlar soni (katta raqamlar bilan).
- **Aniqlik (Accuracy):** Foizda hisoblangan yozish aniqligi.
- **Xom tezlik (Raw WPM):** Barcha bosilgan belgilar bo'yicha tezlik.
- **Belgilar statistikasi:** `To'g'ri / Xato / Ortiqcha / O'tkazib yuborilgan` harflar.
- **Chiziqli Grafik (Line Chart):** Test davomida WPM ning soniyalar bo'yicha o'zgarishi va xatolar sodir bo'lgan nuqtalar grafigi.
- **Qayta urinish & Yangi test** tugmalari.

### 4. Sozlamalar va Mavzular
- **Ko'p tilli lug'at:**
  - 🇺🇿 O'zbek tili (kengaytirilgan so'zlar to'plami)
  - 🇬🇧 Ingliz tili (English)
  - 🇷🇺 Rus tili (Русский)
- **Tinish belgilari (Punctuation):** Vergul, nuqta, so'roq va bosh harflarni qo'shish/o'chirish.
- **Raqamlar (Numbers):** Matn orasiga raqamlarni aralashtirish.
- **Rang Mavzulari (Themes):**
  - 🟡 *Serika Dark* (klassik oltin/kulrang)
  - 🟠 *Carbon* (qora/to'q sariq)
  - 🟣 *Dracula* (to'q binafsha/pushti)
  - 🔵 *Nord* (muzdek moviy/kulrang)
  - 🟢 *Cyberpunk* (neon neon yashil/binafsha)
- **Mexanik klaviatura tovushi:** Web Audio API orqali sintezlangan haqiqiy mexanik klaviatura "thock/click" tovushlari (audio fayl yuklamaydi, 0ms kechikish).

### 5. Saqlash va Tarix (LocalStorage)
- Oxirgi testlar tarixi (sana, WPM, aniqlik, rejim).
- Shaxsiy rekord (eng yuqori WPM) footerda va statistikada saqlanadi.
- Barcha tanlangan sozlamalar brauzerda eslab qolinadi.

### 6. Klaviaturadan Boshqarish (Hotkeys)
- `Tab` yoki `Tab` + `Enter` — testni tezda qayta boshlash.
- `Esc` — testni to'xtatish / qayta yuklash.
- `Space` — keyingi so'zga o'tish.
- `Backspace` — orqaga o'chirish (hatto oldingi so'zdagi xatoga qaytish imkoniyati bilan).

---

## 📂 Fayllar Strukturasi

```
moonketayb/
├── index.html     # Asosiy sahifa va modal oynalar
├── style.css      # MonkeyType uslubi, animatsiyalar va mavzular
├── words.js       # O'zbek, ingliz va rus tillari uchun so'zlar
├── sound.js       # Web Audio API klaviatura ovozlari sintezatori
├── app.js         # Asosiy o'yin logikasi, WPM hisobi, grafik va hodisalar
└── README.md      # Loyiha qo'llanmasi
```

---

## 💻 Qanday Ishga Tushiriladi?

Hech qanday qo'shimcha kutubxona o'rnatish shart emas!

1. Papkadagi `index.html` faylini istalgan brauzerda (Chrome, Edge, Firefox, Safari) oching.
2. Yoki mahalliy server orqali ochish uchun terminalda:
   ```bash
   npx serve .
   # yoki
   python -m http.server 8000
   ```
3. Klaviaturada yozishni boshlang va yozish tezligingizni sinab ko'ring!
