/* クライアント側の全機能：
   - 検索バークリックでチャットスライド開閉（focus/blur 管理）
   - Enterでメッセージ送信（ニックネームとアイコン付き）
   - 右上「画像」でローカルファイル選択（選択画像を即プレビューし socket 経由で共有）
   - ニックネームモーダルで名前設定（localStorage 保存し socket 共有）
   - Socket.IO でリアルタイム共有（案B）
*/

const socket = io(); // /socket.io/socket.io.js がロードされている前提

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
let localIconData = localStorage.getItem('aqua_icon') || ''; // dataURL

// 初期表示アイコン・名前
if (localIconData) {
  userIconImg.src = localIconData;
  userIconImg.style.display = 'block';
  userIconWrap.querySelector('.fallback-icon').style.display = 'none';
}
if (localNick) {
  // nothing visual to change except saved state; name used on send
}

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
  // 変更をサーバー／他クライアントに通知
  socket.emit('profile:update', { nick: localNick, icon: localIconData || null });
});

// ファイル選択（画像アップデート）
imageLabel.addEventListener('click', () => {
  fileInput.click();
});

fileInput.addEventListener('change', async (e) => {
  const f = e.target.files[0];
  if (!f) return;
  if (!f.type.startsWith('image/')) return;

  const reader = new FileReader();
  reader.onload = () => {
    const dataUrl = reader.result;
    // ローカル反映
    localIconData = dataUrl;
    localStorage.setItem('aqua_icon', dataUrl);
    userIconImg.src = dataUrl;
    userIconImg.style.display = 'block';
    userIconWrap.querySelector('.fallback-icon').style.display = 'none';
    // サーバーに送る（他クライアントと共有）
    socket.emit('profile:update', { nick: localNick || null, icon: dataUrl });
  };
  reader.readAsDataURL(f);
});

// チャット開閉挙動（フォーカスで開き、フォーカス外で閉じる）
let focusInsideInput = false;
input.addEventListener('focus', () => {
  focusInsideInput = true;
  openChat();
});
input.addEventListener('blur', () => {
  // blur は即閉じるときもあるため、短い遅延でフォーカス先を確認
  focusInsideInput = false;
  setTimeout(() => {
    if (!focusInsideInput) closeChat();
  }, 150);
});

function openChat() {
  resultArea.style.maxHeight = '400px';
  resultArea.style.opacity = '1';
}
function closeChat() {
  resultArea.style.maxHeight = '0px';
  resultArea.style.opacity = '0';
}

// Enterで送信（検索バーそのまま使用）
input.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    e.preventDefault();
    const text = input.value.trim();
    if (!text) return;
    const payload = {
      text,
      nick: localNick || '匿名',
      icon: localIconData || null,
      ts: Date.now()
    };
    // ローカル表示
    addMessage(payload);
    // サーバー経由で配信
    socket.emit('chat:message', payload);
    input.value = '';
  }
});

// 受信処理
socket.on('chat:message', (payload) => {
  // 受信したメッセージを表示
  addMessage(payload);
});

// 他ユーザーのプロフィール更新（未使用だが後で使える）
socket.on('profile:update', (data) => {
  // 今回はグローバルUIに反映しない。チャット内アイコンはメッセージ毎に付与される。
  // 保管やオンライン一覧表示を作る場合はここで反映する。
});

// メッセージ表示
function addMessage({ text, nick, icon, ts }) {
  const box = document.createElement('div');
  box.className = 'chat-message';

  const iconWrap = document.createElement('div');
  iconWrap.className = 'msg-icon';
  const img = document.createElement('img');
  if (icon) {
    img.src = icon;
  } else {
    img.src = ''; // empty — CSS fallback applies; could set a default dataURL
  }
  iconWrap.appendChild(img);

  const body = document.createElement('div');
  body.className = 'msg-body';

  const nameEl = document.createElement('div');
  nameEl.className = 'msg-name';
  nameEl.textContent = nick || '匿名';

  const textEl = document.createElement('div');
  textEl.className = 'msg-text';
  textEl.textContent = text;

  body.appendChild(nameEl);
  body.appendChild(textEl);

  box.appendChild(iconWrap);
  box.appendChild(body);

  resultArea.appendChild(box);
  // 自動スクロール（チャット開いている時）
  if (resultArea.style.maxHeight !== '0px') {
    resultArea.scrollTop = resultArea.scrollHeight;
  }
}

// 初期ロード時に自己プロフィールをサーバーに通知（他クライアントがプロフィールを追跡する想定）
window.addEventListener('load', () => {
  socket.emit('profile:update', { nick: localNick || null, icon: localIconData || null });
});
