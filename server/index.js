require('dotenv').config();
const express = require('express');
const cors = require('cors');
const connectDB = require('./src/config/db');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// MongoDB 연결 — MONGODB_ATLAS 우선, 실패 시 MONGODB_URI (src/config/db.js)
connectDB();

// 기본 라우트
app.get('/', (req, res) => {
  res.json({ message: 'Jambro Contents Mall API', status: 'ok' });
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API 라우트
const apiRoutes = require('./src/routes');
app.use('/api', apiRoutes);

const server = app.listen(PORT, () => {
  console.log(`서버 실행 중: http://localhost:${PORT}`);
});

// Ctrl+C 시 안전 종료 (Windows 터미널 대응)
process.on('SIGINT', () => {
  console.log('\n서버 종료 중...');
  server.close(() => {
    process.exit(0);
  });
});
