require('dotenv').config();
const path = require('path');

function requireEnv(name, fallback) {
  const val = process.env[name] ?? fallback;
  if (val === undefined) {
    console.error(`[config] Majburiy .env qiymati topilmadi: ${name}`);
    process.exit(1);
  }
  return val;
}

// Hosting platformalar (masalan AlwaysData) Node.js sayt uchun tinglash
// kerak bo'lgan IP va portni o'zi process.env.PORT / process.env.IP orqali
// beradi. Bu qiymatlar bo'lsa, ularga ustunlik beramiz; bo'lmasa .env yoki
// standart qiymatlardan foydalanamiz (lokal/VPS uchun).
const config = {
  botToken: requireEnv('BOT_TOKEN'),
  apiKey: requireEnv('API_KEY'),
  port: Number(process.env.PORT || process.env.ALWAYSDATA_HTTPD_PORT || 3000),
  host: process.env.IP || process.env.ALWAYSDATA_HTTPD_IP || '0.0.0.0',
  adminIds: (process.env.ADMIN_IDS || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .map(Number),
  dbFile: process.env.DB_FILE || path.join(__dirname, '..', 'data', 'bot.sqlite'),
};

module.exports = config;
