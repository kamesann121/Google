const input = document.getElementById('search-input');
const resultArea = document.getElementById('result-area');

input.addEventListener('focus', () => {
  resultArea.style.maxHeight = '300px';
  resultArea.style.opacity = '1';
});

input.addEventListener('blur', () => {
  resultArea.style.maxHeight = '0px';
  resultArea.style.opacity = '0';
});

input.addEventListener('keydown', e => {
  if (e.key === 'Enter' && input.value.trim()) {
    const msg = document.createElement('div');
    msg.textContent = input.value;
    msg.classList.add('chat-message');
    resultArea.appendChild(msg);
    input.value = '';
  }
});
