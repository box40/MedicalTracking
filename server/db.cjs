const Database = require('better-sqlite3');
const path = require('path');

const DB_PATH = path.join(__dirname, '..', 'medtrack.db');
const db = new Database(DB_PATH);

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id                  INTEGER PRIMARY KEY AUTOINCREMENT,
    email               TEXT    UNIQUE NOT NULL,
    password            TEXT    NOT NULL,
    oauth_provider      TEXT,
    oauth_id            TEXT,
    reset_token         TEXT,
    reset_token_expiry  INTEGER,
    created_at          INTEGER DEFAULT (unixepoch())
  );

  CREATE UNIQUE INDEX IF NOT EXISTS idx_oauth ON users (oauth_provider, oauth_id)
    WHERE oauth_provider IS NOT NULL AND oauth_id IS NOT NULL;

  CREATE TABLE IF NOT EXISTS user_data (
    user_id    INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    data       TEXT    NOT NULL DEFAULT '{}',
    updated_at INTEGER DEFAULT (unixepoch())
  );
`);

// Add columns to existing DBs that were created before this migration
const cols = db.pragma('table_info(users)').map(c => c.name);
if (!cols.includes('oauth_provider'))   db.exec(`ALTER TABLE users ADD COLUMN oauth_provider TEXT`);
if (!cols.includes('oauth_id'))         db.exec(`ALTER TABLE users ADD COLUMN oauth_id TEXT`);
if (!cols.includes('reset_token'))      db.exec(`ALTER TABLE users ADD COLUMN reset_token TEXT`);
if (!cols.includes('reset_token_expiry')) db.exec(`ALTER TABLE users ADD COLUMN reset_token_expiry INTEGER`);

module.exports = db;
