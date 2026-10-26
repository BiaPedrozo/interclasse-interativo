const menuToggle = document.querySelector('.menu-toggle');
const mainNav = document.querySelector('.main-nav');
const NEWS_STORAGE_KEY = 'interclasse-demo-news-v1';
const PHOTO_DB_NAME = 'interclasse-demo-gallery';
const PHOTO_STORE_NAME = 'photos';
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

const starterNews = [
  {
    id: 'demo-1',
    title: 'Está chegando a hora: confira a programação da semana',
    date: '2026-06-10',
    content: 'Organize a torcida e acompanhe os horários da rodada de abertura do nosso campeonato demonstrativo.',
    important: true,
    demo: true,
  },
  {
    id: 'demo-2',
    title: 'Vote no destaque do campeonato',
    date: '2026-06-08',
    content: 'Votação fictícia para celebrar quem brilha dentro e fora de quadra.',
    important: false,
    demo: true,
  },
  {
    id: 'demo-3',
    title: 'Espírito esportivo em primeiro lugar',
    date: '2026-06-07',
    content: 'Respeito, parceria e diversão também fazem parte do placar.',
    important: false,
    demo: true,
  },
];

function setFeedback(element, message, state = '') {
  element.textContent = message;
  element.classList.toggle('is-error', state === 'error');
  element.classList.toggle('is-success', state === 'success');
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[character]);
}

function formatDate(dateString) {
  const date = new Date(`${dateString}T12:00:00`);
  return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' }).format(date);
}

function readNews() {
  try {
    const stored = localStorage.getItem(NEWS_STORAGE_KEY);
    if (stored === null) {
      localStorage.setItem(NEWS_STORAGE_KEY, JSON.stringify(starterNews));
      return [...starterNews];
    }
    const news = JSON.parse(stored);
    return Array.isArray(news) ? news : [...starterNews];
  } catch (error) {
    console.warn('Não foi possível ler as notícias locais.', error);
    return [...starterNews];
  }
}

let newsItems = readNews();
const newsList = document.querySelector('#news-list');
const newsEmpty = document.querySelector('#news-empty');

function persistNews() {
  try {
    localStorage.setItem(NEWS_STORAGE_KEY, JSON.stringify(newsItems));
    return true;
  } catch (error) {
    console.warn('Não foi possível salvar as notícias locais.', error);
    return false;
  }
}

function renderNews() {
  newsList.innerHTML = newsItems.map((item) => {
    const title = escapeHtml(item.title);
    const content = escapeHtml(item.content);
    const date = escapeHtml(item.date);
    const id = escapeHtml(item.id);
    const category = item.demo ? '<span class="news-meta">NOTÍCIA DE DEMONSTRAÇÃO</span>' : '<span class="news-meta">NOTÍCIA LOCAL</span>';
    const important = item.important ? '<span class="important-tag">COMUNICADO IMPORTANTE</span>' : '';
    return `<article class="news-card news-managed-card${item.important ? ' is-important' : ''}">
      ${category}<h3>${title}</h3><time datetime="${date}">${escapeHtml(formatDate(item.date))}</time>
      ${important}<p>${content}</p>
      <div class="news-card-actions"><button class="remove-button" type="button" data-remove-news="${id}" aria-label="Remover notícia: ${title}">Remover notícia</button></div>
    </article>`;
  }).join('');
  newsEmpty.hidden = newsItems.length > 0;
  document.querySelector('#news-count').textContent = String(newsItems.length);
}

newsList.addEventListener('click', (event) => {
  const button = event.target.closest('[data-remove-news]');
  if (!button) return;
  const previous = newsItems;
  newsItems = newsItems.filter((item) => item.id !== button.dataset.removeNews);
  if (!persistNews()) {
    newsItems = previous;
    window.alert('Não foi possível salvar a remoção. Verifique o armazenamento deste navegador.');
    return;
  }
  renderNews();
});

document.querySelector('#news-form').addEventListener('submit', (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  if (!form.reportValidity()) return;
  const data = new FormData(form);
  const item = {
    id: crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    title: data.get('title').trim(),
    date: data.get('date'),
    content: data.get('content').trim(),
    important: data.has('important'),
    demo: false,
  };
  if (!item.title || !item.date || !item.content) {
    setFeedback(document.querySelector('#news-feedback'), 'Preencha título, data e conteúdo.', 'error');
    return;
  }
  newsItems = [item, ...newsItems];
  if (!persistNews()) {
    newsItems = newsItems.filter((news) => news.id !== item.id);
    setFeedback(document.querySelector('#news-feedback'), 'O navegador não permitiu salvar. Libere espaço ou verifique as permissões.', 'error');
    return;
  }
  renderNews();
  form.reset();
  setFeedback(document.querySelector('#news-feedback'), 'Notícia salva somente neste navegador.', 'success');
});

function openPhotoDatabase() {
  return new Promise((resolve, reject) => {
    if (!('indexedDB' in window)) {
      reject(new Error('Este navegador não oferece o armazenamento de imagens necessário.'));
      return;
    }
    const request = indexedDB.open(PHOTO_DB_NAME, 1);
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(PHOTO_STORE_NAME)) {
        database.createObjectStore(PHOTO_STORE_NAME, { keyPath: 'id' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('Falha ao abrir o armazenamento local.'));
  });
}

async function getLocalPhotos() {
  const database = await openPhotoDatabase();
  return new Promise((resolve, reject) => {
    const request = database.transaction(PHOTO_STORE_NAME, 'readonly').objectStore(PHOTO_STORE_NAME).getAll();
    request.onsuccess = () => { database.close(); resolve(request.result); };
    request.onerror = () => { database.close(); reject(request.error); };
  });
}

async function saveLocalPhoto(photo) {
  const database = await openPhotoDatabase();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(PHOTO_STORE_NAME, 'readwrite');
    transaction.objectStore(PHOTO_STORE_NAME).put(photo);
    transaction.oncomplete = () => { database.close(); resolve(); };
    transaction.onerror = () => { database.close(); reject(transaction.error); };
    transaction.onabort = () => { database.close(); reject(transaction.error); };
  });
}

let currentPhotoUrls = [];
function renderPhotos(photos) {
  currentPhotoUrls.forEach((url) => URL.revokeObjectURL(url));
  currentPhotoUrls = [];
  const gallery = document.querySelector('#gallery-list');
  gallery.querySelectorAll('[data-local-photo]').forEach((figure) => figure.remove());
  photos.forEach((photo) => {
    const imageUrl = URL.createObjectURL(photo.blob);
    currentPhotoUrls.push(imageUrl);
    const figure = document.createElement('figure');
    figure.className = 'gallery-photo gallery-uploaded';
    figure.dataset.localPhoto = photo.id;
    const image = document.createElement('img');
    image.src = imageUrl;
    image.alt = photo.title;
    image.loading = 'lazy';
    const caption = document.createElement('figcaption');
    caption.textContent = photo.title;
    const localTag = document.createElement('span');
    localTag.textContent = 'FOTO LOCAL';
    caption.append(' ', localTag);
    figure.append(image, caption);
    gallery.append(figure);
  });
  document.querySelector('#photo-count').textContent = String(photos.length);
  const empty = document.querySelector('#gallery-empty');
  empty.hidden = photos.length > 0;
}

document.querySelector('#photo-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  if (!form.reportValidity()) return;
  const title = document.querySelector('#photo-title').value.trim();
  const files = [...document.querySelector('#photo-files').files];
  const feedback = document.querySelector('#photo-feedback');
  if (!title || files.length === 0) {
    setFeedback(feedback, 'Informe uma legenda e selecione pelo menos uma imagem.', 'error');
    return;
  }
  if (files.length > 6) {
    setFeedback(feedback, 'Selecione no máximo 6 imagens por envio.', 'error');
    return;
  }
  const invalidFile = files.find((file) => !file.type.startsWith('image/') || file.size > MAX_IMAGE_BYTES);
  if (invalidFile) {
    setFeedback(feedback, 'Use arquivos de imagem de até 5 MB cada.', 'error');
    return;
  }
  try {
    for (const file of files) {
      await saveLocalPhoto({
        id: crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`,
        title,
        blob: file,
        mime: file.type,
        savedAt: new Date().toISOString(),
      });
    }
    renderPhotos(await getLocalPhotos());
    form.reset();
    setFeedback(feedback, `${files.length} imagem(ns) salva(s) neste navegador.`, 'success');
  } catch (error) {
    console.warn('Não foi possível salvar as imagens locais.', error);
    setFeedback(feedback, 'Não foi possível guardar as imagens. Verifique o espaço disponível e as permissões do navegador.', 'error');
  }
});

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
  setFeedback(feedback, `Voto demonstrativo registrado para ${candidate.split(' — ')[0]}.`, 'success');
});

renderNews();
getLocalPhotos().then(renderPhotos).catch((error) => {
  console.warn('Não foi possível carregar as imagens locais.', error);
  document.querySelector('#photo-count').textContent = '—';
  setFeedback(document.querySelector('#photo-feedback'), 'O armazenamento de imagens não está disponível neste navegador.', 'error');
});
