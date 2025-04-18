const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');
const session = require('express-session');
const { initDatabase } = require('./db/init');
const fs = require('fs');

// 初始化資料庫
initDatabase();

const app = express();
const PORT = process.env.PORT || 3000;

// 中間件
app.use(cors({
  // 確保跨域請求可以攜帶認證資訊
  credentials: true,
  origin: true
}));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// 設置會話 - 使用內存存儲
app.use(session({
  secret: 'hardware-lock-manager-secret',
  resave: false,
  saveUninitialized: false,
  cookie: { 
    secure: process.env.NODE_ENV === 'production', // 生產環境使用 HTTPS
    maxAge: null, // 設為 null，會話將在瀏覽器關閉時過期
    httpOnly: true
  }
}));

// 靜態文件
app.use(express.static(path.join(__dirname, '../public')));

// 認證中間件
const authMiddleware = (req, res, next) => {
  if (req.session.user) {
    next();
  } else {
    res.status(401).json({ success: false, message: '請先登入' });
  }
};

// 管理員中間件
const adminMiddleware = (req, res, next) => {
  if (req.session.user && req.session.user.is_admin) {
    next();
  } else {
    res.status(403).json({ success: false, message: '需要管理員權限' });
  }
};

// 路由
const authRoutes = require('./routes/auth');
const locksRoutes = require('./routes/locks');
const usersRoutes = require('./routes/users');

app.use('/api/auth', authRoutes);
app.use('/api/locks', authMiddleware, locksRoutes);
app.use('/api/users', authMiddleware, adminMiddleware, usersRoutes);

// 啟動伺服器
app.listen(PORT, () => {
  console.log(`伺服器運行在 http://localhost:${PORT}`);
});