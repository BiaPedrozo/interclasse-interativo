(function () {
  const config = window.INTERCLASSE_SUPABASE_CONFIG || {};
  const baseUrl = String(config.url || '').replace(/\/$/, '');
  const anonKey = String(config.anonKey || '').trim();
  const sessionKey = 'interclasse-supabase-session-v1';
  const bucket = 'gallery';
  const configured = () => Boolean(baseUrl && anonKey);

  function getSession() {
    try { return JSON.parse(sessionStorage.getItem(sessionKey) || 'null'); }
    catch { return null; }
  }

  function setSession(value) {
    if (value) sessionStorage.setItem(sessionKey, JSON.stringify(value));
    else sessionStorage.removeItem(sessionKey);
  }

  function rest(table, query = '') {
    return `/rest/v1/${table}${query ? `?${query}` : ''}`;
  }

  function encodedPath(path) {
    return path.split('/').map(encodeURIComponent).join('/');
  }

  async function send(path, options = {}) {
    const session = getSession();
    const headers = new Headers(options.headers || {});
    headers.set('apikey', anonKey);
    headers.set('Authorization', `Bearer ${session?.access_token || anonKey}`);
    if (options.body && !headers.has('Content-Type') && !(options.body instanceof File)) {
      headers.set('Content-Type', 'application/json');
    }

    return fetch(`${baseUrl}${path}`, { ...options, headers });
  }

  async function request(path, options = {}, canRefresh = true) {
    if (!configured()) throw new Error('Configure a URL e uma chave publicável do Supabase em js/supabase-config.js.');

    let response = await send(path, options);
    if (response.status === 401 && canRefresh && getSession()?.refresh_token) {
      const current = getSession();
      const refresh = await fetch(`${baseUrl}/auth/v1/token?grant_type=refresh_token`, {
        method: 'POST',
        headers: { apikey: anonKey, 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: current.refresh_token }),
      });
      if (refresh.ok) {
        setSession(await refresh.json());
        response = await send(path, options);
      } else {
        setSession(null);
      }
    }

    if (!response.ok) {
      let payload = {};
      try { payload = await response.json(); } catch {}
      throw new Error(payload.message || payload.msg || payload.error_description || `Erro ${response.status} no Supabase.`);
    }
    if (response.status === 204) return null;
    const contentType = response.headers.get('content-type') || '';
    return contentType.includes('application/json') ? response.json() : null;
  }

  async function rows(table, query = '') {
    return request(rest(table, query));
  }

  async function signedUrl(path) {
    const result = await request(`/storage/v1/object/sign/${bucket}/${encodedPath(path)}`, {
      method: 'POST',
      body: JSON.stringify({ expiresIn: 3600 }),
    });
    return result.signedURL.startsWith('http') ? result.signedURL : `${baseUrl}/storage/v1${result.signedURL}`;
  }

  async function profile() {
    const user = getSession()?.user;
    if (!user?.id) return null;
    const result = await rows('profiles', `id=eq.${encodeURIComponent(user.id)}&select=id,display_name,role,active,class_id`);
    return result[0] || null;
  }

  async function requireAdmin() {
    const current = await profile();
    if (!current?.active || current.role !== 'admin') {
      throw new Error('Entre com uma conta administrativa ativa para executar esta ação.');
    }
    return current;
  }

  async function requireStudent() {
    const current = await profile();
    if (!current?.active || current.role !== 'student' || !current.class_id) {
      throw new Error('Entre com uma conta de estudante ativa vinculada a uma turma.');
    }
    return current;
  }

  async function getOrCreate(table, filters, payload) {
    const existing = await rows(table, `${filters}&select=id`);
    if (existing[0]) return existing[0];
    const created = await request(rest(table), {
      method: 'POST',
      headers: { Prefer: 'return=representation' },
      body: JSON.stringify(payload),
    });
    if (!created?.[0]) throw new Error(`Não foi possível criar o registro em ${table}.`);
    return created[0];
  }

  const fileExtension = (file) => ({
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
    'image/avif': 'avif',
    'video/mp4': 'mp4',
    'video/webm': 'webm',
  })[file.type];

  async function uploadFile(file, ownerId) {
    const extension = fileExtension(file);
    if (!extension) throw new Error('Formato não permitido. Use JPG, PNG, WebP, AVIF, MP4 ou WebM.');
    const path = `${ownerId}/${crypto.randomUUID()}.${extension}`;
    await request(`/storage/v1/object/${bucket}/${encodedPath(path)}`, {
      method: 'POST',
      headers: { 'Content-Type': file.type, 'x-upsert': 'false' },
      body: file,
    });
    return path;
  }

  async function removeStoredFile(path) {
    await request(`/storage/v1/object/${bucket}/${encodedPath(path)}`, { method: 'DELETE' });
  }

  async function loadMatches() {
    const select = 'id,starts_at,duration_minutes,venue,status,modalities(id,name),home_team:teams!matches_home_team_id_fkey(id,name,class_id,school_classes(name)),away_team:teams!matches_away_team_id_fkey(id,name,class_id,school_classes(name)),results(id,home_score,away_score)';
    const result = await rows('matches', `select=${encodeURIComponent(select)}&status=neq.cancelled&order=starts_at.asc`);
    return result.map((match) => {
      const start = new Date(match.starts_at);
      const localDate = [start.getFullYear(), String(start.getMonth() + 1).padStart(2, '0'), String(start.getDate()).padStart(2, '0')].join('-');
      const localTime = [String(start.getHours()).padStart(2, '0'), String(start.getMinutes()).padStart(2, '0')].join(':');
      const resultRow = match.results?.[0];
      return {
        id: match.id, date: localDate, time: localTime, startsAt: match.starts_at,
        duration: match.duration_minutes, location: match.venue, status: match.status,
        modalityId: match.modalities?.id, sport: match.modalities?.name || 'Modalidade',
        homeId: match.home_team?.id, home: match.home_team?.school_classes?.name || match.home_team?.name,
        homeClassId: match.home_team?.class_id, awayId: match.away_team?.id,
        away: match.away_team?.school_classes?.name || match.away_team?.name,
        awayClassId: match.away_team?.class_id,
        homeScore: resultRow?.home_score, awayScore: resultRow?.away_score,
      };
    });
  }

  async function loadMedia() {
    const items = await rows('media_items', 'status=eq.published&select=*&order=created_at.desc');
    return Promise.all(items.map(async (item) => ({ ...item, url: await signedUrl(item.storage_path) })));
  }

  async function loadBranding() {
    const select = 'class_id,display_color,slogan,war_cry,crest_path,school_classes(name)';
    const items = await rows('team_branding', `select=${encodeURIComponent(select)}&order=class_id.asc`);
    return Promise.all(items.map(async (item) => ({
      ...item,
      className: item.school_classes.name,
      crestUrl: item.crest_path ? await signedUrl(item.crest_path) : null,
    })));
  }

  window.InterclasseSupabase = {
    configured,
    getSession,
    profile,
    async signIn(email, password) {
      const result = await request('/auth/v1/token?grant_type=password', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
      setSession(result);
      return profile();
    },
    async signUp({ email, password, displayName, classId }) {
      const result = await request('/auth/v1/signup', {
        method: 'POST',
        body: JSON.stringify({
          email,
          password,
          data: { display_name: displayName, class_id: classId },
        }),
      });
      if (result.access_token) setSession(result);
      return result;
    },
    async signOut() {
      if (getSession()?.access_token) await request('/auth/v1/logout', { method: 'POST' });
      setSession(null);
    },
    async loadCompetition() {
      const [
        settings, classes, branding, modalities, teams, athletes, matches,
        news, polls, messages, media, spotlights, standings, stats, athleteStats,
      ] = await Promise.all([
        rows('competition_settings', 'id=eq.1&select=*'),
        rows('school_classes', 'year_label=eq.2026&select=id,name&order=name.asc'),
        loadBranding(),
        rows('modalities', 'select=id,name,score_label,points_win,points_draw,points_loss,active&active=eq.true&order=name.asc'),
        rows('teams', 'select=id,name,class_id,modality_id,school_classes(name),modalities(name)&order=name.asc'),
        rows('athletes', 'select=id,name,shirt_number,team_id,active,teams(id,name,class_id,school_classes(name))&active=eq.true&order=name.asc'),
        loadMatches(),
        rows('news', 'status=eq.published&select=id,title,content,published_at,featured&order=published_at.desc&limit=6'),
        rows('polls', 'select=id,title,category,starts_at,ends_at,status,candidates(id,label,athlete_id,athletes(name))&order=created_at.desc'),
        rows('wall_messages', 'status=eq.published&select=id,message,created_at,school_classes(name)&order=created_at.desc&limit=40'),
        loadMedia(),
        rows('spotlights', 'status=eq.published&select=id,category,title,content,class_id,media_path,created_at,school_classes(name)&order=created_at.desc&limit=30'),
        rows('competition_standings', 'select=class_id,class_name,matches_played,wins,draws,losses,scores_for,scores_against,score_difference,points'),
        request('/rest/v1/rpc/get_competition_stats', { method: 'POST', body: '{}' }),
        rows('athlete_match_stats', 'select=id,match_id,athlete_id,score_count,athletes(id,name,team_id,teams(class_id,school_classes(name))),matches(status,starts_at,modalities(score_label))'),
      ]);
      return {
        settings: settings[0] || null, classes, branding, modalities, teams, athletes,
        matches, news, polls, messages, media,
        spotlights: await Promise.all(spotlights.map(async (item) => ({
          ...item,
          className: item.school_classes?.name,
          mediaUrl: item.media_path ? await signedUrl(item.media_path) : null,
        }))),
        standings, stats: stats?.[0] || null, athleteStats,
      };
    },
    async loadMyActivity() {
      const current = await profile();
      if (!current) return { votes: [], predictions: [] };
      const [votes, predictions] = await Promise.all([
        rows('votes', `student_id=eq.${current.id}&select=poll_id`),
        rows('match_predictions', `student_id=eq.${current.id}&select=match_id`),
      ]);
      return { votes, predictions };
    },
    async getPollResults(pollId) {
      return request('/rest/v1/rpc/get_poll_results', {
        method: 'POST', body: JSON.stringify({ target_poll_id: pollId }),
      });
    },
    async getPredictionResults(matchId) {
      return request('/rest/v1/rpc/get_prediction_results', {
        method: 'POST', body: JSON.stringify({ target_match_id: matchId }),
      });
    },
    async loadAdminData() {
      await requireAdmin();
      const [profiles, allPolls, pendingMessages, allMedia, allSpotlights, news] = await Promise.all([
        rows('profiles', 'select=id,display_name,role,active,class_id,school_classes(name)&order=display_name.asc'),
        rows('polls', 'select=id,title,category,starts_at,ends_at,status&order=created_at.desc'),
        rows('wall_messages', 'status=eq.pending&select=id,message,created_at,author_id,school_classes(name),profiles(display_name)&order=created_at.asc'),
        rows('media_items', 'select=id,storage_path,caption,status,media_type&order=created_at.desc'),
        rows('spotlights', 'select=id,title,category,status&order=created_at.desc'),
        rows('news', 'status=eq.published&select=id,title,content,published_at,featured&order=published_at.desc'),
      ]);
      return { profiles, allPolls, pendingMessages, allMedia, allSpotlights, news };
    },
    async saveSettings(values) {
      await requireAdmin();
      return request(`${rest('competition_settings')}?id=eq.1`, {
        method: 'PATCH',
        headers: { Prefer: 'return=representation' },
        body: JSON.stringify(values),
      });
    },
    async saveBranding(classId, values) {
      await requireAdmin();
      const result = await request(`${rest('team_branding')}?on_conflict=class_id`, {
        method: 'POST',
        headers: { Prefer: 'resolution=merge-duplicates,return=representation' },
        body: JSON.stringify({ class_id: classId, ...values }),
      });
      return result[0];
    },
    async uploadCrest(classId, file) {
      const admin = await requireAdmin();
      if (!file.type.startsWith('image/') || file.size > 5 * 1024 * 1024) {
        throw new Error('O escudo deve ser uma imagem aceita de até 5 MB.');
      }
      const path = await uploadFile(file, admin.id);
      const current = (await rows('team_branding', `class_id=eq.${classId}&select=crest_path`))[0];
      await this.saveBranding(classId, { crest_path: path });
      if (current?.crest_path) await removeStoredFile(current.crest_path);
    },
    async createModality(values) {
      await requireAdmin();
      const result = await request(rest('modalities'), {
        method: 'POST',
        headers: { Prefer: 'return=representation' },
        body: JSON.stringify(values),
      });
      return result[0];
    },
    async createAthlete({ classId, modalityId, name, shirtNumber }) {
      await requireAdmin();
      const team = await getOrCreate(
        'teams',
        `class_id=eq.${encodeURIComponent(classId)}&modality_id=eq.${encodeURIComponent(modalityId)}`,
        { class_id: classId, modality_id: modalityId, name: 'Equipe' },
      );
      const result = await request(rest('athletes'), {
        method: 'POST',
        headers: { Prefer: 'return=representation' },
        body: JSON.stringify({ team_id: team.id, name, shirt_number: shirtNumber || null }),
      });
      return result[0];
    },
    async createMatch({ date, time, duration, venue, modalityId, homeClassId, awayClassId }) {
      const admin = await requireAdmin();
      if (homeClassId === awayClassId) throw new Error('Escolha duas turmas diferentes.');
      const teamFor = async (classId) => getOrCreate(
        'teams',
        `class_id=eq.${encodeURIComponent(classId)}&modality_id=eq.${encodeURIComponent(modalityId)}`,
        { class_id: classId, modality_id: modalityId, name: 'Equipe' },
      );
      const [home, away] = await Promise.all([teamFor(homeClassId), teamFor(awayClassId)]);
      const result = await request(rest('matches'), {
        method: 'POST',
        headers: { Prefer: 'return=representation' },
        body: JSON.stringify({
          modality_id: modalityId,
          home_team_id: home.id,
          away_team_id: away.id,
          starts_at: new Date(`${date}T${time}`).toISOString(),
          duration_minutes: Number(duration),
          venue,
          created_by: admin.id,
        }),
      });
      return result[0];
    },
    async saveResult(matchId, homeScore, awayScore) {
      const admin = await requireAdmin();
      await request(`${rest('results')}?on_conflict=match_id`, {
        method: 'POST',
        headers: { Prefer: 'resolution=merge-duplicates,return=representation' },
        body: JSON.stringify({
          match_id: matchId, home_score: homeScore, away_score: awayScore, updated_by: admin.id,
        }),
      });
    },
    async updateMatchStatus(matchId, status) {
      await requireAdmin();
      return request(`${rest('matches')}?id=eq.${encodeURIComponent(matchId)}`, {
        method: 'PATCH', body: JSON.stringify({ status }),
      });
    },
    async createNews(values) {
      const admin = await requireAdmin();
      const result = await request(rest('news'), {
        method: 'POST', headers: { Prefer: 'return=representation' },
        body: JSON.stringify({
          title: values.title, content: values.content,
          published_at: `${values.date}T12:00:00Z`, featured: values.featured,
          status: 'published', author_id: admin.id,
        }),
      });
      return result[0];
    },
    async updateNews(id, values) {
      await requireAdmin();
      return request(`${rest('news')}?id=eq.${encodeURIComponent(id)}`, {
        method: 'PATCH',
        body: JSON.stringify({
          title: values.title, content: values.content,
          published_at: `${values.date}T12:00:00Z`, featured: values.featured,
        }),
      });
    },
    async deleteNews(id) {
      await requireAdmin();
      return request(`${rest('news')}?id=eq.${encodeURIComponent(id)}`, { method: 'DELETE' });
    },
    async createPoll(values) {
      const admin = await requireAdmin();
      const result = await request(rest('polls'), {
        method: 'POST', headers: { Prefer: 'return=representation' },
        body: JSON.stringify({
          title: values.title,
          category: values.category,
          starts_at: new Date(values.startsAt).toISOString(),
          ends_at: new Date(values.endsAt).toISOString(),
          status: 'draft',
          created_by: admin.id,
        }),
      });
      return result[0];
    },
    async addPollOption(pollId, label) {
      await requireAdmin();
      return request(rest('candidates'), {
        method: 'POST', headers: { Prefer: 'return=representation' },
        body: JSON.stringify({ poll_id: pollId, label }),
      });
    },
    async updatePollStatus(pollId, status) {
      await requireAdmin();
      return request(`${rest('polls')}?id=eq.${encodeURIComponent(pollId)}`, {
        method: 'PATCH', body: JSON.stringify({ status }),
      });
    },
    async castVote(pollId, candidateId) {
      const student = await requireStudent();
      return request(rest('votes'), {
        method: 'POST',
        body: JSON.stringify({ poll_id: pollId, candidate_id: candidateId, student_id: student.id }),
      });
    },
    async castPrediction(matchId, predictedTeamId) {
      const student = await requireStudent();
      return request(rest('match_predictions'), {
        method: 'POST',
        body: JSON.stringify({
          match_id: matchId,
          student_id: student.id,
          predicted_team_id: predictedTeamId || null,
        }),
      });
    },
    async submitWallMessage(message) {
      const student = await requireStudent();
      return request(rest('wall_messages'), {
        method: 'POST',
        body: JSON.stringify({ author_id: student.id, class_id: student.class_id, message }),
      });
    },
    async moderateWallMessage(id, status) {
      await requireAdmin();
      return request(`${rest('wall_messages')}?id=eq.${encodeURIComponent(id)}`, {
        method: 'PATCH', body: JSON.stringify({ status }),
      });
    },
    async createMedia({ file, caption, category, classId, modalityId, matchId, consent }) {
      const admin = await requireAdmin();
      if (!consent) throw new Error('Confirme que as autorizações necessárias para publicação foram obtidas.');
      const isVideo = file.type.startsWith('video/');
      const limit = isVideo ? 50 * 1024 * 1024 : 5 * 1024 * 1024;
      if (file.size > limit) throw new Error(`O arquivo excede o limite de ${isVideo ? '50 MB' : '5 MB'}.`);
      const path = await uploadFile(file, admin.id);
      try {
        await request(rest('media_items'), {
          method: 'POST',
          body: JSON.stringify({
            storage_path: path, media_type: isVideo ? 'video' : 'image', category,
            caption, consent_confirmed: true, class_id: classId || null,
            modality_id: modalityId || null, match_id: matchId || null,
            status: 'published', uploaded_by: admin.id,
          }),
        });
      } catch (error) {
        await removeStoredFile(path);
        throw error;
      }
    },
    async deleteMedia(id, path) {
      await requireAdmin();
      await request(`${rest('media_items')}?id=eq.${encodeURIComponent(id)}`, { method: 'DELETE' });
      await removeStoredFile(path);
    },
    async createSpotlight(values) {
      const admin = await requireAdmin();
      return request(rest('spotlights'), {
        method: 'POST',
        body: JSON.stringify({
          ...values, class_id: values.class_id || null,
          status: 'published', created_by: admin.id,
        }),
      });
    },
    async deleteSpotlight(id) {
      await requireAdmin();
      return request(`${rest('spotlights')}?id=eq.${encodeURIComponent(id)}`, { method: 'DELETE' });
    },
    async updateProfile(id, values) {
      await requireAdmin();
      return request(`${rest('profiles')}?id=eq.${encodeURIComponent(id)}`, {
        method: 'PATCH', body: JSON.stringify(values),
      });
    },
    async updateAthlete(id, active) {
      await requireAdmin();
      return request(`${rest('athletes')}?id=eq.${encodeURIComponent(id)}`, {
        method: 'PATCH', body: JSON.stringify({ active }),
      });
    },
    async saveAthleteStat({ matchId, athleteId, scoreCount }) {
      const admin = await requireAdmin();
      return request(`${rest('athlete_match_stats')}?on_conflict=match_id,athlete_id`, {
        method: 'POST',
        headers: { Prefer: 'resolution=merge-duplicates,return=representation' },
        body: JSON.stringify({
          match_id: matchId, athlete_id: athleteId, score_count: scoreCount, updated_by: admin.id,
        }),
      });
    },
    async deleteAthleteStat(id) {
      await requireAdmin();
      return request(`${rest('athlete_match_stats')}?id=eq.${encodeURIComponent(id)}`, { method: 'DELETE' });
    },
  };
}());
