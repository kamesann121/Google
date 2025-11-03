const express = require('express');
const app = express();
const path = require('path');

// publicフォルダを静的配信
app.use(express.static(path.join(__dirname, 'public')));

// ルートアクセスでindex.htmlを返す
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ポート設定（Render用）
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🌈 サーバー起動中 → http://localhost:${PORT}`);
});
