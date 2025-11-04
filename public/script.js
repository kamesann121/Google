// クライアント側スクリプト（最新版）
// - サーバーからのメッセージで自分が送ったものは重複表示しない
// - 検索バーの下辺からチャット欄が伸びる挙動（CSSクラス切替）
// - ニックネーム・アイコンは localStorage に保存して共有

const socket = io();

// DOM
const input = document.getElementById('search-input');
const resultArea = document.getElementById('result-area');
const fileInput = document.getElementById('icon-file-input');
const imageLabel = document.getElementById('image-label');
const userIconImg = document.getElementById('user-icon-img');
const userIconWrap = document.getElementById('user-icon-wrap');
const nicknameBtn = document.getElementById('nickname-btn');
const nicknameModal = document.getElementById('nickname-modal');
const nicknameInput = document.getElementById('nickname-input');
const nicknameSave = document.getElementById('nickname-save');
const nicknameCancel = document.getElementById('nickname-cancel');

// local state
let localNick = localStorage.getItem('aqua_nick') || '';
let localIconData = localStorage.getItem('aqua_icon') || '';
let mySocketId = null;

// 初期表示アイコン
if (localIconData) {
  userIconImg.src = localIconData;
  userIconImg.style.display = 'block';
  const fb = userIconWrap.querySelector('.fallback-icon');
  if (fb) fb.style.display = 'none';
}

// Socket.IO 接続完了で自分の socket.id を取得
socket.on('connect', () => {
  mySocketId = socket.id;
  // 初回プロフィール通知（サーバー/他クライアントへ）
  socket.emit('profile:update', { nick: localNick || null, icon: localIconData || null });
});

// モーダル操作
nicknameBtn.addEventListener('click', () => {
  nicknameInput.value = localNick;
  nicknameModal.setAttribute('aria-hidden', 'false');
  nicknameInput.focus();
});

nicknameCancel.addEventListener('click', () => {
  nicknameModal.setAttribute('aria-hidden', 'true');
});

nicknameSave.addEventListener('click', () => {
  const v = nicknameInput.value.trim();
  localNick = v || '匿名';
  localStorage.setItem('aqua_nick', localNick);
  nicknameModal.setAttribute('aria-hidden', 'true');
  socket.emit('profile:update', { nick: localNick, icon: localIconData || null });
});

// ファイル選択（画像アップデート）
imageLabel.addEventListener('click', () => {
  fileInput.click();
});

fileInput.addEventListener('change', async (e) => {
  const f = e.target.files[0];
  if (!f || !f.type.startsWith('image/')) return;

  const reader = new FileReader();
  reader.onload = () => {
    const dataUrl = reader.result;
    localIconData = dataUrl;
    localStorage.setItem('aqua_icon', dataUrl);
    userIconImg.src = dataUrl;
    userIconImg.style.display = 'block';
    const fb = userIconWrap.querySelector('.fallback-icon');
    if (fb) fb.style.display = 'none';
    socket.emit('profile:update', { nick: localNick || null, icon: dataUrl });
  };
  reader.readAsDataURL(f);
});

// チャット開閉（フォーカス管理）
let focusInsideInput = false;
input.addEventListener('focus', () => {
  focusInsideInput = true;
  openChat();
});
input.addEventListener('blur', () => {
  focusInsideInput = false;
  setTimeout(() => {
    if (!focusInsideInput) closeChat();
  }, 150);
});

function openChat() {
  resultArea.classList.add('open');
  resultArea.setAttribute('aria-hidden', 'false');
  // スクロールを最下部に
  requestAnimationFrame(() => {
    resultArea.scrollTop = resultArea.scrollHeight;
  });
}

function closeChat() {
  resultArea.classList.remove('open');
  resultArea.setAttribute('aria-hidden', 'true');
}

// 送信処理（Enter）
input.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    e.preventDefault();
    const text = input.value.trim();
    if (!text) return;

    const payload = {
      text,
      nick: localNick || '匿名',
      icon: localIconData || null,
      ts: Date.now(),
      senderId: mySocketId // 自分のIDを付与
    };

    // ローカル表示（即時）
    addMessage(payload, { local: true });

    // サーバーへ送信（サーバーは全体へ broadcast）
    socket.emit('chat:message', payload);

    input.value = '';
  }
});

// サーバーから受信したメッセージ
socket.on('chat:message', (payload) => {
  // 自分が送ったメッセージはサーバーから返ってきても既に表示済みのため無視
  if (payload && payload.senderId && mySocketId && payload.senderId === mySocketId) {
    return; // 重複表示防止
  }
  addMessage(payload, { local: false });
});

// profile:update は今は UI グローバル反映しないがログとして受け取れる
socket.on('profile:update', (data) => {
  // 将来オンライン一覧等を作るときに使う
  // console.log('profile:update', data);
});

// メッセージ追加
function addMessage({ text, nick, icon, ts, senderId } = {}, opts = {}) {
  const box = document.createElement('div');
  box.className = 'chat-message';

  const iconWrap = document.createElement('div');
  iconWrap.className = 'msg-icon';
  const img = document.createElement('img');

  if (icon) {
    img.src = icon;
  } else {
    // 空srcを避ける。デフォルト表示は CSS の背景色 / FontAwesome などで補える
    img.src = '';
    img.alt = '';
  }
  iconWrap.appendChild(img);

  const body = document.createElement('div');
  body.className = 'msg-body';

  const nameEl = document.createElement('div');
  nameEl.className = 'msg-name';
  nameEl.textContent = nick || '匿名';

  const textEl = document.createElement('div');
  textEl.className = 'msg-text';
  textEl.textContent = text || '';

  body.appendChild(nameEl);
  body.appendChild(textEl);
  box.appendChild(iconWrap);
  box.appendChild(body);

  // 新着を上に追加するか下に追加するかは要件次第。ここでは下に追加。
  resultArea.appendChild(box);

  // open 中はスクロールを最下部へ
  if (resultArea.classList.contains('open')) {
    requestAnimationFrame(() => {
      resultArea.scrollTop = resultArea.scrollHeight;
    });
  }
}
