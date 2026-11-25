# Deploy do zero: Git → Supabase → Vercel

## 1. Supabase (banco)
1. https://supabase.com → **New project** (anote a senha do banco; região São Paulo é a melhor para o Brasil).
2. **SQL Editor → New query** → cole todo o conteúdo de `supabase/setup.sql` → **Run**.
   Em *Table Editor* devem aparecer: `events`, `gallery_images`, `comments`, `event_registrations`, `supporters` (esta com 2 linhas).
3. **Project Settings → API** e copie:
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` (secreta) → `SUPABASE_SERVICE_ROLE_KEY`

## 2. Git / GitHub
1. Instale o Git: https://git-scm.com/download/win (reabra o terminal depois).
2. Crie um repositório **vazio** no GitHub (ex.: `lycoris-garden-web`), sem README.
3. Na pasta do projeto:
```powershell
git init
git add .
git commit -m "Lycoris Garden: inscrições em eventos e apoiadores"
git branch -M main
git remote add origin https://github.com/SEU_USUARIO/lycoris-garden-web.git
git push -u origin main
```
O `.gitignore` já impede o envio de `node_modules` e arquivos `.env`.

## 3. Vercel
1. https://vercel.com → **Add New → Project** → importe o repositório (framework Next.js é detectado sozinho).
2. Antes de clicar em Deploy, abra **Environment Variables** e cadastre (valores do `.env.example`):
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `ADMIN_PASSWORD` (senha forte, é a do `/admin`)
   - `WEBHOOK_SECRET` (opcional)
3. **Deploy**. Se alterar variáveis depois, faça **Redeploy**.
   Se já existir um projeto Vercel antigo (`lycoris-v2`), conecte este mesmo repositório a ele em *Settings → Git*.

## 4. Teste final
- Abra `/admin`, entre com `ADMIN_PASSWORD` e crie um evento.
- No site, clique em **Quero Participar** e envie uma inscrição.
- Em `/admin → Inscrições` ela deve aparecer; confira também em *Supabase → Table Editor → event_registrations*.
- Em `/admin → Apoiadores`, cadastre um apoiador e veja no rodapé do site.

## Problemas comuns
| Sintoma | Causa |
|---|---|
| Nada é salvo após reiniciar | Faltam as variáveis do Supabase (modo demo em memória) |
| Inscrição dá erro | `SUPABASE_SERVICE_ROLE_KEY` ausente ou SQL não executado |
| Admin diz "Não autorizado" | Sessão expirou (8h); entre novamente |
