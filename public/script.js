const socket = io();

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

let localNick = localStorage.getItem('aqua_nick') || '';
let localIconData = localStorage.getItem('aqua_icon') || '';

if (localIconData) {
  userIconImg.src = localIconData;
  userIconImg.style.display = 'block';
  userIconWrap.querySelector('.fallback-icon').style.display = 'none';
}

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
    userIconWrap.querySelector('.fallback-icon').style.display = 'none';
    socket.emit('profile:update', { nick: localNick || null, icon: dataUrl });
  };
  reader.readAsDataURL(f);
});

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
  resultArea.style.height = '300px';
  resultArea.style.opacity = '1';
  resultArea.style.overflow = 'auto';
}

function closeChat() {
  resultArea.style.height = '0px';
  resultArea.style.opacity = '0';
  resultArea.style.overflow = 'hidden';
}

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

    addMessage(payload);
    socket.emit('chat:message', payload);
