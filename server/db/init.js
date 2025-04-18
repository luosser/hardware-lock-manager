const db = require('./database');

// 初始化資料庫
function initDatabase() {
  // 啟用外鍵約束
  db.run('PRAGMA foreign_keys = ON');

  // 創建使用者表
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      is_admin INTEGER DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // 修改硬體鎖表結構，添加排序欄位
  db.run(`
    CREATE TABLE IF NOT EXISTS hardware_locks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      company_lock_id TEXT NOT NULL,  /* 頻威智定義的硬體鎖編號 */
      hardware_id TEXT NOT NULL,      /* 硬體鎖本身的編號 */
      project_name TEXT,              /* 用於哪個專案軟體 */
      assigned_to TEXT,               /* 借用給誰/賣給哪間公司 */
      department TEXT,                /* 哪個部門 */
      status TEXT DEFAULT '在庫',      /* 狀態: 在庫, 借出, 已售出 */
      features TEXT,                  /* 特徵: 硬體鎖的特殊設置或功能描述 */
      remarks TEXT,                   /* 備註 */
      sort_order INTEGER DEFAULT 0,   /* 排序順序 */
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // 直接嘗試添加 sort_order 欄位，如果已存在會報錯但不影響程式運行
  console.log('嘗試添加 sort_order 欄位 (如已存在可能會報錯)');
  db.run("ALTER TABLE hardware_locks ADD COLUMN sort_order INTEGER DEFAULT 0", err => {
    // 忽略欄位已存在的錯誤
    if (err) {
      if (err.message && err.message.includes('duplicate') || err.message.includes('exists')) {
        console.log('sort_order 欄位已存在，跳過添加');
      } else {
        console.error('添加 sort_order 欄位時發生其他錯誤:', err.message);
      }
    } else {
      console.log('成功添加 sort_order 欄位到 hardware_locks 表');
    }
    
    // 無論欄位是否添加成功，都初始化排序順序
    db.run("UPDATE hardware_locks SET sort_order = id WHERE sort_order IS NULL OR sort_order = 0", err => {
      if (err) {
        console.error('初始化排序順序錯誤:', err.message);
      } else {
        console.log('成功初始化排序順序');
      }
    });
  });

  // 檢查並添加新欄位 company 和 binding_info
  db.get("PRAGMA table_info(hardware_locks)", [], (err, rows) => {
    if (err) {
      console.error('檢查表結構錯誤:', err.message);
      return;
    }
    
    let hasCompany = false;
    let hasBindingInfo = false;
    
    rows.forEach(row => {
      if (row.name === 'company') hasCompany = true;
      if (row.name === 'binding_info') hasBindingInfo = true;
    });
    
    if (!hasCompany) {
      db.run("ALTER TABLE hardware_locks ADD COLUMN company TEXT", err => {
        if (err) {
          console.error('添加 company 欄位錯誤:', err.message);
        } else {
          console.log('成功添加 company 欄位到 hardware_locks 表');
        }
      });
    }
    
    if (!hasBindingInfo) {
      db.run("ALTER TABLE hardware_locks ADD COLUMN binding_info TEXT", err => {
        if (err) {
          console.error('添加 binding_info 欄位錯誤:', err.message);
        } else {
          console.log('成功添加 binding_info 欄位到 hardware_locks 表');
        }
      });
    }
  });

  // 插入預設使用者
  db.get('SELECT * FROM users WHERE username = ?', ['admin'], (err, row) => {
    if (err) {
      console.error('查詢使用者錯誤:', err.message);
    } else if (!row) {
      // 插入管理員
      db.run('INSERT INTO users (username, password, is_admin) VALUES (?, ?, ?)', ['admin', 'admin94163646', 1]);
      // 插入一般使用者
      db.run('INSERT INTO users (username, password, is_admin) VALUES (?, ?, ?)', ['user1', 'user1', 0]);
      console.log('預設使用者已創建');
    }
  });
}

module.exports = { initDatabase };