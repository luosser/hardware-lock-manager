const express = require('express');
const router = express.Router();
const db = require('../db/database');

// 登入
router.post('/login', (req, res) => {
  const { username, password } = req.body;
  
  db.get('SELECT * FROM users WHERE username = ? AND password = ?', [username, password], (err, user) => {
    if (err) {
      return res.status(500).json({ success: false, message: '伺服器錯誤' });
    }
    
    if (!user) {
      return res.status(401).json({ success: false, message: '使用者名稱或密碼錯誤' });
    }
    
    // 儲存使用者資訊到會話（不含密碼）
    req.session.user = {
      id: user.id,
      username: user.username,
      is_admin: user.is_admin
    };
    
    res.json({
      success: true, 
      user: { 
        id: user.id, 
        username: user.username, 
        is_admin: user.is_admin 
      }
    });
  });
});

// 登出
router.post('/logout', (req, res) => {
  req.session.destroy();
  res.json({ success: true });
});

// 取得當前使用者資訊
router.get('/current-user', (req, res) => {
  if (req.session.user) {
    res.json({ success: true, user: req.session.user });
  } else {
    res.json({ success: false, user: null });
  }
});

// 變更密碼
router.post('/change-password', (req, res) => {
  if (!req.session.user) {
    return res.status(401).json({ success: false, message: '請先登入' });
  }
  
  const { currentPassword, newPassword } = req.body;
  const userId = req.session.user.id;
  
  db.get('SELECT * FROM users WHERE id = ?', [userId], (err, user) => {
    if (err) {
      return res.status(500).json({ success: false, message: '伺服器錯誤' });
    }
    
    if (!user || user.password !== currentPassword) {
      return res.status(400).json({ success: false, message: '目前密碼錯誤' });
    }
    
    db.run('UPDATE users SET password = ? WHERE id = ?', [newPassword, userId], function(err) {
      if (err) {
        return res.status(500).json({ success: false, message: '伺服器錯誤' });
      }
      
      res.json({ success: true, message: '密碼已更新' });
    });
  });
});

module.exports = router;