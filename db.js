const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');
const config = require('./config');

const dir = path.dirname(config.dbFile);
if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

const db = new Database(config.dbFile);
db.pragma('journal_mode = WAL');

db.exec(`
CREATE TABLE IF NOT EXISTS parents (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  phone TEXT UNIQUE NOT NULL,
  chat_id INTEGER NOT NULL,
  full_name TEXT,
  username TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS faq (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS delivery_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  phone TEXT NOT NULL,
  chat_id INTEGER,
  file_name TEXT,
  status TEXT NOT NULL,       -- 'sent' | 'not_registered' | 'error'
  error TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);
`);

// ---------- Parents ----------

function upsertParent({ phone, chatId, fullName, username }) {
  const existing = db.prepare('SELECT * FROM parents WHERE phone = ?').get(phone);
  if (existing) {
    db.prepare(
      'UPDATE parents SET chat_id = ?, full_name = ?, username = ? WHERE phone = ?'
    ).run(chatId, fullName || existing.full_name, username || existing.username, phone);
  } else {
    db.prepare(
      'INSERT INTO parents (phone, chat_id, full_name, username) VALUES (?, ?, ?, ?)'
    ).run(phone, chatId, fullName || null, username || null);
  }
  return db.prepare('SELECT * FROM parents WHERE phone = ?').get(phone);
}

function findParentByPhone(phone) {
  return db.prepare('SELECT * FROM parents WHERE phone = ?').get(phone);
}

function countParents() {
  return db.prepare('SELECT COUNT(*) AS c FROM parents').get().c;
}

function allParentChatIds() {
  return db.prepare('SELECT chat_id FROM parents').all().map((r) => r.chat_id);
}

// ---------- FAQ ----------

function addFaq(question, answer) {
  return db.prepare('INSERT INTO faq (question, answer) VALUES (?, ?)').run(question, answer);
}

function listFaq() {
  return db.prepare('SELECT * FROM faq ORDER BY id ASC').all();
}

function deleteFaq(id) {
  return db.prepare('DELETE FROM faq WHERE id = ?').run(id);
}

// ---------- Delivery log ----------

function logDelivery({ phone, chatId, fileName, status, error }) {
  db.prepare(
    'INSERT INTO delivery_log (phone, chat_id, file_name, status, error) VALUES (?, ?, ?, ?, ?)'
  ).run(phone, chatId || null, fileName || null, status, error || null);
}

module.exports = {
  db,
  upsertParent,
  findParentByPhone,
  countParents,
  allParentChatIds,
  addFaq,
  listFaq,
  deleteFaq,
  logDelivery,
};
