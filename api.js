const express = require('express');
const config = require('./config');
const { normalizePhone } = require('./phone');
const { findParentByPhone, logDelivery } = require('./db');

function createApi(bot) {
  const app = express();
  app.use(express.json({ limit: '15mb' }));

  // ---------------- API key tekshiruvi ----------------
  app.use((req, res, next) => {
    const key = req.header('X-API-Key');
    if (!key || key !== config.apiKey) {
      return res.status(401).json({ ok: false, error: 'Noto\'g\'ri yoki yo\'q API-Key' });
    }
    next();
  });

  // ---------------- Health check ----------------
  app.get('/api/health', (req, res) => {
    res.json({ ok: true, status: 'ishlayapti' });
  });

  // ---------------- Telefon ro'yxatdan o'tganini tekshirish ----------------
  // GET /api/check-phone/:phone
  app.get('/api/check-phone/:phone', (req, res) => {
    const phone = normalizePhone(req.params.phone);
    const parent = phone ? findParentByPhone(phone) : null;
    res.json({ ok: true, registered: !!parent, phone });
  });

  // ---------------- Xat/fayl yuborish ----------------
  // POST /api/send-letter
  // Body variant A (fayl ochiq URL orqali, tavsiya etiladi):
  //   { "phone": "+998901234567", "fileUrl": "https://example.com/letter.pdf",
  //     "fileName": "xat.pdf", "caption": "Farzandingizdan xat keldi" }
  //
  // Body variant B (fayl ochiq internetga joylanmagan bo'lsa, base64 orqali):
  //   { "phone": "...", "fileBase64": "<base64>", "fileName": "xat.docx", "caption": "..." }
  app.post('/api/send-letter', async (req, res) => {
    const { phone: rawPhone, fileUrl, fileBase64, fileName, caption } = req.body || {};

    if (!rawPhone || (!fileUrl && !fileBase64) || !fileName) {
      return res.status(400).json({
        ok: false,
        error: 'phone, fileName va (fileUrl yoki fileBase64) majburiy maydonlar',
      });
    }

    const phone = normalizePhone(rawPhone);
    const parent = findParentByPhone(phone);

    if (!parent) {
      logDelivery({ phone, fileName, status: 'not_registered' });
      return res.status(404).json({
        ok: false,
        error: 'Bu telefon raqamiga ega ota-ona botda ro\'yxatdan o\'tmagan',
        phone,
      });
    }

    try {
      const source = fileBase64 ? Buffer.from(fileBase64, 'base64') : fileUrl;
      await bot.telegram.sendDocument(
        parent.chat_id,
        { source, filename: fileName },
        caption ? { caption } : {}
      );
      logDelivery({ phone, chatId: parent.chat_id, fileName, status: 'sent' });
      return res.json({ ok: true, sentTo: parent.chat_id });
    } catch (err) {
      logDelivery({
        phone,
        chatId: parent.chat_id,
        fileName,
        status: 'error',
        error: String(err.message || err),
      });
      return res.status(500).json({ ok: false, error: String(err.message || err) });
    }
  });

  return app;
}

module.exports = createApi;
