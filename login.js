const $ = s => document.querySelector(s);
const err = msg => { $('#err').textContent = msg || ''; };
const ok = msg => { $('#ok').textContent = msg || ''; };
const show = (el, on) => $(el).classList.toggle('hidden', !on);

// modos: login | signup | forgot | newpass
let mode = 'login';
const TEXTOS = {
  login:   { sub: 'Entre para acessar seus prompts', btn: 'Entrar' },
  signup:  { sub: 'Crie sua conta', btn: 'Criar conta' },
  forgot:  { sub: 'Vamos te mandar um link por e-mail para criar uma senha nova', btn: 'Enviar link' },
  newpass: { sub: 'Escolha sua nova senha', btn: 'Salvar nova senha' }
};

function setMode(m) {
  mode = m; err(''); ok('');
  $('#sub').textContent = TEXTOS[m].sub;
  $('#btn').textContent = TEXTOS[m].btn;
  show('#emailWrap', m !== 'newpass');
  show('#passWrap', m !== 'forgot');
  show('#confirmWrap', m === 'signup' || m === 'newpass');
  show('#rememberWrap', m === 'login' || m === 'signup');
  show('#toSignup', m === 'login');
  show('#toForgot', m === 'login');
  show('#toLogin', m !== 'login' && m !== 'newpass');
  $('#passLabel').textContent = m === 'newpass' ? 'Nova senha' : 'Senha';
  $('#pass').autocomplete = m === 'login' ? 'current-password' : 'new-password';
  ($(m === 'newpass' ? '#pass' : '#email')).focus();
}

$('#toSignup').onclick = () => setMode('signup');
$('#toForgot').onclick = () => setMode('forgot');
$('#toLogin').onclick = () => setMode('login');
$('#eye').onclick = () => {
  const t = $('#pass').type === 'password' ? 'text' : 'password';
  $('#pass').type = $('#pass2').type = t;
};

function validaSenha() {
  const p = $('#pass').value;
  if (p.length < 6) throw new Error('A senha precisa ter pelo menos 6 caracteres.');
  if (p !== $('#pass2').value) throw new Error('As senhas não são iguais.');
  return p;
}
function validaEmail() {
  const e = $('#email').value.trim();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e)) throw new Error('Digite um e-mail válido.');
  return e;
}

$('#form').addEventListener('submit', async ev => {
  ev.preventDefault();
  err(''); ok('');
  $('#btn').disabled = true;
  try {
    const keep = $('#remember').checked;
    if (mode === 'login') {
      const email = validaEmail();
      if (!$('#pass').value) throw new Error('Digite sua senha.');
      await Auth.signIn(email, $('#pass').value, keep);
      location.replace('prompts.html');
    } else if (mode === 'signup') {
      const email = validaEmail(); const pass = validaSenha();
      if (await Auth.signUp(email, pass, keep)) location.replace('prompts.html');
      else { setMode('login'); $('#email').value = email; ok('Conta criada! Abra o e-mail de confirmação que enviamos e depois entre aqui.'); }
    } else if (mode === 'forgot') {
      await Auth.sendReset(validaEmail());
      ok('Se esse e-mail tiver conta, o link chega em instantes. Confira também o spam.');
    } else if (mode === 'newpass') {
      await Auth.updatePassword(validaSenha());
      location.replace('prompts.html');
    }
  } catch (e) {
    err(Auth.traduz(e));
  } finally {
    $('#btn').disabled = false;
  }
});

(async () => {
  if (!Auth.configured) {
    $('#btn').disabled = true;
    err('Banco de dados ainda não configurado: preencha config.js (veja o README).');
    return;
  }
  if (!Auth.client) {
    $('#btn').disabled = true;
    err('Não foi possível carregar o Supabase. Verifique sua internet.');
    return;
  }
  let recovering = Auth.wasRecovery;
  Auth.onRecovery(() => { recovering = true; setMode('newpass'); });
  if (recovering) return setMode('newpass');
  if (await Auth.user()) { if (!recovering) location.replace('prompts.html'); return; }
  setMode('login');
})();
