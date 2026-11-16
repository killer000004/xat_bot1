# Talaba → Ota-ona xat yetkazish Telegram boti

Bu bot ota-onalarni Telegram orqali ro'yxatdan o'tkazadi (telefon raqami bo'yicha)
va universitet websaytidan kelgan xat (Word/PDF) fayllarni mos ota-onaga avtomatik
yetkazib beradi. Shu bilan birga oddiy FAQ bo'limi va admin uchun broadcast/statistika
buyruqlari bor.

## Qanday ishlaydi

1. Ota-ona botga `/start` bosadi va "Telefon raqamni ulashish" tugmasini bosadi.
2. Bot telefon raqamni va Telegram `chat_id`ni SQLite bazasiga saqlaydi.
3. Universitet websayti talaba uchun xat (Word/PDF) tayyor bo'lganda, botning
   ichki API serveriga HTTP so'rov yuboradi (`POST /api/send-letter`), ota-onaning
   telefon raqami va fayl manzilini ko'rsatadi.
4. Bot shu telefon raqamga mos `chat_id`ni bazadan topadi va faylni to'g'ridan-to'g'ri
   ota-onaning Telegramiga yuboradi.
5. Agar ota-ona hali botda ro'yxatdan o'tmagan bo'lsa, API xatolik qaytaradi — bu holda
   websayt masalan SMS orqali "botga start bosing" deb eslatma yuborishi mumkin.

## O'rnatish

```bash
cd telegram-parent-bot
npm install
cp .env.example .env
```

`.env` faylini oching va to'ldiring:

- `BOT_TOKEN` — [@BotFather](https://t.me/BotFather) dan olingan token
- `API_KEY` — o'zingiz o'ylab topgan uzun maxfiy kalit (masalan `openssl rand -hex 32`
  buyrug'i bilan generatsiya qiling). Websayt backend shu kalitni header sifatida
  yuboradi.
- `ADMIN_IDS` — admin bo'ladigan Telegram foydalanuvchi ID'lari (vergul bilan ajratilgan).
  O'z ID'ingizni bilish uchun [@userinfobot](https://t.me/userinfobot) ga yozing.
- `PORT` — API server porti (standart: 3000)

Ishga tushirish:

```bash
npm start
```

Bu bir vaqtning o'zida ham Telegram botni (long polling), ham HTTP API serverni
ishga tushiradi.

> **Eslatma:** `better-sqlite3` ba'zi tizimlarda kompilyatsiya qilish uchun
> `build-essential`/`python3` talab qilishi mumkin. Agar o'rnatishda xatolik
> chiqsa, shu paketlarni o'rnatib qayta urinib ko'ring.

## Websayt tomonidan chaqiriladigan API

Barcha so'rovlarda `X-API-Key` header majburiy.

### 1. Xat yuborish — `POST /api/send-letter`

**Variant A — fayl ochiq URL orqali (tavsiya etiladi):**

```bash
curl -X POST http://SIZNING_SERVER:3000/api/send-letter \
  -H "Content-Type: application/json" \
  -H "X-API-Key: SIZNING_API_KEY" \
  -d '{
    "phone": "+998901234567",
    "fileUrl": "https://sayt.uz/files/xat-12345.pdf",
    "fileName": "Ota-onaga xat.pdf",
    "caption": "Farzandingizdan yangi xat keldi 💌"
  }'
```

**Variant B — fayl ochiq internetga joylashtirilmagan bo'lsa (base64):**

```json
{
  "phone": "+998901234567",
  "fileBase64": "<faylning base64 ko'rinishi>",
  "fileName": "xat.docx",
  "caption": "Farzandingizdan xat"
}
```

**Muvaffaqiyatli javob:**

```json
{ "ok": true, "sentTo": 123456789 }
```

**Ota-ona ro'yxatdan o'tmagan bo'lsa (404):**

```json
{ "ok": false, "error": "Bu telefon raqamiga ega ota-ona botda ro'yxatdan o'tmagan", "phone": "998901234567" }
```

### 2. Telefon ro'yxatdan o'tganini tekshirish — `GET /api/check-phone/:phone`

```bash
curl http://SIZNING_SERVER:3000/api/check-phone/998901234567 \
  -H "X-API-Key: SIZNING_API_KEY"
```

```json
{ "ok": true, "registered": true, "phone": "998901234567" }
```

### Node.js (axios) misoli — websayt backendidan chaqirish

```js
const axios = require('axios');

await axios.post(
  'http://BOT_SERVER:3000/api/send-letter',
  {
    phone: parent.phone,
    fileUrl: letterPdfUrl,
    fileName: 'xat.pdf',
    caption: `${student.firstName}dan xat keldi`,
  },
  { headers: { 'X-API-Key': process.env.BOT_API_KEY } }
);
```

## Telefon raqamlarni moslashtirish

Ota-ona Telegramda kontaktini ulashganda va websayt API orqali raqam yuborganda,
raqamlar turlicha formatda bo'lishi mumkin (`+998901234567`, `998901234567`,
`901234567`, bo'shliqlar/tire bilan). `src/phone.js` fayli buларни bitta
formatga (`998901234567`) keltiradi, shuning uchun ikkala tomondan ham format
haqida qayg'urish shart emas — lekin O'zbekiston raqamlari uchun mo'ljallangan.
Agar boshqa davlat raqamlari ham bo'lsa, shu faylni moslashtiring.

## FAQ boshqarish (admin, bot ichida)

- `/addfaq Savol matni | Javob matni` — yangi savol-javob qo'shish
- `/listfaq` — barcha FAQ'larni ID bilan ko'rish
- `/delfaq <id>` — FAQ'ni o'chirish

Oddiy foydalanuvchilar "❓ Savol-javob (FAQ)" tugmasi orqali ko'radi.

## Admin buyruqlari

- `/stats` — ro'yxatdan o'tgan ota-onalar soni
- `/broadcast Xabar matni` — barcha ro'yxatdan o'tgan ota-onalarga xabar yuborish

## Loyihani kengaytirish uchun fikrlar

- Hozir API `fileUrl`ni to'g'ridan-to'g'ri Telegramga uzatadi — fayl internetdan
  ochiq yuklab olinadigan bo'lishi kerak. Agar websaytda autentifikatsiya talab
  qilinsa, `fileBase64` variantidan foydalaning yoki API serverga faylni avval
  yuklab olib, keyin yuborish logikasini qo'shing.
- Yuzlab-minglab foydalanuvchi uchun SQLite odatda yetarli (yozish tez-tez
  bo'lmasa), lekin juda yuqori yozish tezligi kerak bo'lsa PostgreSQL'ga
  o'tish mumkin — `src/db.js` shu uchun alohida qatlam qilib ajratilgan.
- Productionda botni PM2 yoki systemd orqali doimiy ishlab turishini
  ta'minlang, va HTTPS/nginx reverse proxy orqasida ishlatish tavsiya etiladi.
