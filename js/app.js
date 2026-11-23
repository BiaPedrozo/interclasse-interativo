const menuToggle = document.querySelector('.menu-toggle');
const mainNav = document.querySelector('.main-nav');
const supabase = window.InterclasseSupabase;
const pageStatus = document.querySelector('#connection-status');
const authForm = document.querySelector('#auth-form');
const signupForm = document.querySelector('#signup-form');
const signOutButton = document.querySelector('#auth-signout');
const adminWorkspace = document.querySelector('#admin-workspace');
const newsForm = document.querySelector('#news-form');
const newsCancelEdit = document.querySelector('#news-cancel-edit');
const pollList = document.querySelector('#poll-list');
const predictionMatch = document.querySelector('#prediction-match');
const predictionTeam = document.querySelector('#prediction-team');

const state = {
  data: null,
  profile: null,
  activity: { votes: [], predictions: [] },
  admin: null,
  editingNews: null,
  loadedAt: 0,
};

const categoryLabels = {
  clique_rodada: 'Clique da Rodada',
  revelacao: 'Revelação do Interclasse',
  meme: 'Meme da Rodada',
  entrevista: 'Entrevista Relâmpago',
  hall_fama: 'Hall da Fama',
  bastidores: 'Bastidores',
  curiosidade: 'Você Sabia?',
};

const mediaCategoryLabels = {
  partida: 'Partida',
  torcida: 'Torcida',
  bastidores: 'Bastidores',
  premiacao: 'Premiação',
  outro: 'Outro',
};

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[character]);
}

function setFeedback(element, message, type = '') {
  if (!element) return;
  element.textContent = message;
  element.classList.toggle('is-error', type === 'error');
  element.classList.toggle('is-success', type === 'success');
}

function formatDate(value, options = { day: '2-digit', month: 'short', year: 'numeric' }) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.valueOf())) return '—';
  return new Intl.DateTimeFormat('pt-BR', options).format(date);
}

function formatDateInput(value) {
  const date = new Date(value);
  if (Number.isNaN(date.valueOf())) return '';
  return [date.getFullYear(), String(date.getMonth() + 1).padStart(2, '0'), String(date.getDate()).padStart(2, '0')].join('-');
}

function formatDateTimeInput(value) {
  const date = new Date(value);
  if (Number.isNaN(date.valueOf())) return '';
  const day = [date.getFullYear(), String(date.getMonth() + 1).padStart(2, '0'), String(date.getDate()).padStart(2, '0')].join('-');
  const time = [String(date.getHours()).padStart(2, '0'), String(date.getMinutes()).padStart(2, '0')].join(':');
  return `${day}T${time}`;
}

function initials(label) {
  return String(label || '').trim().split(/\s+/).slice(0, 2).map((part) => part[0] || '').join('').toUpperCase();
}

function classColor(classId) {
  const branding = state.data?.branding.find((item) => item.class_id === classId);
  return /^#[\da-f]{6}$/i.test(branding?.display_color || '') ? branding.display_color : '#426de0';
}

function setOptions(select, options, placeholder, selectedValue = '') {
  if (!select) return;
  select.innerHTML = `<option value="">${escapeHtml(placeholder)}</option>${options.map((option) => (
    `<option value="${escapeHtml(option.value)}">${escapeHtml(option.label)}</option>`
  )).join('')}`;
  if (selectedValue && options.some((option) => String(option.value) === String(selectedValue))) {
    select.value = selectedValue;
  }
}

function classOptions() {
  return (state.data?.classes || []).map((item) => ({ value: item.id, label: item.name }));
}

function modalityOptions() {
  return (state.data?.modalities || []).map((item) => ({ value: item.id, label: item.name }));
}

function updateSelectOptions() {
  const classes = classOptions();
  const modalities = modalityOptions();
  [
    ['#signup-class', 'Selecione sua turma'],
    ['#athlete-class', 'Selecione a turma'],
    ['#match-home', 'Selecione a turma'],
    ['#match-away', 'Selecione a turma'],
    ['#media-class', 'Sem turma específica'],
    ['#spotlight-class', 'Sem turma específica'],
    ['#gallery-class', 'Todas'],
  ].forEach(([selector, placeholder]) => {
    const element = document.querySelector(selector);
    const current = element.value;
    setOptions(element, classes, placeholder, current);
  });
  [
    ['#athlete-modality', 'Selecione a modalidade'],
    ['#match-modality', 'Selecione a modalidade'],
    ['#media-modality', 'Sem modalidade específica'],
    ['#gallery-modality', 'Todas'],
  ].forEach(([selector, placeholder]) => {
    const element = document.querySelector(selector);
    const current = element.value;
    setOptions(element, modalities, placeholder, current);
  });
  const mediaSelect = document.querySelector('#spotlight-media');
  const mediaSelected = mediaSelect.value;
  setOptions(mediaSelect, [
    ...(state.data?.media || []).map((item) => ({ value: item.storage_path, label: item.caption })),
  ], 'Sem imagem', mediaSelected);
  const mediaMatchSelect = document.querySelector('#media-match');
  setOptions(mediaMatchSelect, (state.data?.matches || []).map((match) => ({
    value: match.id, label: `${formatDate(match.startsAt)} · ${match.home} x ${match.away}`,
  })), 'Sem partida específica', mediaMatchSelect.value);
  renderPredictionMatchOptions();
  renderScoreMatchOptions();
  renderAthleteScoreOptions();
  renderCandidatePollOptions();
}

function renderStandings() {
  const standings = [...(state.data?.standings || [])].sort((a, b) => (
    b.points - a.points || b.wins - a.wins || b.score_difference - a.score_difference
  ));
  const body = document.querySelector('#standings-list');
  body.innerHTML = standings.map((item, index) => `
    <tr>
      <td><span class="rank-number">${index + 1}</span></td>
      <th scope="row"><span class="table-team"><i style="--team-color:${classColor(item.class_id)}"></i>${escapeHtml(item.class_name)}</span></th>
      <td>${item.matches_played}</td><td>${item.wins}</td><td>${item.draws}</td><td>${item.losses}</td>
      <td>${item.score_difference > 0 ? '+' : ''}${item.score_difference}</td><td class="points-cell">${item.points}</td>
    </tr>`).join('');
  document.querySelector('#standings-empty').hidden = standings.some((item) => item.matches_played > 0);
  body.closest('.table-wrap').hidden = standings.length === 0;
  renderClassChart(standings);
}

function renderClassChart(standings) {
  const chart = document.querySelector('#class-chart');
  const maximum = Math.max(1, ...standings.map((item) => item.wins));
  chart.innerHTML = standings.map((item) => `
    <div class="chart-row">
      <span>${escapeHtml(item.class_name)}</span>
      <div class="chart-track" role="img" aria-label="${item.wins} vitórias">
        <i style="width:${Math.round(item.wins / maximum * 100)}%;--team-color:${classColor(item.class_id)}"></i>
      </div><b>${item.wins} vitórias</b>
    </div>`).join('');
}

function renderTeams() {
  const list = document.querySelector('#team-list');
  const classes = state.data?.classes || [];
  list.innerHTML = classes.map((schoolClass) => {
    const brand = state.data.branding.find((item) => item.class_id === schoolClass.id);
    const teams = state.data.teams.filter((team) => team.class_id === schoolClass.id);
    const athletes = state.data.athletes.filter((athlete) => athlete.teams?.class_id === schoolClass.id);
    const history = state.data.matches.filter((match) => (
      match.status === 'completed'
      && (match.homeClassId === schoolClass.id || match.awayClassId === schoolClass.id)
    ));
    const modalities = [...new Set(teams.map((team) => team.modalities?.name).filter(Boolean))];
    const logo = brand?.crestUrl
      ? `<img src="${escapeHtml(brand.crestUrl)}" alt="Escudo de ${escapeHtml(schoolClass.name)}" loading="lazy">`
      : `<span>${escapeHtml(initials(schoolClass.name))}</span>`;
    return `<article class="team-card" style="--team-color:${classColor(schoolClass.id)}">
      <div class="team-card-top"><div class="team-crest">${logo}</div><div><span class="eyebrow">COLÉGIO SINERGE</span><h3>${escapeHtml(schoolClass.name)}</h3></div></div>
      ${brand?.slogan ? `<p class="team-slogan">“${escapeHtml(brand.slogan)}”</p>` : '<p class="team-slogan team-unset">Slogan não informado pela turma.</p>'}
      ${brand?.war_cry ? `<p class="team-war-cry">${escapeHtml(brand.war_cry)}</p>` : ''}
      <div class="team-facts"><span>${athletes.length} atletas</span><span>${history.length} resultados</span></div>
      <p class="team-modalities">${modalities.length ? escapeHtml(modalities.join(' · ')) : 'Modalidades ainda não cadastradas'}</p>
      <a class="text-link team-gallery-link" href="#galeria" data-team-gallery="${escapeHtml(schoolClass.id)}">Ver fotos da turma →</a>
      <details class="team-roster"><summary>Ver elenco e resultados</summary>
        <h4>Atletas</h4><ul>${athletes.length ? athletes.map((athlete) => `<li>${escapeHtml(athlete.name)}${athlete.shirt_number === null ? '' : ` · #${athlete.shirt_number}`}${athlete.teams?.name ? ` · ${escapeHtml(athlete.teams.name)}` : ''}</li>`).join('') : '<li>Elenco ainda não cadastrado.</li>'}</ul>
        <h4>Resultados</h4><ul>${history.length ? history.map((match) => `<li>${escapeHtml(match.sport)} · ${match.homeScore}–${match.awayScore} · ${escapeHtml(match.homeClassId === schoolClass.id ? match.away : match.home)}</li>`).join('') : '<li>Nenhum resultado registrado.</li>'}</ul>
      </details>
    </article>`;
  }).join('');
  document.querySelector('#team-empty').hidden = classes.length > 0;
  renderTeamSettings();
}

function renderTeamSettings() {
  const container = document.querySelector('#team-settings-list');
  container.innerHTML = (state.data?.classes || []).map((schoolClass) => {
    const branding = state.data.branding.find((item) => item.class_id === schoolClass.id) || {};
    return `<form class="team-settings-form admin-subform" data-class-id="${escapeHtml(schoolClass.id)}">
      <h4>${escapeHtml(schoolClass.name)}</h4>
      <label>Cor de exibição (personalizável)<input name="display_color" type="color" value="${escapeHtml(classColor(schoolClass.id))}"></label>
      <label>Slogan<input name="slogan" maxlength="160" value="${escapeHtml(branding.slogan)}"></label>
      <label>Grito de guerra<input name="war_cry" maxlength="160" value="${escapeHtml(branding.war_cry)}"></label>
      <label>Escudo ou logotipo<input name="crest" type="file" accept="image/jpeg,image/png,image/webp,image/avif"></label>
      <button class="button button-light" type="submit">Salvar identidade</button>
      <p class="form-feedback" aria-live="polite"></p>
    </form>`;
  }).join('');
}

function renderMatchCard(match, completed) {
  const score = completed
    ? `<span class="match-score">${match.homeScore}<i>—</i>${match.awayScore}</span>`
    : '<span class="versus">VS</span>';
  const dateTime = new Date(match.startsAt);
  const dateLabel = formatDate(dateTime, { weekday: 'short', day: '2-digit', month: 'short' });
  const homeColor = classColor(match.homeClassId);
  const awayColor = classColor(match.awayClassId);
  return `<article class="match-card calendar-card${completed ? ' completed-match' : ''}">
    <div class="match-top"><time class="match-date" datetime="${escapeHtml(match.startsAt)}">${escapeHtml(dateLabel)} · ${escapeHtml(match.time)}</time><span class="match-status ${completed ? 'completed-status' : 'status-soft'}">${completed ? 'ENCERRADO' : 'AGENDADO'}</span></div>
    <div class="teams">
      <div class="team"><span class="team-badge" style="--team-color:${homeColor}">${escapeHtml(initials(match.home))}</span><b>${escapeHtml(match.home)}</b></div>
      ${score}
      <div class="team"><span class="team-badge" style="--team-color:${awayColor}">${escapeHtml(initials(match.away))}</span><b>${escapeHtml(match.away)}</b></div>
    </div>
    <div class="match-bottom"><span>${escapeHtml(match.sport)} · ${escapeHtml(match.location)}</span><span>${match.duration} min</span></div>
  </article>`;
}

function renderSchedule() {
  const now = Date.now();
  const upcoming = (state.data?.matches || []).filter((match) => match.status === 'scheduled' && new Date(match.startsAt).valueOf() >= now);
  const completed = (state.data?.matches || []).filter((match) => match.status === 'completed');
  document.querySelector('#upcoming-match-grid').innerHTML = upcoming.slice(0, 6).map((match) => renderMatchCard(match, false)).join('');
  document.querySelector('#upcoming-empty').hidden = upcoming.length > 0;
  document.querySelector('#completed-match-grid').innerHTML = completed.slice(0, 6).map((match) => renderMatchCard(match, true)).join('');
  document.querySelector('#completed-empty').hidden = completed.length > 0;
}

function renderPredictionMatchOptions() {
  const current = predictionMatch.value;
  const upcoming = (state.data?.matches || []).filter((match) => (
    match.status === 'scheduled' && new Date(match.startsAt).valueOf() > Date.now()
  ));
  const options = upcoming.map((match) => ({
    value: match.id,
    label: `${formatDate(match.startsAt)} · ${match.home} x ${match.away} · ${match.sport}`,
  }));
  setOptions(predictionMatch, options, options.length ? 'Selecione uma partida' : 'Nenhuma partida disponível', current);
  updatePredictionTeams();
}

function updatePredictionTeams() {
  const match = state.data?.matches.find((item) => item.id === predictionMatch.value);
  const choices = match ? [
    { value: match.homeId, label: match.home },
    { value: match.awayId, label: match.away },
    { value: '', label: 'Empate' },
  ] : [];
  setOptions(predictionTeam, choices, 'Escolha o resultado', predictionTeam.value);
}

function renderScoreMatchOptions() {
  const select = document.querySelector('#score-match');
  const current = select.value;
  const matches = (state.data?.matches || []).filter((match) => match.status !== 'cancelled');
  setOptions(select, matches.map((match) => ({
    value: match.id,
    label: `${formatDate(match.startsAt)} · ${match.home} x ${match.away} · ${match.sport}`,
  })), 'Selecione uma partida', current);
}

function renderAthleteScoreOptions() {
  const matchSelect = document.querySelector('#athlete-score-match');
  const athleteSelect = document.querySelector('#athlete-score-player');
  if (!matchSelect || !athleteSelect) return;
  const currentMatch = matchSelect.value;
  const completed = (state.data?.matches || []).filter((match) => match.status === 'completed');
  setOptions(matchSelect, completed.map((match) => ({
    value: match.id, label: `${formatDate(match.startsAt)} · ${match.home} x ${match.away} · ${match.sport}`,
  })), 'Selecione uma partida encerrada', currentMatch);
  const match = completed.find((item) => item.id === matchSelect.value);
  const eligible = match
    ? (state.data?.athletes || []).filter((athlete) => [match.homeId, match.awayId].includes(athlete.team_id))
    : [];
  setOptions(athleteSelect, eligible.map((athlete) => ({
    value: athlete.id,
    label: `${athlete.name} · ${athlete.teams?.school_classes?.name || 'Turma'}`,
  })), match ? 'Selecione um atleta participante' : 'Selecione uma partida');
}

function renderAthleteScoreAdminList() {
  const container = document.querySelector('#athlete-score-admin-list');
  container.innerHTML = (state.data?.athleteStats || []).map((entry) => `
    <div class="admin-list-row"><span>${escapeHtml(entry.athletes?.name || 'Atleta')} · ${entry.score_count} ${escapeHtml(entry.matches?.modalities?.score_label || 'pontos')}
      <small>${escapeHtml(entry.athletes?.teams?.school_classes?.name || '')} · ${escapeHtml(formatDate(entry.matches?.starts_at))}</small></span>
      <button type="button" class="text-link danger-link" data-athlete-stat-delete="${escapeHtml(entry.id)}">Remover</button>
    </div>`).join('');
}

function renderNews() {
  const items = state.data?.news || [];
  document.querySelector('#news-list').innerHTML = items.map((item) => `
    <article class="news-card news-managed-card${item.featured ? ' is-important' : ''}">
      <span class="news-meta">${item.featured ? 'COMUNICADO EM DESTAQUE' : 'COMUNICADO OFICIAL'}</span>
      <h3>${escapeHtml(item.title)}</h3><time datetime="${escapeHtml(item.published_at)}">${escapeHtml(formatDate(item.published_at))}</time>
      <p>${escapeHtml(item.content)}</p>
    </article>`).join('');
  document.querySelector('#news-empty').hidden = items.length > 0;
  document.querySelector('#admin-news-count').textContent = String(items.length);
  const adminList = document.querySelector('#news-admin-list');
  adminList.innerHTML = (state.admin?.news || items).map((item) => `
    <div class="admin-list-row"><span>${escapeHtml(item.title)}</span><div>
      <button type="button" class="text-link" data-news-edit="${escapeHtml(item.id)}">Editar</button>
      <button type="button" class="text-link danger-link" data-news-delete="${escapeHtml(item.id)}">Remover</button>
    </div></div>`).join('');
}

function renderPolls() {
  const polls = (state.data?.polls || []).filter((poll) => poll.status !== 'draft');
  pollList.innerHTML = polls.map((poll) => {
    const options = poll.candidates || [];
    const hasVoted = state.activity.votes.some((vote) => vote.poll_id === poll.id);
    const open = poll.status === 'open' && new Date(poll.starts_at).valueOf() <= Date.now() && new Date(poll.ends_at).valueOf() > Date.now();
    return `<article class="poll-card">
      <div class="poll-card-top"><span class="eyebrow">${escapeHtml(poll.category)}</span><span class="poll-state ${open ? 'poll-open' : ''}">${open ? 'ABERTA' : poll.status === 'closed' ? 'ENCERRADA' : 'AGUARDANDO'}</span></div>
      <h3>${escapeHtml(poll.title)}</h3>
      <p class="poll-dates">${escapeHtml(formatDate(poll.starts_at))} — ${escapeHtml(formatDate(poll.ends_at))}</p>
      ${open && options.length ? `<form class="poll-vote-form" data-poll-id="${escapeHtml(poll.id)}">
        ${options.map((option) => {
          const label = option.label || option.athletes?.name || 'Opção';
          return `<label class="poll-option"><input type="radio" name="candidateId" value="${escapeHtml(option.id)}" ${hasVoted ? 'disabled' : ''} required><span>${escapeHtml(label)}</span></label>`;
        }).join('')}
        <button class="button button-orange" type="submit" ${hasVoted ? 'disabled' : ''}>${hasVoted ? 'Voto registrado' : 'Confirmar voto'}</button>
        <p class="form-feedback" aria-live="polite">${hasVoted ? 'Seu voto nesta enquete já foi registrado.' : 'Um voto por conta em cada enquete.'}</p>
      </form>` : options.length ? `<div class="poll-options-readonly">${options.map((option) => `<span>${escapeHtml(option.label || option.athletes?.name || 'Opção')}</span>`).join('')}</div>` : '<p class="field-hint">As opções serão cadastradas pela organização.</p>'}
      <div class="poll-results" data-poll-results="${escapeHtml(poll.id)}"><span class="field-hint">${poll.status === 'closed' ? 'Carregando resultados…' : 'Resultados serão divulgados após o encerramento.'}</span></div>
    </article>`;
  }).join('');
  document.querySelector('#poll-empty').hidden = polls.length > 0;
  polls.filter((poll) => poll.status === 'closed').forEach(loadPollResults);
  renderAdminPolls();
  renderCandidatePollOptions();
}

async function loadPollResults(poll) {
  const container = document.querySelector(`[data-poll-results="${CSS.escape(poll.id)}"]`);
  if (!container) return;
  try {
    const results = await supabase.getPollResults(poll.id);
    const total = Number(results[0]?.poll_votes || 0);
    container.innerHTML = results.length
      ? `<h4>Resultado · ${total} ${total === 1 ? 'voto' : 'votos'}</h4>${results.map((result) => {
        const votes = Number(result.vote_count);
        const percent = total ? Math.round(votes / total * 100) : 0;
        return `<div class="poll-result-row"><div><span>${escapeHtml(result.candidate_label)}</span><b>${percent}% · ${votes}</b></div><div class="chart-track"><i style="width:${percent}%"></i></div></div>`;
      }).join('')}`
      : '<span class="field-hint">Nenhuma opção recebeu votos.</span>';
  } catch (error) {
    setFeedback(container, error.message, 'error');
  }
}

function renderCandidatePollOptions() {
  const current = document.querySelector('#candidate-poll').value;
  const polls = state.data?.polls?.filter((item) => item.status === 'draft') || [];
  setOptions(document.querySelector('#candidate-poll'), polls.map((item) => ({
    value: item.id, label: `${item.title} · ${item.status}`,
  })), 'Selecione uma enquete', current);
}

function renderAdminPolls() {
  const list = document.querySelector('#poll-admin-list');
  if (!list) return;
  list.innerHTML = (state.admin?.allPolls || []).map((poll) => `
    <div class="admin-list-row"><span><b>${escapeHtml(poll.title)}</b><small>${escapeHtml(poll.category)} · ${escapeHtml(formatDate(poll.starts_at))} · ${escapeHtml(poll.status)}</small></span><div>
      ${poll.status === 'draft' ? `<button type="button" class="text-link" data-poll-open="${escapeHtml(poll.id)}">Abrir</button>` : ''}
      ${poll.status === 'open' ? `<button type="button" class="text-link danger-link" data-poll-close="${escapeHtml(poll.id)}">Encerrar</button>` : ''}
    </div></div>`).join('');
}

function renderGallery() {
  const category = document.querySelector('#gallery-category').value;
  const classId = document.querySelector('#gallery-class').value;
  const modalityId = document.querySelector('#gallery-modality').value;
  const day = document.querySelector('#gallery-day').value;
  const items = (state.data?.media || []).filter((item) => (
    (!category || item.category === category)
    && (!classId || item.class_id === classId)
    && (!modalityId || item.modality_id === modalityId)
    && (!day || formatDateInput(item.created_at) === day)
  ));
  document.querySelector('#gallery-list').innerHTML = items.map((item) => {
    const source = escapeHtml(item.url);
    const media = item.media_type === 'video'
      ? `<video src="${source}" controls preload="metadata" aria-label="${escapeHtml(item.caption)}"></video>`
      : `<img src="${source}" alt="${escapeHtml(item.caption)}" loading="lazy">`;
    const className = state.data.classes.find((schoolClass) => schoolClass.id === item.class_id)?.name;
    return `<figure class="gallery-photo gallery-uploaded">${media}<figcaption>${escapeHtml(item.caption)}<span>${escapeHtml(mediaCategoryLabels[item.category] || item.category)}${className ? ` · ${escapeHtml(className)}` : ''} · ${escapeHtml(formatDate(item.created_at))}</span></figcaption></figure>`;
  }).join('');
  document.querySelector('#gallery-empty').hidden = items.length > 0;
  const adminList = document.querySelector('#media-admin-list');
  adminList.innerHTML = (state.admin?.allMedia || []).map((item) => `
    <div class="admin-list-row"><span>${escapeHtml(item.caption)}<small>${escapeHtml(item.status)} · ${escapeHtml(item.media_type)}</small></span>
      ${item.status === 'published' ? `<button type="button" class="text-link danger-link" data-media-delete="${escapeHtml(item.id)}" data-storage-path="${escapeHtml(item.storage_path)}">Remover</button>` : ''}
    </div>`).join('');
  renderSpotlightMediaOptions();
}

function renderSpotlightMediaOptions() {
  const select = document.querySelector('#spotlight-media');
  if (!select) return;
  const current = select.value;
  setOptions(select, (state.data?.media || []).filter((item) => item.media_type === 'image').map((item) => ({
    value: item.storage_path, label: item.caption,
  })), 'Sem imagem', current);
}

function renderSpotlights() {
  const items = state.data?.spotlights || [];
  document.querySelector('#spotlight-list').innerHTML = items.map((item) => `
    <article class="spotlight-card">
      <span class="eyebrow">${escapeHtml(categoryLabels[item.category] || item.category)}</span>
      <h3>${escapeHtml(item.title)}</h3>
      ${item.mediaUrl ? `<img src="${escapeHtml(item.mediaUrl)}" alt="${escapeHtml(item.title)}" loading="lazy">` : ''}
      <p>${escapeHtml(item.content)}</p>
      <small>${item.className ? `${escapeHtml(item.className)} · ` : ''}${escapeHtml(formatDate(item.created_at))}</small>
    </article>`).join('');
  document.querySelector('#spotlight-empty').hidden = items.length > 0;
  const list = document.querySelector('#spotlight-admin-list');
  list.innerHTML = (state.admin?.allSpotlights || []).map((item) => `
    <div class="admin-list-row"><span>${escapeHtml(item.title)}<small>${escapeHtml(categoryLabels[item.category] || item.category)} · ${escapeHtml(item.status)}</small></span>
      <button type="button" class="text-link danger-link" data-spotlight-delete="${escapeHtml(item.id)}">Remover</button>
    </div>`).join('');
}

function renderWall() {
  const messages = state.data?.messages || [];
  document.querySelector('#wall-list').innerHTML = messages.map((item) => `
    <article class="wall-card"><span class="wall-class" style="--team-color:${classColor(item.class_id)}">${escapeHtml(item.school_classes?.name || 'Turma')}</span>
      <p>${escapeHtml(item.message)}</p><time datetime="${escapeHtml(item.created_at)}">${escapeHtml(formatDate(item.created_at))}</time>
    </article>`).join('');
  document.querySelector('#wall-empty').hidden = messages.length > 0;
  document.querySelector('#wall-form').hidden = !state.profile || state.profile.role !== 'student' || !state.profile.active;
  const list = document.querySelector('#wall-admin-list');
  list.innerHTML = (state.admin?.pendingMessages || []).map((item) => `
    <div class="admin-list-row"><span><b>${escapeHtml(item.school_classes?.name || 'Turma')}</b><small>${escapeHtml(item.profiles?.display_name || 'Estudante')} · ${escapeHtml(item.message)}</small></span>
      <div><button type="button" class="text-link" data-wall-status="published" data-wall-id="${escapeHtml(item.id)}">Publicar</button><button type="button" class="text-link danger-link" data-wall-status="rejected" data-wall-id="${escapeHtml(item.id)}">Rejeitar</button></div>
    </div>`).join('');
}

function renderStatistics() {
  const stats = state.data?.stats;
  const standings = state.data?.standings || [];
  const matches = state.data?.matches || [];
  const topWins = [...standings].sort((a, b) => b.wins - a.wins)[0];
  const modalityCounts = new Map();
  matches.forEach((match) => modalityCounts.set(match.sport, (modalityCounts.get(match.sport) || 0) + 1));
  const popularModality = [...modalityCounts.entries()].sort((a, b) => b[1] - a[1])[0];
  const margin = matches.filter((match) => match.status === 'completed')
    .map((match) => ({ match, value: Math.abs(match.homeScore - match.awayScore) }))
    .sort((a, b) => b.value - a.value)[0];
  const winStreak = longestWinStreak(matches, state.data?.classes || []);
  const values = [
    ['Jogos realizados', stats?.completed_matches || 0],
    ['Gols ou pontos', stats?.total_scores || 0],
    ['Mais vitórias', topWins?.wins ? topWins.class_name : '—'],
    ['Maior diferença', margin ? `${margin.value} · ${margin.match.sport}` : '—'],
    ['Modalidade mais disputada', popularModality ? `${popularModality[0]} · ${popularModality[1]} jogos` : '—'],
    ['Maior sequência de vitórias', winStreak ? `${winStreak.length} · ${winStreak.className}` : '—'],
    ['Atletas cadastrados', stats?.registered_athletes || 0],
    ['Estudantes vinculados', stats?.registered_students || 0],
    ['Palpites corretos', 'Após partidas'],
  ];
  document.querySelector('#statistics-list').innerHTML = values.map(([label, value]) => `
    <article class="stat-card"><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong></article>`).join('');
  document.querySelector('#statistics-empty').hidden = Boolean(stats);
  document.querySelector('#stat-games').textContent = String(stats?.completed_matches || 0);
  document.querySelector('#stat-points').textContent = String(stats?.total_scores || 0);
  document.querySelector('#stat-athletes').textContent = String(stats?.registered_athletes || 0);
  document.querySelector('#stat-votes').textContent = String(stats?.poll_votes || 0);
  renderIndividualHighlights();
  renderHomeDashboard();
}

function renderHomeDashboard() {
  const upcoming = (state.data?.matches || [])
    .filter((match) => match.status === 'scheduled' && new Date(match.startsAt).valueOf() >= Date.now())
    .sort((a, b) => new Date(a.startsAt) - new Date(b.startsAt))[0];
  document.querySelector('#home-next-match').innerHTML = upcoming
    ? `<b>${escapeHtml(upcoming.home)} <i>×</i> ${escapeHtml(upcoming.away)}</b><p>${escapeHtml(upcoming.sport)} · ${escapeHtml(formatDate(upcoming.startsAt))} · ${escapeHtml(upcoming.time)}</p>`
    : '<p class="field-hint">Nenhuma partida agendada.</p>';
  const latestNews = state.data?.news?.[0];
  document.querySelector('#home-latest-news').innerHTML = latestNews
    ? `<b>${escapeHtml(latestNews.title)}</b><p>${escapeHtml(formatDate(latestNews.published_at))}</p>`
    : '<p class="field-hint">Nenhum comunicado publicado.</p>';
  const activePoll = state.data?.polls?.find((poll) => poll.status === 'open'
    && new Date(poll.starts_at).valueOf() <= Date.now()
    && new Date(poll.ends_at).valueOf() > Date.now());
  document.querySelector('#home-active-poll').innerHTML = activePoll
    ? `<b>${escapeHtml(activePoll.title)}</b><p>${escapeHtml(activePoll.category)} · encerra ${escapeHtml(formatDate(activePoll.ends_at))}</p>`
    : '<p class="field-hint">Nenhuma enquete aberta.</p>';
  const leaders = [...(state.data?.standings || [])].sort((a, b) => (
    b.points - a.points || b.wins - a.wins || b.score_difference - a.score_difference
  ));
  document.querySelector('#home-ranking').innerHTML = leaders.length
    ? leaders.map((item, index) => `<p class="home-rank"><span>${index + 1}. ${escapeHtml(item.class_name)}</span><b>${item.points} pts</b></p>`).join('')
    : '<p class="field-hint">Aguardando resultados oficiais.</p>';
}

function longestWinStreak(matches, classes) {
  let best = { length: 0, className: '' };
  classes.forEach((schoolClass) => {
    let current = 0;
    matches.filter((match) => match.status === 'completed'
      && (match.homeClassId === schoolClass.id || match.awayClassId === schoolClass.id))
      .sort((a, b) => new Date(a.startsAt) - new Date(b.startsAt))
      .forEach((match) => {
        const home = match.homeClassId === schoolClass.id;
        const won = home ? match.homeScore > match.awayScore : match.awayScore > match.homeScore;
        current = won ? current + 1 : 0;
        if (current > best.length) best = { length: current, className: schoolClass.name };
      });
  });
  return best;
}

function renderIndividualHighlights() {
  const totals = new Map();
  (state.data?.athleteStats || []).forEach((entry) => {
    if (entry.matches?.status !== 'completed') return;
    const athlete = entry.athletes;
    const label = entry.matches.modalities?.score_label || 'pontos';
    const key = `${athlete?.id}:${label}`;
    const current = totals.get(key) || {
      name: athlete?.name || 'Atleta',
      className: athlete?.teams?.school_classes?.name || '',
      label,
      count: 0,
    };
    current.count += Number(entry.score_count);
    totals.set(key, current);
  });
  const leaders = [...totals.values()].sort((a, b) => b.count - a.count).slice(0, 5);
  document.querySelector('#individual-highlights').innerHTML = leaders.length
    ? `<div class="subsection-heading"><h3>Destaques individuais</h3><span>Pontuação registrada pela organização</span></div>
       <div class="leaders-grid">${leaders.map((item, index) => `
         <article class="leader-card"><span class="rank-number">${index + 1}</span><b>${escapeHtml(item.name)}</b>
           <span>${escapeHtml(item.className)} · ${escapeHtml(item.label)}</span><strong>${item.count}</strong>
         </article>`).join('')}</div>`
    : '';
}

function renderAdminMatchList() {
  const container = document.querySelector('#match-admin-list');
  container.innerHTML = (state.data?.matches || []).map((match) => `
    <div class="admin-list-row"><span><b>${escapeHtml(match.home)} x ${escapeHtml(match.away)}</b><small>${escapeHtml(match.sport)} · ${escapeHtml(formatDate(match.startsAt))} · ${escapeHtml(match.status)}</small></span>
      ${match.status === 'scheduled' ? `<button type="button" class="text-link danger-link" data-match-cancel="${escapeHtml(match.id)}">Cancelar</button>` : ''}
    </div>`).join('');
}

function renderAthleteAdminList() {
  const container = document.querySelector('#athlete-admin-list');
  if (!container) return;
  container.innerHTML = (state.data?.athletes || []).map((athlete) => `
    <div class="admin-list-row"><span>${escapeHtml(athlete.name)}<small>${escapeHtml(athlete.teams?.school_classes?.name || '')} · ${escapeHtml(athlete.teams?.name || '')}</small></span>
      <button type="button" class="text-link danger-link" data-athlete-deactivate="${escapeHtml(athlete.id)}">Desativar</button>
    </div>`).join('');
}

function renderProfiles() {
  const container = document.querySelector('#profile-admin-list');
  container.innerHTML = (state.admin?.profiles || []).map((person) => `
    <form class="profile-admin-row" data-profile-id="${escapeHtml(person.id)}">
      <b>${escapeHtml(person.display_name)}</b>
      <select name="role" aria-label="Permissão de ${escapeHtml(person.display_name)}">
        <option value="student" ${person.role === 'student' ? 'selected' : ''}>Estudante</option>
        <option value="admin" ${person.role === 'admin' ? 'selected' : ''}>Administrador</option>
      </select>
      <select name="class_id" aria-label="Turma de ${escapeHtml(person.display_name)}">
        <option value="">Sem turma</option>${classOptions().map((option) => `<option value="${escapeHtml(option.value)}" ${person.class_id === option.value ? 'selected' : ''}>${escapeHtml(option.label)}</option>`).join('')}
      </select>
      <label class="checkbox-label"><input name="active" type="checkbox" ${person.active ? 'checked' : ''}> Ativa</label>
      <button class="button button-light" type="submit">Salvar</button><p class="form-feedback" aria-live="polite"></p>
    </form>`).join('');
}

async function refreshCompetition({ showErrors = true } = {}) {
  if (!supabase?.configured()) {
    pageStatus.textContent = 'Banco de dados não conectado. Configure a URL e a chave publicável em js/supabase-config.js para publicar e sincronizar dados.';
    document.querySelector('#ticker-message').textContent = 'As informações oficiais serão exibidas após a conexão com o banco de dados.';
    showUnavailableContent();
    return;
  }
  try {
    const [data, profile] = await Promise.all([supabase.loadCompetition(), supabase.profile()]);
    state.data = data;
    state.profile = profile;
    state.activity = profile ? await supabase.loadMyActivity() : { votes: [], predictions: [] };
    if (profile?.role === 'admin' && profile.active) state.admin = await supabase.loadAdminData();
    else state.admin = null;
    renderAll();
    state.loadedAt = Date.now();
    pageStatus.textContent = profile?.role === 'admin' && profile.active
      ? `Conectado · administrador ${profile.display_name}`
      : profile ? `Conectado · ${profile.display_name}` : 'Conectado ao banco de dados do campeonato.';
  } catch (error) {
    console.error('Não foi possível carregar os dados oficiais do campeonato.', error);
    if (!state.data) showUnavailableContent();
    if (showErrors) pageStatus.textContent = `Não foi possível carregar os dados: ${error.message}`;
  }
}

function renderAll() {
  const data = state.data;
  if (!data) return;
  const settings = data.settings;
  if (settings) {
    document.title = `${settings.event_name} | ${settings.school_name}`;
    document.querySelector('#event-name').innerHTML = `${escapeHtml(settings.event_name).replace(/ 2026$/, '')}<br><span>2026.</span>`;
    document.querySelector('#school-name').textContent = settings.school_name.toLocaleUpperCase('pt-BR');
    document.querySelector('#event-tagline').textContent = settings.tagline;
    document.querySelector('#ticker-message').textContent = `${settings.school_name} · ${settings.event_name} · Comunicados oficiais da organização.`;
    document.querySelector('#settings-event').value = settings.event_name;
    document.querySelector('#settings-school').value = settings.school_name;
    document.querySelector('#settings-tagline').value = settings.tagline;
    document.querySelector('#settings-start').value = settings.starts_at ? formatDateTimeInput(settings.starts_at) : '';
    renderCountdown(settings.starts_at);
  }
  renderTeams();
  renderStandings();
  renderSchedule();
  renderNews();
  renderPolls();
  renderGallery();
  renderSpotlights();
  renderWall();
  renderStatistics();
  updateSelectOptions();
  renderAthleteAdminList();
  renderAthleteScoreAdminList();
  renderAdminMatchList();
  renderProfiles();
  renderAdminInterface();
  renderPredictionResults();
}

function showUnavailableContent() {
  const classes = ['1º ano EM', '2º ano A', '2º ano B'];
  document.querySelector('#team-list').innerHTML = classes.map((name, index) => `
    <article class="team-card" style="--team-color:${['#ff7a35', '#426de0', '#8a62c7'][index]}">
      <div class="team-card-top"><div class="team-crest">${escapeHtml(initials(name))}</div><div><span class="eyebrow">COLÉGIO SINERGE · 2026</span><h3>${escapeHtml(name)}</h3></div></div>
      <p class="team-slogan team-unset">Identidade, elenco e modalidades aguardam cadastro.</p>
    </article>`).join('');
  document.querySelector('#team-empty').hidden = true;
  document.querySelector('#standings-list').closest('.table-wrap').hidden = true;
  [
    '#upcoming-empty', '#completed-empty', '#news-empty', '#poll-empty',
    '#gallery-empty', '#spotlight-empty', '#wall-empty', '#statistics-empty',
  ].forEach((selector) => { document.querySelector(selector).hidden = false; });
  document.querySelector('#standings-empty').hidden = false;
  ['#stat-games', '#stat-points', '#stat-athletes', '#stat-votes'].forEach((selector) => {
    document.querySelector(selector).textContent = '—';
  });
  document.querySelector('#statistics-list').replaceChildren();
  document.querySelector('#home-next-match').innerHTML = '<p class="field-hint">Conecte o banco para consultar a agenda oficial.</p>';
  document.querySelector('#home-latest-news').innerHTML = '<p class="field-hint">Conecte o banco para consultar os comunicados.</p>';
  document.querySelector('#home-active-poll').innerHTML = '<p class="field-hint">Conecte o banco para consultar votações.</p>';
  document.querySelector('#home-ranking').innerHTML = '<p class="field-hint">Conecte o banco para consultar resultados.</p>';
}

function renderCountdown(startsAt) {
  const countdown = document.querySelector('#countdown');
  if (!startsAt) {
    countdown.textContent = 'A data de início será informada pela organização.';
    return;
  }
  const remaining = new Date(startsAt).valueOf() - Date.now();
  if (!Number.isFinite(remaining)) {
    countdown.textContent = 'Data de início inválida; verifique as configurações.';
    return;
  }
  if (remaining <= 0) {
    countdown.textContent = 'O Interclasse já começou. Acompanhe a programação!';
    return;
  }
  const days = Math.floor(remaining / 86400000);
  const hours = Math.floor(remaining % 86400000 / 3600000);
  const minutes = Math.floor(remaining % 3600000 / 60000);
  countdown.textContent = `Faltam ${days} dias, ${hours} horas e ${minutes} minutos para o início.`;
}

function renderAdminInterface() {
  const signedIn = Boolean(state.profile);
  const isAdmin = state.profile?.role === 'admin' && state.profile.active;
  const authCard = document.querySelector('#auth-tools');
  authCard.classList.toggle('is-signed-in', signedIn);
  document.querySelector('#student-signup-card').hidden = signedIn;
  authForm.querySelectorAll('input,button[type="submit"]').forEach((input) => { input.disabled = signedIn; });
  signOutButton.hidden = !signedIn;
  adminWorkspace.hidden = !isAdmin;
  document.querySelector('#account-role').textContent = isAdmin ? 'ADMINISTRADOR' : state.profile ? 'ESTUDANTE' : 'VISITANTE';
  document.querySelector('#account-feedback').textContent = state.profile
    ? `${state.profile.display_name}${state.profile.class_id ? ` · ${state.data.classes.find((item) => item.id === state.profile.class_id)?.name || ''}` : ''}`
    : '';
  document.querySelector('#admin-game-count').textContent = String(state.data?.stats?.completed_matches || 0);
  if (state.admin) {
    renderProfiles();
    renderAdminPolls();
    renderWall();
    renderGallery();
    renderSpotlights();
  }
  renderAccountPredictionOptions();
}

function renderPollResultsFeedback(id, message, type) {
  const form = pollList.querySelector(`[data-poll-id="${CSS.escape(id)}"]`);
  setFeedback(form?.querySelector('.form-feedback'), message, type);
}

async function reloadAfterAction() {
  await refreshCompetition();
}

function reportError(element, error) {
  console.error(error);
  setFeedback(element, error.message || 'Não foi possível concluir a operação.', 'error');
}

async function renderPredictionResults() {
  const container = document.querySelector('#prediction-results');
  const matches = (state.data?.matches || []).filter((item) => item.status === 'completed');
  if (!matches.length) {
    container.replaceChildren();
    return;
  }
  const results = await Promise.all(matches.map(async (match) => {
    try { return { match, entries: await supabase.getPredictionResults(match.id) }; }
    catch (error) { return { match, error }; }
  }));
  container.innerHTML = results.map(({ match, entries, error }) => `
    <article class="prediction-result-card">
      <b>${escapeHtml(match.home)} ${match.homeScore}–${match.awayScore} ${escapeHtml(match.away)}</b>
      ${error
    ? `<p>${escapeHtml(error.message)}</p>`
    : `<span>${entries.reduce((total, item) => total + Number(item.correct_count), 0)} palpites corretos · ${entries.reduce((total, item) => total + Number(item.prediction_count), 0)} participantes</span>`}
    </article>`).join('');
}

function renderAccountPredictionOptions() {
  const isStudent = state.profile?.role === 'student' && state.profile.active && state.profile.class_id;
  const sentMatchIds = state.activity.predictions.map((item) => item.match_id);
  const form = document.querySelector('#prediction-form');
  form.querySelectorAll('select,button').forEach((element) => { element.disabled = !isStudent; });
  if (!isStudent) {
    predictionMatch.innerHTML = '<option value="">Entre com uma conta de estudante para palpitar</option>';
    predictionTeam.innerHTML = '<option value="">Palpites de estudantes autenticados</option>';
    return;
  }
  if (predictionMatch.value && sentMatchIds.includes(predictionMatch.value)) {
    setFeedback(document.querySelector('#prediction-feedback'), 'Você já enviou um palpite para esta partida.', 'success');
    predictionMatch.disabled = true;
    predictionTeam.disabled = true;
    form.querySelector('button').disabled = true;
    return;
  }
  predictionMatch.disabled = false;
  updatePredictionTeams();
  form.querySelector('button').disabled = false;
}

function refreshIfRecent() {
  if (Date.now() - state.loadedAt < 30000) return;
  refreshCompetition({ showErrors: false });
}

menuToggle.addEventListener('click', () => {
  const isOpen = menuToggle.getAttribute('aria-expanded') === 'true';
  menuToggle.setAttribute('aria-expanded', String(!isOpen));
  menuToggle.setAttribute('aria-label', isOpen ? 'Abrir menu' : 'Fechar menu');
  mainNav.classList.toggle('is-open', !isOpen);
});

mainNav.querySelectorAll('a').forEach((link) => link.addEventListener('click', () => {
  menuToggle.setAttribute('aria-expanded', 'false');
  menuToggle.setAttribute('aria-label', 'Abrir menu');
  mainNav.classList.remove('is-open');
}));

document.addEventListener('keydown', (event) => {
  if (event.key !== 'Escape' || menuToggle.getAttribute('aria-expanded') !== 'true') return;
  menuToggle.setAttribute('aria-expanded', 'false');
  menuToggle.setAttribute('aria-label', 'Abrir menu');
  mainNav.classList.remove('is-open');
  menuToggle.focus();
});

document.querySelector('#gallery-category').addEventListener('change', renderGallery);
document.querySelector('#gallery-class').addEventListener('change', renderGallery);
document.querySelector('#gallery-modality').addEventListener('change', renderGallery);
document.querySelector('#gallery-day').addEventListener('change', renderGallery);
predictionMatch.addEventListener('change', updatePredictionTeams);
document.querySelector('#athlete-score-match').addEventListener('change', renderAthleteScoreOptions);
document.querySelector('#team-list').addEventListener('click', (event) => {
  const link = event.target.closest('[data-team-gallery]');
  if (!link) return;
  document.querySelector('#gallery-class').value = link.dataset.teamGallery;
  renderGallery();
});

authForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const data = new FormData(authForm);
  try {
    const profile = await supabase.signIn(data.get('email'), data.get('password'));
    if (!profile) throw new Error('A conta autenticou, mas o perfil não foi encontrado.');
    await refreshCompetition();
    setFeedback(document.querySelector('#auth-feedback'), 'Acesso realizado.', 'success');
  } catch (error) { reportError(document.querySelector('#auth-feedback'), error); }
});

signupForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const data = new FormData(signupForm);
  try {
    const result = await supabase.signUp({
      displayName: String(data.get('displayName')).trim(),
      classId: data.get('classId'),
      email: data.get('email'),
      password: data.get('password'),
    });
    if (result.access_token) await refreshCompetition();
    setFeedback(
      document.querySelector('#signup-feedback'),
      result.access_token ? 'Conta criada e conectada.' : 'Conta criada. Confira seu e-mail para confirmar o cadastro e depois entre.',
      'success',
    );
    if (!result.access_token) signupForm.reset();
  } catch (error) { reportError(document.querySelector('#signup-feedback'), error); }
});

signOutButton.addEventListener('click', async () => {
  try {
    await supabase.signOut();
    state.profile = null;
    state.activity = { votes: [], predictions: [] };
    state.admin = null;
    await refreshCompetition();
  } catch (error) { reportError(document.querySelector('#auth-feedback'), error); }
});

document.querySelector('#prediction-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  if (!form.reportValidity()) return;
  const feedback = document.querySelector('#prediction-feedback');
  try {
    await supabase.castPrediction(predictionMatch.value, predictionTeam.value);
    setFeedback(feedback, 'Palpite registrado. Você terá uma tentativa por partida.', 'success');
    await reloadAfterAction();
  } catch (error) { reportError(feedback, error); }
});

pollList.addEventListener('submit', async (event) => {
  const form = event.target.closest('.poll-vote-form');
  if (!form) return;
  event.preventDefault();
  if (!form.reportValidity()) return;
  const candidateId = new FormData(form).get('candidateId');
  const pollId = form.dataset.pollId;
  form.querySelector('button').disabled = true;
  try {
    await supabase.castVote(pollId, candidateId);
    setFeedback(form.querySelector('.form-feedback'), 'Voto registrado.', 'success');
    await reloadAfterAction();
  } catch (error) {
    form.querySelector('button').disabled = false;
    renderPollResultsFeedback(pollId, error.message, 'error');
  }
});

document.querySelector('#wall-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  if (!form.reportValidity()) return;
  try {
    await supabase.submitWallMessage(document.querySelector('#wall-message').value.trim());
    form.reset();
    setFeedback(document.querySelector('#wall-feedback'), 'Mensagem enviada e aguardando moderação.', 'success');
    await reloadAfterAction();
  } catch (error) { reportError(document.querySelector('#wall-feedback'), error); }
});

document.querySelector('#settings-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  if (!form.reportValidity()) return;
  const values = Object.fromEntries(new FormData(form));
  try {
    await supabase.saveSettings({
      event_name: values.event_name.trim(),
      school_name: values.school_name.trim(),
      tagline: values.tagline.trim(),
      starts_at: values.starts_at ? new Date(values.starts_at).toISOString() : null,
    });
    setFeedback(document.querySelector('#settings-feedback'), 'Configurações salvas.', 'success');
    await reloadAfterAction();
  } catch (error) { reportError(document.querySelector('#settings-feedback'), error); }
});

document.querySelector('#team-settings-list').addEventListener('submit', async (event) => {
  const form = event.target.closest('.team-settings-form');
  if (!form) return;
  event.preventDefault();
  const values = Object.fromEntries(new FormData(form));
  const feedback = form.querySelector('.form-feedback');
  try {
    if (values.crest.size) {
      await supabase.uploadCrest(form.dataset.classId, values.crest);
    }
    await supabase.saveBranding(form.dataset.classId, {
      display_color: values.display_color,
      slogan: values.slogan.trim(),
      war_cry: values.war_cry.trim(),
    });
    setFeedback(feedback, 'Identidade da turma salva.', 'success');
    await reloadAfterAction();
  } catch (error) { reportError(feedback, error); }
});

document.querySelector('#modality-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  if (!form.reportValidity()) return;
  const values = Object.fromEntries(new FormData(form));
  try {
    await supabase.createModality({
      name: values.name.trim(), score_label: values.score_label.trim(),
      points_win: Number(values.points_win), points_draw: Number(values.points_draw),
      points_loss: Number(values.points_loss),
    });
    form.reset();
    setFeedback(document.querySelector('#modality-feedback'), 'Modalidade cadastrada.', 'success');
    await reloadAfterAction();
  } catch (error) { reportError(document.querySelector('#modality-feedback'), error); }
});

document.querySelector('#athlete-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  if (!form.reportValidity()) return;
  const values = Object.fromEntries(new FormData(form));
  try {
    await supabase.createAthlete({
      classId: values.classId, modalityId: values.modalityId,
      name: values.name.trim(), shirtNumber: values.shirtNumber,
    });
    form.reset();
    setFeedback(document.querySelector('#athlete-feedback'), 'Atleta cadastrado.', 'success');
    await reloadAfterAction();
  } catch (error) { reportError(document.querySelector('#athlete-feedback'), error); }
});

document.querySelector('#match-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  if (!form.reportValidity()) return;
  const values = Object.fromEntries(new FormData(form));
  try {
    await supabase.createMatch({
      date: values.date, time: values.time, duration: values.duration,
      venue: values.venue.trim(), modalityId: values.modalityId,
      homeClassId: values.homeClassId, awayClassId: values.awayClassId,
    });
    form.reset();
    setFeedback(document.querySelector('#match-feedback'), 'Partida agendada.', 'success');
    await reloadAfterAction();
  } catch (error) { reportError(document.querySelector('#match-feedback'), error); }
});

document.querySelector('#score-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  if (!form.reportValidity()) return;
  const values = Object.fromEntries(new FormData(form));
  const match = state.data?.matches.find((item) => item.id === values.matchId);
  if (!match) {
    setFeedback(document.querySelector('#score-feedback'), 'Selecione uma partida cadastrada.', 'error');
    return;
  }
  const scores = [Number(values.homeScore), Number(values.awayScore)];
  if (!scores.every((value) => Number.isInteger(value) && value >= 0 && value <= 999)) {
    setFeedback(document.querySelector('#score-feedback'), 'Informe dois números inteiros entre 0 e 999.', 'error');
    return;
  }
  if (match.status === 'completed' && !window.confirm(`O placar atual é ${match.homeScore} x ${match.awayScore}. Deseja substituí-lo por ${scores[0]} x ${scores[1]}?`)) return;
  try {
    await supabase.saveResult(values.matchId, scores[0], scores[1]);
    form.reset();
    setFeedback(document.querySelector('#score-feedback'), 'Resultado salvo e classificação atualizada.', 'success');
    await reloadAfterAction();
  } catch (error) { reportError(document.querySelector('#score-feedback'), error); }
});

document.querySelector('#score-match').addEventListener('change', (event) => {
  const match = state.data?.matches.find((item) => item.id === event.currentTarget.value);
  document.querySelector('#score-home').value = match?.status === 'completed' ? match.homeScore : '';
  document.querySelector('#score-away').value = match?.status === 'completed' ? match.awayScore : '';
});

document.querySelector('#athlete-score-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  if (!form.reportValidity()) return;
  const values = Object.fromEntries(new FormData(form));
  const scoreCount = Number(values.scoreCount);
  if (!Number.isInteger(scoreCount) || scoreCount < 0 || scoreCount > 999) {
    setFeedback(document.querySelector('#athlete-score-feedback'), 'Informe um número inteiro entre 0 e 999.', 'error');
    return;
  }
  try {
    await supabase.saveAthleteStat({ ...values, scoreCount });
    setFeedback(document.querySelector('#athlete-score-feedback'), 'Pontuação individual salva.', 'success');
    await reloadAfterAction();
  } catch (error) { reportError(document.querySelector('#athlete-score-feedback'), error); }
});

document.querySelector('#athlete-score-admin-list').addEventListener('click', async (event) => {
  const button = event.target.closest('[data-athlete-stat-delete]');
  if (!button || !window.confirm('Remover esta pontuação individual?')) return;
  try { await supabase.deleteAthleteStat(button.dataset.athleteStatDelete); await reloadAfterAction(); }
  catch (error) { pageStatus.textContent = error.message; }
});

document.querySelector('#match-admin-list').addEventListener('click', async (event) => {
  const button = event.target.closest('[data-match-cancel]');
  if (!button || !window.confirm('Cancelar esta partida?')) return;
  try {
    await supabase.updateMatchStatus(button.dataset.matchCancel, 'cancelled');
    await reloadAfterAction();
  } catch (error) { pageStatus.textContent = error.message; }
});

newsForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  if (!newsForm.reportValidity()) return;
  const values = Object.fromEntries(new FormData(newsForm));
  values.featured = document.querySelector('#news-featured').checked;
  try {
    if (values.id) await supabase.updateNews(values.id, values);
    else await supabase.createNews(values);
    newsForm.reset();
    state.editingNews = null;
    document.querySelector('#news-id').value = '';
    document.querySelector('#news-featured').checked = false;
    document.querySelector('#news-cancel-edit').hidden = true;
    setFeedback(document.querySelector('#news-feedback'), values.id ? 'Comunicado atualizado.' : 'Comunicado publicado.', 'success');
    await reloadAfterAction();
  } catch (error) { reportError(document.querySelector('#news-feedback'), error); }
});

newsCancelEdit.addEventListener('click', () => {
  newsForm.reset();
  document.querySelector('#news-id').value = '';
  newsCancelEdit.hidden = true;
});

document.querySelector('#news-admin-list').addEventListener('click', async (event) => {
  const edit = event.target.closest('[data-news-edit]');
  const remove = event.target.closest('[data-news-delete]');
  if (edit) {
    const item = state.data.news.find((news) => news.id === edit.dataset.newsEdit);
    if (!item) return;
    document.querySelector('#news-id').value = item.id;
    document.querySelector('#news-title').value = item.title;
    document.querySelector('#news-date').value = formatDateInput(item.published_at);
    document.querySelector('#news-content').value = item.content;
    document.querySelector('#news-featured').checked = item.featured;
    newsCancelEdit.hidden = false;
    newsForm.scrollIntoView({ behavior: 'smooth', block: 'center' });
    return;
  }
  if (remove && window.confirm('Remover este comunicado?')) {
    try { await supabase.deleteNews(remove.dataset.newsDelete); await reloadAfterAction(); }
    catch (error) { pageStatus.textContent = error.message; }
  }
});

document.querySelector('#poll-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  if (!form.reportValidity()) return;
  const values = Object.fromEntries(new FormData(form));
  if (new Date(values.endsAt) <= new Date(values.startsAt)) {
    setFeedback(document.querySelector('#poll-feedback'), 'O encerramento deve ser posterior à abertura.', 'error');
    return;
  }
  try {
    await supabase.createPoll(values);
    form.reset();
    setFeedback(document.querySelector('#poll-feedback'), 'Enquete criada. Adicione opções e depois abra a votação.', 'success');
    await reloadAfterAction();
  } catch (error) { reportError(document.querySelector('#poll-feedback'), error); }
});

document.querySelector('#candidate-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  if (!form.reportValidity()) return;
  const values = Object.fromEntries(new FormData(form));
  try {
    await supabase.addPollOption(values.pollId, values.label.trim());
    form.reset();
    setFeedback(document.querySelector('#candidate-feedback'), 'Opção adicionada.', 'success');
    await reloadAfterAction();
  } catch (error) { reportError(document.querySelector('#candidate-feedback'), error); }
});

document.querySelector('#poll-admin-list').addEventListener('click', async (event) => {
  const open = event.target.closest('[data-poll-open]');
  const close = event.target.closest('[data-poll-close]');
  const button = open || close;
  if (!button) return;
  const poll = state.admin?.allPolls.find((item) => item.id === button.dataset.pollOpen || item.id === button.dataset.pollClose);
  if (open && (!poll || !state.data.polls.some((item) => item.id === poll.id && item.candidates.length > 0))) {
    pageStatus.textContent = 'Adicione ao menos uma opção antes de abrir a enquete.';
    return;
  }
  try {
    await supabase.updatePollStatus(button.dataset.pollOpen || button.dataset.pollClose, open ? 'open' : 'closed');
    await reloadAfterAction();
  } catch (error) { pageStatus.textContent = error.message; }
});

document.querySelector('#media-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  if (!form.reportValidity()) return;
  const values = Object.fromEntries(new FormData(form));
  const file = document.querySelector('#media-file').files[0];
  try {
    await supabase.createMedia({
      ...values, file, consent: document.querySelector('#media-consent').checked,
    });
    form.reset();
    setFeedback(document.querySelector('#media-feedback'), 'Mídia publicada na galeria.', 'success');
    await reloadAfterAction();
  } catch (error) { reportError(document.querySelector('#media-feedback'), error); }
});

document.querySelector('#media-admin-list').addEventListener('click', async (event) => {
  const button = event.target.closest('[data-media-delete]');
  if (!button || !window.confirm('Remover esta mídia da galeria?')) return;
  try {
    await supabase.deleteMedia(button.dataset.mediaDelete, button.dataset.storagePath);
    await reloadAfterAction();
  } catch (error) { pageStatus.textContent = error.message; }
});

document.querySelector('#spotlight-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  if (!form.reportValidity()) return;
  const values = Object.fromEntries(new FormData(form));
  try {
    await supabase.createSpotlight(values);
    form.reset();
    setFeedback(document.querySelector('#spotlight-feedback'), 'Destaque publicado.', 'success');
    await reloadAfterAction();
  } catch (error) { reportError(document.querySelector('#spotlight-feedback'), error); }
});

document.querySelector('#spotlight-admin-list').addEventListener('click', async (event) => {
  const button = event.target.closest('[data-spotlight-delete]');
  if (!button || !window.confirm('Remover este destaque?')) return;
  try {
    await supabase.deleteSpotlight(button.dataset.spotlightDelete);
    await reloadAfterAction();
  } catch (error) { pageStatus.textContent = error.message; }
});

document.querySelector('#wall-admin-list').addEventListener('click', async (event) => {
  const button = event.target.closest('[data-wall-id]');
  if (!button) return;
  try {
    await supabase.moderateWallMessage(button.dataset.wallId, button.dataset.wallStatus);
    await reloadAfterAction();
  } catch (error) { pageStatus.textContent = error.message; }
});

document.querySelector('#profile-admin-list').addEventListener('submit', async (event) => {
  const form = event.target.closest('[data-profile-id]');
  if (!form) return;
  event.preventDefault();
  const values = Object.fromEntries(new FormData(form));
  values.active = new FormData(form).has('active');
  values.class_id = values.class_id || null;
  try {
    await supabase.updateProfile(form.dataset.profileId, values);
    await reloadAfterAction();
  } catch (error) { reportError(form.querySelector('.form-feedback'), error); }
});

document.querySelector('#athlete-admin-list').addEventListener('click', async (event) => {
  const button = event.target.closest('[data-athlete-deactivate]');
  if (!button) return;
  try {
    await supabase.updateAthlete(button.dataset.athleteDeactivate, false);
    await reloadAfterAction();
  } catch (error) { pageStatus.textContent = error.message; }
});

window.addEventListener('focus', refreshIfRecent);
document.addEventListener('visibilitychange', () => {
  if (!document.hidden) refreshIfRecent();
});
window.setInterval(() => {
  if (!document.hidden) refreshCompetition({ showErrors: false });
}, 60000);

refreshCompetition();
