# Setup de produção — passo a passo

Guia para colocar o CharmeOn no ar e tornar o repositório público com segurança.

---

## Fase 1 — Limpar o Git (obrigatório antes de publicar)

O histórico ainda contém `.env` e migrations SQL. Remova antes de tornar o repo público.

### 1.1 Instalar ferramenta

```bash
pip install git-filter-repo
```

### 1.2 Fazer backup

```bash
cd charmeon-platform
git clone . ../charmeon-backup
```

### 1.3 Purgar arquivos sensíveis do histórico

```bash
git filter-repo \
  --path .env \
  --path supabase/migrations \
  --path supabase/storage_policies.sql \
  --invert-paths \
  --force
```

### 1.4 Rotacionar credenciais

No **Supabase Dashboard → Settings → API**:

- Gere nova **anon key**
- Atualize `.env.local` localmente
- Atualize variáveis na Vercel

### 1.5 Force push (somente após backup)

```bash
git push origin main --force
```

> ⚠️ Só faça force push se você é o único usando o repositório ou avisou o time.

---

## Fase 2 — Variáveis de ambiente

### 2.1 Frontend (Vercel ou `.env.local`)

Copie `.env.example` → `.env.local` e preencha:

```
VITE_SUPABASE_URL=
VITE_SUPABASE_PUBLISHABLE_KEY=
VITE_SUPABASE_PROJECT_ID=
```

### 2.2 Edge Functions (Supabase Dashboard → Edge Functions → Secrets)

| Secret | Valor |
|--------|-------|
| `SUPABASE_URL` | URL do projeto |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key |
| `MERCADOPAGO_ACCESS_TOKEN` | Token produção MP |
| `SITE_URL` | `https://www.charmeon.com.br` |
| `ALLOWED_ORIGIN` | `https://www.charmeon.com.br` |
| `CONFIRMATION_TOKEN_SECRET` | `openssl rand -hex 32` |
| `N8N_WEBHOOK_URL` | URL do seu webhook n8n |
| `CRON_SECRET` | `openssl rand -hex 32` |
| `RESEND_API_KEY` | Se usar e-mail |
| `ALLOW_TEST_PAYMENT` | `false` |

---

## Fase 3 — Banco de dados (Supabase Dashboard)

> O schema **não está no repositório público**. Aplique tudo pelo Supabase Dashboard ou CLI local (privado).

### 3.1 Aplicar schema

Se você ainda tem as migrations localmente (pasta `supabase/migrations/`, gitignored):

```bash
# Apenas na sua máquina, com Supabase CLI linkado ao projeto
supabase db push
```

**Alternativa:** Supabase Dashboard → **SQL Editor** → cole e execute os scripts na ordem cronológica dos arquivos de migration locais.

### 3.2 Aplicar políticas de storage

Supabase Dashboard → **SQL Editor** → execute o conteúdo de `supabase/storage_policies.sql` (arquivo local, não versionado).

Ou: Storage → bucket `professional-photos` → Policies → configure leitura pública e escrita só para autenticados admin.

### 3.3 Criar bucket de fotos

Storage → New bucket → `professional-photos` → Public ✅

---

## Fase 4 — Primeiro administrador

### 4.1 Criar usuário

Supabase Dashboard → **Authentication → Users → Add user**

Anote o UUID do usuário criado.

### 4.2 Autorizar como admin

Supabase Dashboard → **SQL Editor**:

Insira o UUID do usuário na tabela `admin_users` (consulte sua migration local de security hardening).

### 4.3 Testar login

Acesse `https://seu-site.com.br/admin/login` com e-mail e senha criados.

---

## Fase 5 — Deploy

### 5.1 Frontend (Vercel)

```bash
npm run build   # testar localmente
git push        # Vercel faz deploy automático
```

Configure as 3 variáveis `VITE_*` no painel da Vercel.

### 5.2 Edge Functions

```bash
supabase functions deploy create-checkout
supabase functions deploy verify-payment-mp
supabase functions deploy send-email-confirmation
supabase functions deploy email-webhook
supabase functions deploy check-upcoming-appointments
# ... demais functions
```

---

## Fase 6 — Cron de e-mails

Supabase Dashboard → **Edge Functions → check-upcoming-appointments → Cron**

Configure para rodar diariamente. Adicione header:

```
x-cron-secret: <valor do CRON_SECRET>
```

---

## Fase 7 — Integração n8n (WhatsApp)

1. Configure workflow n8n para receber POST com dados do agendamento
2. Copie a URL do webhook
3. Salve em `N8N_WEBHOOK_URL` nos secrets do Supabase
4. Teste com `N8N_WEBHOOK_URL=... ./test-webhook-n8n.sh`

Ver [webhook-n8n.md](./webhook-n8n.md) para estrutura do payload.

---

## Fase 8 — Verificação final

| Check | Como verificar |
|-------|----------------|
| `/admin` exige login | Acesse sem login → redireciona para `/admin/login` |
| Agendamento funciona | Fluxo completo em `/agendar` |
| Pagamento PIX | Teste com valor real pequeno |
| Confirmação e-mail | Link com token assinado funciona |
| RLS ativo | Tentativa de SELECT em appointments via anon falha |
| Secrets no Git | `gitleaks detect --source .` sem findings |
| robots.txt | `/admin` bloqueado para crawlers |

---

## Fase 9 — Tornar repositório público

Somente após Fases 1–8:

1. GitHub → Settings → Danger Zone → Change visibility → Public
2. Ative **Secret scanning** e **Dependabot** nas configurações do repo

---

## Manutenção do schema (privado)

Alterações futuras no banco:

1. Desenvolva SQL localmente (pasta `supabase/migrations/`, gitignored)
2. Aplique via `supabase db push` ou SQL Editor
3. Atualize `src/integrations/supabase/types.ts` com `supabase gen types`
4. Documente mudanças conceituais em [arquitetura.md](./arquitetura.md) — **sem colar SQL**
