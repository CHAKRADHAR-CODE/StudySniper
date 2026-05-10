import fs from 'fs';
import path from 'path';

const DATA_DIR = path.resolve(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR);
}

// Initialize db.json if not exists
if (!fs.existsSync(DB_FILE)) {
  fs.writeFileSync(DB_FILE, JSON.stringify({ users: {} }, null, 2));
}

export const persistenceService = {
  save(userId, collection, key, data) {
    try {
      const db = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
      if (!db.users[userId]) db.users[userId] = {};
      if (!db.users[userId][collection]) db.users[userId][collection] = {};
      
      db.users[userId][collection][key] = {
        ...data,
        local_saved_at: new Date().toISOString()
      };
      
      fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
      return true;
    } catch (err) {
      console.error("[Persistence] Local save failed:", err.message);
      return false;
    }
  },

  get(userId, collection, key) {
    try {
      const db = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
      return db.users[userId]?.[collection]?.[key] || null;
    } catch (err) {
      return null;
    }
  },

  getAll(userId, collection) {
    try {
      const db = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
      const coll = db.users[userId]?.[collection] || {};
      return Object.keys(coll).map(k => ({ id: k, ...coll[k] }));
    } catch (err) {
      return [];
    }
  },

  clear(userId, collection) {
    try {
      const db = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
      if (db.users[userId]) {
        if (collection) {
          delete db.users[userId][collection];
        } else {
          delete db.users[userId];
        }
        fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
      }
      return true;
    } catch (err) {
      return false;
    }
  }
};
