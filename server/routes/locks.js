const express = require('express');
const router = express.Router();
const db = require('../db/database');

// 取得所有硬體鎖，按 ID 排序
router.get('/', (req, res) => {
  db.all('SELECT * FROM hardware_locks ORDER BY id ASC', [], (err, locks) => {
    if (err) {
      console.error('獲取硬體鎖列表錯誤:', err.message);
      return res.status(500).json({ success: false, message: '伺服器錯誤' });
    }
    
    res.json({ success: true, locks });
  });
});

// 取得單一硬體鎖
router.get('/:id', (req, res) => {
  const { id } = req.params;
  
  db.get('SELECT * FROM hardware_locks WHERE id = ?', [id], (err, lock) => {
    if (err) {
      return res.status(500).json({ success: false, message: '伺服器錯誤' });
    }
    
    if (!lock) {
      return res.status(404).json({ success: false, message: '找不到硬體鎖' });
    }
    
    res.json({ success: true, lock });
  });
});

// 新增硬體鎖
router.post('/', (req, res) => {
  const { company_lock_id, hardware_id, company, assigned_to, project_name, features, binding_info, status, remarks } = req.body;
  
  if (!company_lock_id || !hardware_id) {
    return res.status(400).json({ success: false, message: '頻威智定義編號和硬體鎖編號為必填項目' });
  }
  
  const now = new Date().toISOString();
  
  db.run(
    `INSERT INTO hardware_locks 
     (company_lock_id, hardware_id, company, assigned_to, project_name, features, binding_info, status, remarks, created_at, updated_at) 
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [company_lock_id, hardware_id, company || '', assigned_to || '', project_name || '', features || '', binding_info || '', status || '在庫', remarks || '', now, now],
    function(err) {
      if (err) {
        return res.status(500).json({ success: false, message: '伺服器錯誤' });
      }
      res.json({ success: true, id: this.lastID, message: '硬體鎖已新增' });
    }
  );
});

// 更新硬體鎖
router.put('/:id', (req, res) => {
  const { id } = req.params;
  const { company_lock_id, hardware_id, company, assigned_to, project_name, features, binding_info, status, remarks } = req.body;
  
  if (!company_lock_id || !hardware_id) {
    return res.status(400).json({ success: false, message: '頻威智定義編號和硬體鎖編號為必填項目' });
  }
  
  const now = new Date().toISOString();
  
  db.run(
    `UPDATE hardware_locks SET 
     company_lock_id = ?, hardware_id = ?, company = ?, assigned_to = ?, project_name = ?, features = ?, binding_info = ?, status = ?, remarks = ?, updated_at = ? 
     WHERE id = ?`,
    [company_lock_id, hardware_id, company || '', assigned_to || '', project_name || '', features || '', binding_info || '', status || '在庫', remarks || '', now, id],
    function(err) {
      if (err) {
        return res.status(500).json({ success: false, message: '伺服器錯誤' });
      }
      if (this.changes === 0) {
        return res.status(404).json({ success: false, message: '找不到硬體鎖' });
      }
      res.json({ success: true, message: '硬體鎖已更新' });
    }
  );
});

// 刪除硬體鎖
router.delete('/:id', (req, res) => {
  const { id } = req.params;
  
  console.log(`刪除請求：硬體鎖 ID ${id}`);
  
  db.run('DELETE FROM hardware_locks WHERE id = ?', [id], function(err) {
    if (err) {
      console.error('刪除硬體鎖時發生錯誤:', err.message);
      return res.status(500).json({ success: false, message: '伺服器錯誤' });
    }
    
    console.log(`刪除結果：影響 ${this.changes} 行`);
    
    if (this.changes === 0) {
      return res.status(404).json({ success: false, message: '找不到硬體鎖' });
    }
    
    res.json({ success: true, message: '硬體鎖已刪除' });
  });
});

module.exports = router;