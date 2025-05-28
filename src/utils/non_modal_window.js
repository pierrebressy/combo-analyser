export function createNonModalWindow({ title = 'Quick View', content = 'hello' }) {
  if (document.querySelector('.non-modal-window')) return;

  const div = document.createElement('div');
  div.className = 'non-modal-window';

  div.innerHTML = `
    <div class="header">
      <span class="title">${title}</span>
      <button class="close-button">✖</button>
    </div>
    <div class="content">${content}</div>
  `;

  document.body.appendChild(div);

  // Close logic
  div.querySelector('.close-button')?.addEventListener('click', () => {
    div.remove();
  });

  // Drag logic
  const header = div.querySelector('.header');
  let isDragging = false;
  let offsetX = 0, offsetY = 0;

  header.addEventListener('mousedown', (e) => {
    if (e.target.classList.contains('close-button')) return; // Don't drag when clicking "X"
    isDragging = true;
    const rect = div.getBoundingClientRect();
    offsetX = e.clientX - rect.left;
    offsetY = e.clientY - rect.top;
    document.body.style.userSelect = 'none';
  });

  document.addEventListener('mousemove', (e) => {
    if (isDragging) {
      div.style.left = `${e.clientX - offsetX}px`;
      div.style.top = `${e.clientY - offsetY}px`;
    }
  });

  document.addEventListener('mouseup', () => {
    isDragging = false;
    document.body.style.userSelect = '';
  });
}

