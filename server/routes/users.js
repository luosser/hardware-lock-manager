const express = require('express');
const router = express.Router();
const db = require('../db/database');

// 取得所有使用者
router.get('/', (req, res) => {
  db.all('SELECT id, username, is_admin, created_at FROM users', [], (err, users) => {
    if (err) {
      return res.status(500).json({ success: false, message: '伺服器錯誤' });
    }
    
    res.json({ success: true, users });
  });
});

// 新增使用者
router.post('/', (req, res) => {
  const { username, password, is_admin } = req.body;
  
  if (!username || !password) {
    return res.status(400).json({ success: false, message: '使用者名稱和密碼為必填項目' });
  }
  
  // 檢查使用者名稱是否已存在
  db.get('SELECT * FROM users WHERE username = ?', [username], (err, existingUser) => {
    if (err) {
      return res.status(500).json({ success: false, message: '伺服器錯誤' });
    }
    
    if (existingUser) {
      return res.status(400).json({ success: false, message: '使用者名稱已被使用' });
    }
    
    // 新增使用者
    db.run(
      'INSERT INTO users (username, password, is_admin) VALUES (?, ?, ?)',
      [username, password, is_admin ? 1 : 0],
      function(err) {
        if (err) {
          return res.status(500).json({ success: false, message: '伺服器錯誤' });
        }
        
        res.json({ success: true, id: this.lastID, message: '使用者已新增' });
      }
    );
  });
});

// 刪除使用者
router.delete('/:id', (req, res) => {
  const { id } = req.params;
  
  // 防止刪除自己的帳號
  if (parseInt(id) === req.session.user.id) {
    return res.status(400).json({ success: false, message: '無法刪除當前登入的帳號' });
  }
  
  db.run('DELETE FROM users WHERE id = ?', [id], function(err) {
    if (err) {
      return res.status(500).json({ success: false, message: '伺服器錯誤' });
    }
    
    if (this.changes === 0) {
      return res.status(404).json({ success: false, message: '找不到使用者' });
    }
    
    res.json({ success: true, message: '使用者已刪除' });
  });
});

// 更新使用者權限
router.put('/:id/admin-status', (req, res) => {
  const { id } = req.params;
  const { is_admin } = req.body;
  
  // 防止更改自己的權限
  if (parseInt(id) === req.session.user.id) {
    return res.status(400).json({ success: false, message: '無法更改當前登入帳號的權限' });
  }
  
  db.run('UPDATE users SET is_admin = ? WHERE id = ?', [is_admin ? 1 : 0, id], function(err) {
    if (err) {
      return res.status(500).json({ success: false, message: '伺服器錯誤' });
    }
    
    if (this.changes === 0) {
      return res.status(404).json({ success: false, message: '找不到使用者' });
    }
    
    res.json({ success: true, message: '使用者權限已更新' });
  });
});

// 重設使用者密碼
router.put('/:id/reset-password', (req, res) => {
  const { id } = req.params;
  const { new_password } = req.body;
  
  if (!new_password) {
    return res.status(400).json({ success: false, message: '新密碼為必填項目' });
  }
  
  db.run('UPDATE users SET password = ? WHERE id = ?', [new_password, id], function(err) {
    if (err) {
      return res.status(500).json({ success: false, message: '伺服器錯誤' });
    }
    
    if (this.changes === 0) {
      return res.status(404).json({ success: false, message: '找不到使用者' });
    }
    
    res.json({ success: true, message: '使用者密碼已重設' });
  });
});

module.exports = router;