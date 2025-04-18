const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const dbPath = path.join(__dirname, 'hwlock.db');

// 創建資料庫連接
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('無法連接到資料庫', err.message);
  } else {
    console.log('已連接到 SQLite 資料庫');
  }
});

module.exports = db;