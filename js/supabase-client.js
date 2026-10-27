(function () {
  const config = window.INTERCLASSE_SUPABASE_CONFIG || {};
  const baseUrl = String(config.url || '').replace(/\/$/, '');
  const anonKey = String(config.anonKey || '').trim();
  const sessionKey = 'interclasse-supabase-session-v1';
  const configured = () => Boolean(baseUrl && anonKey);
  const getSession = () => { try { return JSON.parse(sessionStorage.getItem(sessionKey) || 'null'); } catch { return null; } };
  const setSession = (value) => value ? sessionStorage.setItem(sessionKey, JSON.stringify(value)) : sessionStorage.removeItem(sessionKey);
  const rest = (table, query = '') => `/rest/v1/${table}${query ? `?${query}` : ''}`;

  async function request(path, options = {}) {
    if (!configured()) throw new Error('Configure a anon key em js/supabase-config.js.');
    const session = getSession();
    const headers = new Headers(options.headers || {});
    headers.set('apikey', anonKey);
    headers.set('Authorization', `Bearer ${session?.access_token || anonKey}`);
    if (options.body && !headers.has('Content-Type') && !(options.body instanceof File)) headers.set('Content-Type', 'application/json');
    const response = await fetch(`${baseUrl}${path}`, { ...options, headers });
    if (!response.ok) {
      const payload = await response.json().catch(() => ({}));
      throw new Error(payload.message || payload.msg || payload.error_description || `Erro ${response.status} no Supabase.`);
    }
    return response.status === 204 ? null : response.json();
  }

  async function profile() {
    const current = getSession();
    if (!current?.user?.id) return null;
    const rows = await request(rest('profiles', `id=eq.${encodeURIComponent(current.user.id)}&select=id,display_name,role,active`));
    return rows[0] || null;
  }

  async function requireAdmin() {
    const current = await profile();
    if (!current?.active || current.role !== 'admin') throw new Error('Entre com uma conta administrativa para alterar os dados compartilhados.');
    return current;
  }

  async function getOrCreate(table, filters, payload) {
    const rows = await request(rest(table, `${filters}&select=id`));
    if (rows[0]) return rows[0];
    const created = await request(rest(table), { method: 'POST', headers: { Prefer: 'return=representation' }, body: JSON.stringify(payload) });
    return created[0];
  }

  window.InterclasseSupabase = {
    configured, getSession, profile,
    async signIn(email, password) {
      const result = await request('/auth/v1/token?grant_type=password', { method: 'POST', body: JSON.stringify({ email, password }) });
      setSession(result);
      return profile();
    },
    async signOut() { if (getSession()?.access_token) await request('/auth/v1/logout', { method: 'POST' }); setSession(null); },
    async loadNews() {
      const rows = await request(rest('news', 'status=eq.published&select=id,title,content,published_at,featured&order=published_at.desc'));
      return rows.map((row) => ({ id: row.id, title: row.title, content: row.content, date: row.published_at.slice(0, 10), important: row.featured, demo: false }));
    },
    async createNews(item) {
      const admin = await requireAdmin();
      const rows = await request(rest('news'), { method: 'POST', headers: { Prefer: 'return=representation' }, body: JSON.stringify({ title: item.title, content: item.content, published_at: `${item.date}T12:00:00Z`, featured: item.important, status: 'published', author_id: admin.id }) });
      return rows[0];
    },
    async deleteNews(id) { await requireAdmin(); await request(rest('news', `id=eq.${encodeURIComponent(id)}`), { method: 'DELETE' }); },
    async loadMatches() {
      const select = 'id,starts_at,venue,status,modalities(name),home_team:teams!matches_home_team_id_fkey(name),away_team:teams!matches_away_team_id_fkey(name),results(home_score,away_score)';
      const rows = await request(rest('matches', `select=${encodeURIComponent(select)}&order=starts_at.asc`));
      return rows.map((row) => {
        const date = new Date(row.starts_at); const result = row.results?.[0];
        return { id: row.id, date: date.toLocaleDateString('en-CA'), time: date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', hour12: false }), sport: row.modalities?.name || 'Modalidade', home: row.home_team?.name || 'Equipe 1', away: row.away_team?.name || 'Equipe 2', location: row.venue, status: row.status, homeScore: result?.home_score, awayScore: result?.away_score };
      });
    },
    async createMatch(item) {
      const admin = await requireAdmin();
      const name = encodeURIComponent(item.sport);
      const modality = await getOrCreate('modalities', `name=eq.${name}`, { name: item.sport });
      const teamFor = async (label) => {
        const schoolClass = await getOrCreate('school_classes', `name=eq.${encodeURIComponent(label)}&year_label=eq.Demonstração`, { name: label, year_label: 'Demonstração' });
        return getOrCreate('teams', `class_id=eq.${schoolClass.id}&modality_id=eq.${modality.id}`, { name: label, class_id: schoolClass.id, modality_id: modality.id });
      };
      const home = await teamFor(item.home); const away = await teamFor(item.away);
      if (home.id === away.id) throw new Error('As duas equipes da partida devem ser diferentes.');
      const rows = await request(rest('matches'), { method: 'POST', headers: { Prefer: 'return=representation' }, body: JSON.stringify({ modality_id: modality.id, home_team_id: home.id, away_team_id: away.id, starts_at: new Date(`${item.date}T${item.time}:00`).toISOString(), venue: item.location, created_by: admin.id }) });
      return rows[0];
    },
    async saveResult(matchId, homeScore, awayScore) {
      const admin = await requireAdmin();
      await request(`${rest('results')}?on_conflict=match_id`, { method: 'POST', headers: { Prefer: 'resolution=merge-duplicates,return=representation' }, body: JSON.stringify({ match_id: matchId, home_score: homeScore, away_score: awayScore, updated_by: admin.id }) });
    },
  };
}());
