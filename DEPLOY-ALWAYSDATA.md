# AlwaysData'ga joylash (deploy) — qadam-baqadam

AlwaysData Node.js'ni **"sayt" (site)** sifatida ishga tushiradi: sizning kodingiz
ularning bergan IP va portida HTTP server ko'rinishida doimiy ishlab turadi.
Bizning botimiz ayni shu modelga mos: bitta `node index.js` jarayoni ham
Telegram botni (long polling), ham websayt uchun API serverni bitta process
ichida ishga tushiradi.

> Men kodga kichik o'zgartirish kiritdim: endi `src/config.js` va `index.js`
> AlwaysData bergan `PORT`/`IP` muhit o'zgaruvchilarini avtomatik o'qiydi
> (agar bo'lmasa, `.env`dagi standart qiymatlarga tushadi). Shuning uchun
> alohida sozlash shart emas.

## 1-qadam: Hisobingizga kirish va SSH

1. https://admin.alwaysdata.com/ ga kiring.
2. Chap menyudan **Remote access → SSH/SFTP** bo'limiga o'ting va SSH
   foydalanuvchi (yoki mavjud asosiy hisobingiz) parolini ko'ring/o'rnating.
3. Terminalda ulaning (hisob nomini o'zingiznikiga almashtiring):

   ```bash
   ssh SIZNING_HISOB@ssh-SIZNING_HISOB.alwaysdata.net
   ```

## 2-qadam: Kodni serverga yuklash

SSH orqali ulangandan so'ng, loyihani yuklang. Ikki yo'l bor:

**A) Git orqali (agar kodni GitHub/GitLab'ga joylagan bo'lsangiz):**

```bash
cd ~
git clone https://github.com/SIZNING_REPO/telegram-parent-bot.git
cd telegram-parent-bot
```

**B) SFTP orqali** (FileZilla yoki shunga o'xshash dastur bilan, host:
`ssh-SIZNING_HISOB.alwaysdata.net`): `telegram-parent-bot` papkasini
to'liq (`node_modules` va `data` papkalarisiz) hisobingiz `$HOME` papkasiga
ko'chiring.

## 3-qadam: Paketlarni o'rnatish va .env sozlash

SSH orqali loyiha papkasida turib:

```bash
npm install
cp .env.example .env
nano .env   # yoki vim/boshqa editor
```

`.env` faylida quyidagilarni to'ldiring:

- `BOT_TOKEN` — @BotFather'dan olingan token
- `API_KEY` — uzun maxfiy kalit (`openssl rand -hex 32` buyrug'i bilan generatsiya qilsa bo'ladi)
- `ADMIN_IDS` — Telegram admin ID'laringiz
- `PORT` va `IP` qatorlarini **qo'shmang/o'chirib qo'ying yoki e'tiborsiz qoldiring** —
  AlwaysData buларни o'zi avtomatik beradi, biz kodda shuni o'qiydigan qildik.

> **Eslatma:** `better-sqlite3` paketi ba'zan native (C++) qism bilan keladi.
> Agar `npm install` vaqtida xatolik chiqsa, xabarni menga ko'chirib yuboring —
> muqobil (pure-JS) baza yechimiga almashtirib beraman.

## 4-qadam: Saytni admin panelda yaratish

1. Admin panelda **Web → Sites** bo'limiga o'ting.
2. **Add a site** tugmasini bosing.
3. Quyidagicha to'ldiring:
   - **Type:** `Node.js`
   - **Command:** `node $HOME/telegram-parent-bot/index.js`
     (agar papka nomi yoki joylashuvi boshqacha bo'lsa, shunga moslang)
   - **Working directory:** `$HOME/telegram-parent-bot`
   - **Environment → Node.js version:** eng so'nggi LTS versiyani tanlang
     (masalan 20 yoki 22)
4. **Save** qiling.

AlwaysData sizga bepul subdomain beradi, masalan:
`https://SIZNING_HISOB.alwaysdata.net` — websayt API'ga shu manzil orqali
murojaat qiladi (masalan `https://SIZNING_HISOB.alwaysdata.net/api/send-letter`).

## 5-qadam: Ishga tushirish va tekshirish

1. O'sha sayt sahifasida **Restart** tugmasini bosing.
2. Bir necha soniyadan so'ng **Logs** bo'limini oching va quyidagi qatorlarni
   ko'rishingiz kerak:
   ```
   [bot] Telegram bot ishga tushdi.
   [api] API server ...:PORT manzilida ishlamoqda.
   ```
3. Telegram'da botingizga `/start` yozib tekshiring.
4. API ishlayotganini tekshirish:

   ```bash
   curl https://SIZNING_HISOB.alwaysdata.net/api/health \
     -H "X-API-Key: SIZNING_API_KEY"
   ```

   Javob: `{"ok":true,"status":"ishlayapti"}`

## Muammolarni bartaraf etish

| Muammo | Sabab / yechim |
|---|---|
| `npm install` xatolik beradi (`node-gyp`, `python` haqida) | SSH orqali `python3 --version` va `make --version`ni tekshiring. Agar yo'q bo'lsa, menga ayting — `better-sqlite3`siz variant tayyorlab beraman. |
| Sayt ishga tushmayapti, Logs bo'sh | `.env` fayli to'g'ri joyda (`telegram-parent-bot/.env`) ekanligini va `BOT_TOKEN`/`API_KEY` to'ldirilganini tekshiring. |
| Bot Telegram'da javob bermayapti | Logs'da xatolik bor-yo'qligini ko'ring; `BOT_TOKEN` noto'g'ri bo'lishi mumkin. |
| Website API'ga ulanolmayapti (404/timeout) | `/api/health`ni brauzerda ochib ko'ring; agar ishlamasa, sayt manzili (domain) to'g'ri sozlanganini admin panelda tekshiring. |
| Kodni yangilagandan keyin o'zgarishlar ko'rinmayapti | Admin panelda sayt sahifasiga kirib **Restart** tugmasini bosing — AlwaysData kodni o'zgartirgach avtomatik qayta ishga tushmaydi. |

## Kodni keyinchalik yangilash

```bash
ssh SIZNING_HISOB@ssh-SIZNING_HISOB.alwaysdata.net
cd ~/telegram-parent-bot
git pull            # yoki yangi fayllarni SFTP orqali almashtiring
npm install         # agar package.json o'zgargan bo'lsa
```

So'ng admin panelda **Restart** tugmasini bosishni unutmang.
