const express = require('express');
const path = require('path');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http, { cors: { origin: '*' } });

app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

io.on('connection', (socket) => {
  console.log('ユーザー接続:', socket.id);

  socket.on('chat:message', (payload) => {
    // 受け取ったメッセージをそのまま全員に送る（送信者含む）
    io.emit('chat:message', payload);
  });

  socket.on('profile:update', (profile) => {
    io.emit('profile:update', { id: socket.id, ...profile });
  });

  socket.on('disconnect', () => {
    console.log('ユーザー切断:', socket.id);
  });
});

const PORT = process.env.PORT || 3000;
http.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
