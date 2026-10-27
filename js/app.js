const menuToggle = document.querySelector('.menu-toggle');
const mainNav = document.querySelector('.main-nav');
const NEWS_STORAGE_KEY = 'interclasse-demo-news-v1';
const PHOTO_DB_NAME = 'interclasse-demo-gallery';
const PHOTO_STORE_NAME = 'photos';
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const MATCH_STORAGE_KEY = 'interclasse-demo-matches-v1';

const starterMatches = [
  { id: 'game-upcoming-1', date: '2026-10-29', time: '14:30', sport: 'Futsal', home: '8º A', away: '8º B', location: 'Quadra principal', status: 'scheduled' },
  { id: 'game-upcoming-2', date: '2026-10-30', time: '15:15', sport: 'Vôlei', home: '9º A', away: '9º B', location: 'Quadra principal', status: 'scheduled' },
  { id: 'game-upcoming-3', date: '2026-11-03', time: '13:45', sport: 'Basquete', home: '1º A', away: '1º B', location: 'Pátio coberto', status: 'scheduled' },
  { id: 'game-completed-1', date: '2026-10-23', time: '14:30', sport: 'Futsal', home: 'Turma Azul', away: 'Turma Laranja', location: 'Quadra principal', status: 'completed', homeScore: 2, awayScore: 1 },
  { id: 'game-completed-2', date: '2026-10-24', time: '15:15', sport: 'Vôlei', home: 'Turma Verde', away: 'Turma Roxo', location: 'Quadra principal', status: 'completed', homeScore: 1, awayScore: 1 },
];

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

function matchDateTime(match) {
  return new Date(`${match.date}T${match.time}:00`);
}

function formatMatchDate(dateString) {
  return new Intl.DateTimeFormat('pt-BR', {
    weekday: 'short', day: '2-digit', month: 'short', year: 'numeric',
  }).format(new Date(`${dateString}T12:00:00`));
}

function readMatches() {
  try {
    const stored = localStorage.getItem(MATCH_STORAGE_KEY);
    if (stored === null) {
      localStorage.setItem(MATCH_STORAGE_KEY, JSON.stringify(starterMatches));
      return [...starterMatches];
    }
    const matches = JSON.parse(stored);
    return Array.isArray(matches) ? matches : [...starterMatches];
  } catch (error) {
    console.warn('Não foi possível ler o calendário local.', error);
    return [...starterMatches];
  }
}

let matches = readMatches();

function persistMatches() {
  try {
    localStorage.setItem(MATCH_STORAGE_KEY, JSON.stringify(matches));
    return true;
  } catch (error) {
    console.warn('Não foi possível salvar o calendário local.', error);
    return false;
  }
}

function initials(label) {
  return label.trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase();
}

function renderMatchCard(match) {
  const completed = match.status === 'completed';
  const score = completed
    ? `<span class="match-score" aria-label="Placar ${match.homeScore} a ${match.awayScore}">${match.homeScore}<i>—</i>${match.awayScore}</span>`
    : '<span class="versus">VS</span>';
  return `<article class="match-card calendar-card${completed ? ' completed-match' : ''}">
    <div class="match-top"><time class="match-date" datetime="${escapeHtml(match.date)}">${escapeHtml(formatMatchDate(match.date))}</time><span class="match-status${completed ? ' completed-status' : ' status-soft'}">${completed ? 'CONCLUÍDO' : 'AGENDADO'}</span></div>
    <div class="teams"><div class="team"><span class="team-badge badge-blue">${escapeHtml(initials(match.home))}</span><b>${escapeHtml(match.home)}</b></div>${score}<div class="team"><span class="team-badge badge-orange">${escapeHtml(initials(match.away))}</span><b>${escapeHtml(match.away)}</b></div></div>
    <div class="match-bottom"><span>${escapeHtml(match.sport)} · ${escapeHtml(match.location)}</span><time datetime="${escapeHtml(match.date)}T${escapeHtml(match.time)}">${escapeHtml(match.time)}</time></div>
  </article>`;
}

function renderSchedule() {
  const now = new Date();
  const upcoming = matches.filter((match) => match.status !== 'completed' && matchDateTime(match) >= now)
    .sort((a, b) => matchDateTime(a) - matchDateTime(b));
  const pending = matches.filter((match) => match.status !== 'completed' && matchDateTime(match) < now)
    .sort((a, b) => matchDateTime(a) - matchDateTime(b));
  const completed = matches.filter((match) => match.status === 'completed')
    .sort((a, b) => matchDateTime(b) - matchDateTime(a));

  document.querySelector('#upcoming-match-grid').innerHTML = upcoming.map(renderMatchCard).join('');
  document.querySelector('#upcoming-empty').hidden = upcoming.length > 0;
  document.querySelector('#pending-match-grid').innerHTML = pending.map(renderMatchCard).join('');
  document.querySelector('#pending-group').hidden = pending.length === 0;
  document.querySelector('#completed-match-grid').innerHTML = completed.map(renderMatchCard).join('');
  document.querySelector('#completed-empty').hidden = completed.length > 0;
  document.querySelector('#match-count').textContent = String(matches.length);
  renderScoreOptions();
}

function renderScoreOptions() {
  const select = document.querySelector('#score-match');
  const selectedId = select.value;
  const options = matches.map((match) => {
    const result = match.status === 'completed' ? ` · ${match.homeScore} x ${match.awayScore}` : '';
    const label = `${formatMatchDate(match.date)} ${match.time} · ${match.home} x ${match.away}${result}`;
    return `<option value="${escapeHtml(match.id)}">${escapeHtml(label)}</option>`;
  }).join('');
  select.innerHTML = '<option value="">Selecione uma partida</option>' + options;
  if (matches.some((match) => match.id === selectedId)) select.value = selectedId;
}

document.querySelector('#match-form').addEventListener('submit', (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  if (!form.reportValidity()) return;
  const data = new FormData(form);
  const match = {
    id: crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    date: data.get('date'),
    time: data.get('time'),
    sport: data.get('sport').trim(),
    home: data.get('home').trim(),
    away: data.get('away').trim(),
    location: data.get('location').trim(),
    status: 'scheduled',
  };
  if (!match.sport || !match.home || !match.away || !match.location) {
    setFeedback(document.querySelector('#match-feedback'), 'Preencha todos os campos da partida.', 'error');
    return;
  }
  matches = [...matches, match];
  if (!persistMatches()) {
    matches = matches.filter((item) => item.id !== match.id);
    setFeedback(document.querySelector('#match-feedback'), 'Não foi possível salvar no navegador. Verifique o espaço disponível.', 'error');
    return;
  }
  renderSchedule();
  form.reset();
  setFeedback(document.querySelector('#match-feedback'), 'Partida cadastrada e adicionada à agenda local.', 'success');
});

document.querySelector('#score-form').addEventListener('submit', (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  if (!form.reportValidity()) return;
  const data = new FormData(form);
  const matchId = data.get('matchId');
  const homeScore = Number(data.get('homeScore'));
  const awayScore = Number(data.get('awayScore'));
  const feedback = document.querySelector('#score-feedback');
  const match = matches.find((item) => item.id === matchId);
  if (!match || !Number.isInteger(homeScore) || !Number.isInteger(awayScore) || homeScore < 0 || awayScore < 0 || homeScore > 99 || awayScore > 99) {
    setFeedback(feedback, 'Selecione uma partida e informe dois placares inteiros entre 0 e 99.', 'error');
    return;
  }
  if (match.status === 'completed' && !window.confirm(`O placar atual é ${match.homeScore} x ${match.awayScore}. Deseja substituí-lo por ${homeScore} x ${awayScore}?`)) {
    setFeedback(feedback, 'Alteração cancelada; o resultado anterior foi mantido.');
    return;
  }
  const previous = match;
  matches = matches.map((item) => item.id === matchId
    ? { ...item, status: 'completed', homeScore, awayScore }
    : item);
  if (!persistMatches()) {
    matches = matches.map((item) => item.id === matchId ? previous : item);
    setFeedback(feedback, 'Não foi possível salvar o placar. O resultado anterior foi mantido.', 'error');
    return;
  }
  renderSchedule();
  form.reset();
  setFeedback(feedback, 'Resultado salvo; calendário e painel foram atualizados.', 'success');
});

document.querySelector('#score-match').addEventListener('change', (event) => {
  const match = matches.find((item) => item.id === event.currentTarget.value);
  document.querySelector('#score-home').value = match?.status === 'completed' ? match.homeScore : '';
  document.querySelector('#score-away').value = match?.status === 'completed' ? match.awayScore : '';
});

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

/* Integração compartilhada com Supabase. Sem anon key, o modo local continua disponível. */
const supabase = window.InterclasseSupabase;
const supabaseStatus = document.querySelector('#supabase-status');
const authForm = document.querySelector('#auth-form');
const authFeedback = document.querySelector('#auth-feedback');
const signOutButton = document.querySelector('#auth-signout');

function remoteEnabled() { return Boolean(supabase?.configured()); }

function updateAuthInterface(profile) {
  const signedIn = Boolean(profile);
  authForm.querySelectorAll('input').forEach((input) => { input.disabled = signedIn; });
  authForm.querySelector('button[type="submit"]').hidden = signedIn;
  signOutButton.hidden = !signedIn;
  if (!remoteEnabled()) { supabaseStatus.textContent = 'Modo local: inclua a anon key em js/supabase-config.js para conectar ao Supabase.'; return; }
  if (profile?.role === 'admin' && profile.active) {
    supabaseStatus.textContent = `Conectado ao Supabase como administrador(a): ${profile.display_name}.`;
    setFeedback(authFeedback, 'Acesso administrativo ativo.', 'success');
  } else if (profile) {
    supabaseStatus.textContent = `Conectado ao Supabase como ${profile.display_name}. Esta conta não possui permissão administrativa.`;
    setFeedback(authFeedback, 'Conta autenticada sem permissão administrativa.', 'error');
  } else supabaseStatus.textContent = 'Conectado ao Supabase. Entre com uma conta administrativa para publicar conteúdo.';
}

async function loadSharedData() {
  if (!remoteEnabled()) { updateAuthInterface(null); return; }
  try {
    const [remoteNews, remoteMatches, profile] = await Promise.all([supabase.loadNews(), supabase.loadMatches(), supabase.profile()]);
    newsItems = remoteNews; matches = remoteMatches; renderNews(); renderSchedule(); updateAuthInterface(profile);
  } catch (error) {
    console.warn('Falha ao carregar dados do Supabase.', error);
    supabaseStatus.textContent = `Não foi possível carregar o Supabase: ${error.message}`;
  }
}

authForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  if (!remoteEnabled()) { setFeedback(authFeedback, 'Configure a anon key antes de entrar.', 'error'); return; }
  const data = new FormData(authForm);
  try { updateAuthInterface(await supabase.signIn(data.get('email'), data.get('password'))); }
  catch (error) { setFeedback(authFeedback, error.message, 'error'); }
});
signOutButton.addEventListener('click', async () => {
  try { await supabase.signOut(); updateAuthInterface(null); } catch (error) { setFeedback(authFeedback, error.message, 'error'); }
});

/* Captura os formulários antes dos handlers locais quando há conexão configurada. */
document.querySelector('#news-form').addEventListener('submit', async (event) => {
  if (!remoteEnabled()) return;
  event.preventDefault(); event.stopImmediatePropagation();
  const form = event.currentTarget; if (!form.reportValidity()) return;
  const data = new FormData(form);
  try {
    await supabase.createNews({ title: data.get('title').trim(), date: data.get('date'), content: data.get('content').trim(), important: data.has('important') });
    newsItems = await supabase.loadNews(); renderNews(); form.reset(); setFeedback(document.querySelector('#news-feedback'), 'Notícia publicada no Supabase.', 'success');
  } catch (error) { setFeedback(document.querySelector('#news-feedback'), error.message, 'error'); }
}, true);

newsList.addEventListener('click', async (event) => {
  if (!remoteEnabled()) return;
  const button = event.target.closest('[data-remove-news]'); if (!button) return;
  event.preventDefault(); event.stopImmediatePropagation();
  if (!window.confirm('Deseja remover esta notícia compartilhada?')) return;
  try { await supabase.deleteNews(button.dataset.removeNews); newsItems = await supabase.loadNews(); renderNews(); }
  catch (error) { window.alert(error.message); }
}, true);

document.querySelector('#match-form').addEventListener('submit', async (event) => {
  if (!remoteEnabled()) return;
  event.preventDefault(); event.stopImmediatePropagation();
  const form = event.currentTarget; if (!form.reportValidity()) return;
  const data = new FormData(form);
  try {
    await supabase.createMatch({ date: data.get('date'), time: data.get('time'), sport: data.get('sport').trim(), home: data.get('home').trim(), away: data.get('away').trim(), location: data.get('location').trim() });
    matches = await supabase.loadMatches(); renderSchedule(); form.reset(); setFeedback(document.querySelector('#match-feedback'), 'Partida cadastrada no Supabase.', 'success');
  } catch (error) { setFeedback(document.querySelector('#match-feedback'), error.message, 'error'); }
}, true);

document.querySelector('#score-form').addEventListener('submit', async (event) => {
  if (!remoteEnabled()) return;
  event.preventDefault(); event.stopImmediatePropagation();
  const form = event.currentTarget; if (!form.reportValidity()) return;
  const data = new FormData(form); const homeScore = Number(data.get('homeScore')); const awayScore = Number(data.get('awayScore'));
  if (!Number.isInteger(homeScore) || !Number.isInteger(awayScore) || homeScore < 0 || awayScore < 0 || homeScore > 99 || awayScore > 99) { setFeedback(document.querySelector('#score-feedback'), 'Informe placares inteiros entre 0 e 99.', 'error'); return; }
  try {
    await supabase.saveResult(data.get('matchId'), homeScore, awayScore);
    matches = await supabase.loadMatches(); renderSchedule(); form.reset(); setFeedback(document.querySelector('#score-feedback'), 'Resultado salvo no Supabase.', 'success');
  } catch (error) { setFeedback(document.querySelector('#score-feedback'), error.message, 'error'); }
}, true);

loadSharedData();

renderNews();
renderSchedule();
getLocalPhotos().then(renderPhotos).catch((error) => {
  console.warn('Não foi possível carregar as imagens locais.', error);
  document.querySelector('#photo-count').textContent = '—';
  setFeedback(document.querySelector('#photo-feedback'), 'O armazenamento de imagens não está disponível neste navegador.', 'error');
});
