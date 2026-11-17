# ✨ Hub de Prompts

Um lugar para guardar, organizar e copiar seus prompts de IA. Os prompts ficam salvos num banco de dados na nuvem ([Supabase](https://supabase.com), plano gratuito), então aparecem em qualquer aparelho em que você entrar, sem precisar de backup.

## Funções

- Login com e-mail e senha (com "Esqueci a senha" por e-mail)
- Prompts salvos na nuvem: computador, celular, qualquer navegador
- Título, categoria e tags; busca (atalho `/`), favoritos ⭐ e ordenação
- Variáveis `{{assim}}`, preenchidas na hora de copiar
- Copiar com um clique, duplicar, editar e excluir
- Exportar e importar `.json` (opcional, para cópia extra)

## Arquivos

```
index.html     → tela de login (página inicial)
prompts.html   → o hub
style.css      → visual do hub
login.css      → visual do login
config.js      → ⚙️ endereço e chave pública do Supabase
auth.js        → login
login.js       → tela de login
app.js         → lógica do hub e conversa com o banco
setup.sql      → cria a tabela e as regras de segurança no banco
```

## 1. Criar o banco (Supabase) — uns 5 minutos

1. Entre em [supabase.com](https://supabase.com), crie uma conta e clique em **New project**. Escolha um nome, uma senha para o banco (guarde, mas o site não usa) e a região **South America (São Paulo)**.
2. Quando o projeto terminar de criar, abra **SQL Editor → New query**, cole todo o conteúdo de `setup.sql` e clique em **Run**. Deve aparecer "Success".
3. Vá em **Project Settings → Data API** (ou **API**) e copie a **Project URL** (algo como `https://abcdefgh.supabase.co`). Depois, em **Project Settings → API Keys**, copie a chave **publishable** (começa com `sb_publishable_`) ou, se aparecer, a **anon public**.
4. Abra `config.js` e cole os dois no lugar de `COLE_AQUI_...`.

> A chave **publishable / anon** pode ficar pública no site: as regras do `setup.sql` garantem que cada pessoa só vê os próprios prompts. **Nunca** coloque a chave `secret` / `service_role` no site.

## 2. Publicar no GitHub Pages

1. Crie um repositório no GitHub (ex.: `hub-de-prompts`).
2. *Add file → Upload files*: envie **todo o conteúdo desta pasta** e clique em *Commit changes*.
3. **Settings → Pages** → *Deploy from a branch* → branch **main**, pasta **/ (root)** → *Save*.
4. Em 1 ou 2 minutos o site estará em `https://SEU-USUARIO.github.io/hub-de-prompts/`.

## 3. Ajustes de login no Supabase

Em **Authentication → URL Configuration**:
- **Site URL**: o endereço do seu site no GitHub Pages.
- **Redirect URLs**: adicione o mesmo endereço (é para onde vão os links de confirmação e de "esqueci a senha").

Depois:
1. Abra o site, clique em **Criar conta** e cadastre seu e-mail. Por padrão o Supabase manda um e-mail de confirmação: clique no link e depois entre.
   (Se preferir pular a confirmação: **Authentication → Sign In / Providers → Email** → desligue *Confirm email*.)
2. **Recomendado:** depois de criar sua conta, desligue novos cadastros em **Authentication → Sign In / Providers → Allow new users to sign up**. Assim ninguém mais cria conta no seu hub.

## Prompts antigos

Se você usava a versão antiga (que salvava só no navegador), ao entrar pela primeira vez **no mesmo navegador e no mesmo endereço** o hub pergunta se quer enviar esses prompts para o banco. Se mudou de endereço (por exemplo, do arquivo no computador para o GitHub Pages), use **Exportar backup** na versão antiga e **Importar backup** na nova.

## Observações

- No plano gratuito, o Supabase **pausa projetos sem uso por 7 dias**. Seus dados não se perdem: é só entrar no painel do Supabase e clicar em *Restore project*.
- Abrir o `index.html` direto do computador (duplo clique) pode não funcionar com o login. Use o site publicado.
