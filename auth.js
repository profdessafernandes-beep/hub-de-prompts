// Login com Supabase Auth (e-mail + senha). Precisa de js/config.js e do supabase-js carregados antes.
const Auth = (() => {
  const cfg = window.HUB_CONFIG || {};
  const REMEMBER_KEY = 'hubPrompts.remember';
  // Guardado logo no início, antes do supabase-js limpar o endereço do link de "nova senha".
  const wasRecovery = /type=recovery/.test(location.hash);
  const configured = /^https:\/\/.+/.test(cfg.SUPABASE_URL || '') && !/COLE_AQUI/.test(cfg.SUPABASE_ANON_KEY || '');

  // "Manter conectada": sessão no localStorage (fica) ou no sessionStorage (some ao fechar o navegador).
  const remember = () => localStorage.getItem(REMEMBER_KEY) === '1';
  const storage = {
    getItem: k => sessionStorage.getItem(k) ?? localStorage.getItem(k),
    setItem: (k, v) => {
      (remember() ? localStorage : sessionStorage).setItem(k, v);
      (remember() ? sessionStorage : localStorage).removeItem(k);
    },
    removeItem: k => { localStorage.removeItem(k); sessionStorage.removeItem(k); }
  };

  const client = configured && window.supabase
    ? supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY, {
        auth: { storage, persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
      })
    : null;

  const ERROS = [
    [/invalid login credentials/i, 'E-mail ou senha incorretos.'],
    [/email not confirmed/i, 'Confirme seu e-mail antes de entrar (veja sua caixa de entrada).'],
    [/user already registered/i, 'Esse e-mail já tem conta. Use "Entrar".'],
    [/password should be at least/i, 'A senha precisa ter pelo menos 6 caracteres.'],
    [/signups not allowed|signup.*disabled/i, 'Novos cadastros estão desativados neste hub.'],
    [/rate limit|too many/i, 'Muitas tentativas. Espere um pouco e tente de novo.'],
    [/failed to fetch|network/i, 'Sem conexão com o banco. Verifique sua internet.'],
    [/invalid.*email|unable to validate email/i, 'E-mail inválido.']
  ];
  const traduz = e => {
    const m = (e && (e.message || e.error_description)) || String(e);
    const hit = ERROS.find(([re]) => re.test(m));
    return hit ? hit[1] : m;
  };
  const check = ({ data, error }) => { if (error) throw new Error(traduz(error)); return data; };

  return {
    configured, client, traduz, wasRecovery,

    async user() {
      if (!client) return null;
      const { data } = await client.auth.getSession();
      return data.session ? data.session.user : null;
    },

    async requireLogin() {
      const u = await this.user();
      if (!u) { location.replace('index.html'); return new Promise(() => {}); }
      return u;
    },

    async signIn(email, password, keep) {
      localStorage.setItem(REMEMBER_KEY, keep ? '1' : '0');
      return check(await client.auth.signInWithPassword({ email, password }));
    },

    // Retorna true se já entrou; false se o Supabase pediu confirmação por e-mail.
    async signUp(email, password, keep) {
      localStorage.setItem(REMEMBER_KEY, keep ? '1' : '0');
      const data = check(await client.auth.signUp({
        email, password, options: { emailRedirectTo: location.href.split('#')[0].split('?')[0] }
      }));
      return !!data.session;
    },

    async sendReset(email) {
      const back = location.href.split('#')[0].split('?')[0];
      check(await client.auth.resetPasswordForEmail(email, { redirectTo: back }));
    },

    async updatePassword(password) {
      check(await client.auth.updateUser({ password }));
    },

    onRecovery(cb) {
      client && client.auth.onAuthStateChange(ev => { if (ev === 'PASSWORD_RECOVERY') cb(); });
    },

    async logout() {
      if (client) await client.auth.signOut();
      location.replace('index.html');
    }
  };
})();
