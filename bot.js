const { Telegraf, Markup } = require('telegraf');
const config = require('./config');
const { normalizePhone } = require('./phone');
const {
  upsertParent,
  findParentByPhone,
  countParents,
  allParentChatIds,
  addFaq,
  listFaq,
  deleteFaq,
} = require('./db');

const bot = new Telegraf(config.botToken);

function isAdmin(ctx) {
  return config.adminIds.includes(ctx.from.id);
}

const contactKeyboard = Markup.keyboard([
  [Markup.button.contactRequest("📱 Telefon raqamni ulashish")],
]).resize();

const mainMenu = Markup.keyboard([
  ["❓ Savol-javob (FAQ)"],
  ["ℹ️ Mening ma'lumotlarim"],
]).resize();

// ---------------- /start ----------------
bot.start(async (ctx) => {
  await ctx.reply(
    "Assalomu alaykum! 👋\n\n" +
      "Bu bot orqali farzandingizning universitetdan yuboradigan xatlarini " +
      "(hujjat shaklida) shu yerda qabul qilasiz.\n\n" +
      "Davom etish uchun telefon raqamingizni ulashing. Bu raqam universitet " +
      "tizimida kiritilgan raqam bilan bir xil bo'lishi kerak.",
    contactKeyboard
  );
});

// ---------------- Kontakt qabul qilish ----------------
bot.on('contact', async (ctx) => {
  const contact = ctx.message.contact;

  // Faqat foydalanuvchining o'z raqamini qabul qilamiz, boshqa birovning
  // kontaktini forward qilib yubormasligi uchun.
  if (contact.user_id && contact.user_id !== ctx.from.id) {
    await ctx.reply(
      "Iltimos, faqat o'zingizning shaxsiy telefon raqamingizni ulashing (pastdagi tugma orqali)."
    );
    return;
  }

  const phone = normalizePhone(contact.phone_number);
  if (!phone) {
    await ctx.reply("Telefon raqamni o'qib bo'lmadi, qaytadan urinib ko'ring.");
    return;
  }

  const fullName = [ctx.from.first_name, ctx.from.last_name].filter(Boolean).join(' ');
  upsertParent({
    phone,
    chatId: ctx.chat.id,
    fullName,
    username: ctx.from.username || null,
  });

  await ctx.reply(
    "✅ Raqamingiz muvaffaqiyatli saqlandi!\n\n" +
      "Endi farzandingizning universitetdan yuborgan xatlari shu botga avtomatik tarzda keladi.",
    mainMenu
  );
});

// ---------------- Mening ma'lumotlarim ----------------
bot.hears("ℹ️ Mening ma'lumotlarim", async (ctx) => {
  const parent = require('./db').db
    .prepare('SELECT * FROM parents WHERE chat_id = ?')
    .get(ctx.chat.id);

  if (!parent) {
    await ctx.reply(
      "Siz hali ro'yxatdan o'tmagansiz. /start buyrug'ini bosing va telefon raqamingizni ulashing.",
      contactKeyboard
    );
    return;
  }

  await ctx.reply(
    `📋 Sizning ma'lumotlaringiz:\n\n` +
      `Telefon: +${parent.phone}\n` +
      `Ism: ${parent.full_name || '-'}\n` +
      `Ro'yxatdan o'tgan sana: ${parent.created_at}`
  );
});

// ---------------- FAQ ----------------
bot.hears("❓ Savol-javob (FAQ)", async (ctx) => {
  const items = listFaq();
  if (items.length === 0) {
    await ctx.reply("Hozircha FAQ bo'limi bo'sh.");
    return;
  }
  const buttons = items.map((f) => [Markup.button.callback(f.question, `faq_${f.id}`)]);
  await ctx.reply("Qaysi savol sizni qiziqtiradi?", Markup.inlineKeyboard(buttons));
});

bot.action(/^faq_(\d+)$/, async (ctx) => {
  const id = Number(ctx.match[1]);
  const item = listFaq().find((f) => f.id === id);
  await ctx.answerCbQuery();
  if (!item) {
    await ctx.reply("Bu savol topilmadi, ehtimol o'chirilgan.");
    return;
  }
  await ctx.reply(`❓ ${item.question}\n\n✅ ${item.answer}`);
});

// ---------------- Admin: FAQ boshqarish ----------------
// Format: /addfaq Savol matni | Javob matni
bot.command('addfaq', async (ctx) => {
  if (!isAdmin(ctx)) return ctx.reply("Bu buyruq faqat adminlar uchun.");
  const text = ctx.message.text.replace('/addfaq', '').trim();
  const [question, answer] = text.split('|').map((s) => s && s.trim());
  if (!question || !answer) {
    await ctx.reply("To'g'ri format: /addfaq Savol matni | Javob matni");
    return;
  }
  addFaq(question, answer);
  await ctx.reply(`✅ FAQ qo'shildi:\n❓ ${question}\n✅ ${answer}`);
});

bot.command('listfaq', async (ctx) => {
  if (!isAdmin(ctx)) return ctx.reply("Bu buyruq faqat adminlar uchun.");
  const items = listFaq();
  if (items.length === 0) return ctx.reply("FAQ bo'sh.");
  const text = items.map((f) => `#${f.id} — ${f.question}`).join('\n');
  await ctx.reply(text);
});

bot.command('delfaq', async (ctx) => {
  if (!isAdmin(ctx)) return ctx.reply("Bu buyruq faqat adminlar uchun.");
  const id = Number(ctx.message.text.replace('/delfaq', '').trim());
  if (!id) return ctx.reply("To'g'ri format: /delfaq <id>  (masalan: /delfaq 3)");
  deleteFaq(id);
  await ctx.reply(`🗑 #${id} o'chirildi.`);
});

// ---------------- Admin: statistika va broadcast ----------------
bot.command('stats', async (ctx) => {
  if (!isAdmin(ctx)) return ctx.reply("Bu buyruq faqat adminlar uchun.");
  await ctx.reply(`👨‍👩‍👧 Ro'yxatdan o'tgan ota-onalar soni: ${countParents()}`);
});

// Format: /broadcast Xabar matni
bot.command('broadcast', async (ctx) => {
  if (!isAdmin(ctx)) return ctx.reply("Bu buyruq faqat adminlar uchun.");
  const text = ctx.message.text.replace('/broadcast', '').trim();
  if (!text) return ctx.reply("To'g'ri format: /broadcast Xabar matni");

  const chatIds = allParentChatIds();
  await ctx.reply(`⏳ ${chatIds.length} kishiga xabar yuborilmoqda...`);

  let sent = 0;
  let failed = 0;
  for (const chatId of chatIds) {
    try {
      await bot.telegram.sendMessage(chatId, text);
      sent++;
    } catch (e) {
      failed++;
    }
    // Telegram rate-limit'ga tegmaslik uchun kichik pauza
    await new Promise((r) => setTimeout(r, 50));
  }

  await ctx.reply(`✅ Yuborildi: ${sent}\n❌ Xato: ${failed}`);
});

bot.command('help', async (ctx) => {
  const base =
    "/start — ro'yxatdan o'tish\n" +
    "❓ Savol-javob — FAQ bo'limi\n" +
    "ℹ️ Mening ma'lumotlarim — ro'yxatdan o'tgan ma'lumotlarni ko'rish";
  const adminPart = isAdmin(ctx)
    ? "\n\n--- Admin buyruqlari ---\n" +
      "/addfaq Savol | Javob\n" +
      "/listfaq\n" +
      "/delfaq <id>\n" +
      "/broadcast Xabar matni\n" +
      "/stats"
    : "";
  await ctx.reply(base + adminPart);
});

// ---------------- Boshqa matnlar ----------------
bot.on('text', async (ctx) => {
  await ctx.reply(
    "Buyruqni tushunmadim. Yordam uchun /help yozing yoki pastdagi menyudan foydalaning.",
    mainMenu
  );
});

bot.catch((err, ctx) => {
  console.error(`[bot] Xatolik (update ${ctx.updateType}):`, err);
});

module.exports = bot;
