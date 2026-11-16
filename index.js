const config = require('./src/config');
const bot = require('./src/bot');
const createApi = require('./src/api');

async function main() {
  // Telegram botni ishga tushirish (long polling)
  await bot.launch();
  console.log('[bot] Telegram bot ishga tushdi.');

  // Websayt bilan bog'lanish uchun API serverni ishga tushirish.
  // Hosting platforma (masalan AlwaysData) bergan IP/portga tinglaymiz.
  const app = createApi(bot);
  app.listen(config.port, config.host, () => {
    console.log(`[api] API server ${config.host}:${config.port} manzilida ishlamoqda.`);
  });

  process.once('SIGINT', () => bot.stop('SIGINT'));
  process.once('SIGTERM', () => bot.stop('SIGTERM'));
}

main().catch((err) => {
  console.error('[fatal]', err);
  process.exit(1);
});
