const menuToggle = document.querySelector('.menu-toggle');
const mainNav = document.querySelector('.main-nav');

menuToggle.addEventListener('click', () => {
  const isOpen = menuToggle.getAttribute('aria-expanded') === 'true';
  menuToggle.setAttribute('aria-expanded', String(!isOpen));
  menuToggle.setAttribute('aria-label', isOpen ? 'Abrir menu' : 'Fechar menu');
  mainNav.classList.toggle('is-open', !isOpen);
});

mainNav.querySelectorAll('a').forEach((link) => {
  link.addEventListener('click', () => {
    menuToggle.setAttribute('aria-expanded', 'false');
    menuToggle.setAttribute('aria-label', 'Abrir menu');
    mainNav.classList.remove('is-open');
  });
});

// Permite fechar o menu móvel pelo teclado e devolve o foco ao botão.
document.addEventListener('keydown', (event) => {
  if (event.key !== 'Escape' || menuToggle.getAttribute('aria-expanded') !== 'true') return;
  menuToggle.setAttribute('aria-expanded', 'false');
  menuToggle.setAttribute('aria-label', 'Abrir menu');
  mainNav.classList.remove('is-open');
  menuToggle.focus();
});

document.querySelector('#vote-form').addEventListener('submit', (event) => {
  event.preventDefault();
  const candidate = document.querySelector('#vote-candidate').value;
  const feedback = document.querySelector('#vote-feedback');
  if (!candidate) return;
  feedback.textContent = `Voto demonstrativo registrado para ${candidate.split(' — ')[0]}.`;
  feedback.classList.add('vote-success');
});

document.querySelector('#admin-button').addEventListener('click', () => {
  window.alert('Painel demonstrativo: esta área não salva alterações e não possui autenticação.');
});
