# 🔐 Como Verificar Domínio no Resend

## ⚠️ Problema Atual

O sistema está usando o domínio de teste `onboarding@resend.dev`, que **só permite enviar emails para o email da conta** (j-geovanna3@estudante.unisa.br).

Para enviar emails para **clientes reais**, você precisa verificar um domínio próprio no Resend.

---

## 📋 Passo a Passo

### 1. Acessar o Resend

1. Acesse: https://resend.com
2. Faça login na sua conta
3. Vá em **Domains** (ou acesse: https://resend.com/domains)

### 2. Adicionar Domínio

1. Clique em **"Add Domain"** ou **"Add New Domain"**
2. Digite seu domínio (ex: `studioingridleandro.com.br` ou `seu-dominio.com`)
3. Clique em **"Add"**

### 3. Verificar Domínio

O Resend vai mostrar os registros DNS que você precisa adicionar:

1. **Copie os registros DNS** mostrados (geralmente são registros TXT e CNAME)
2. Acesse o painel do seu provedor de domínio (onde você comprou o domínio)
3. Adicione os registros DNS conforme as instruções do Resend
4. Aguarde a propagação (pode levar algumas horas)

### 4. Atualizar no Supabase

Após o domínio ser verificado:

1. Acesse: https://supabase.com/dashboard
2. Selecione seu projeto
3. Vá em **Settings** → **Edge Functions** → **Secrets**
4. Edite o secret `FROM_EMAIL`:
   - **Antes:** `onboarding@resend.dev`
   - **Depois:** `contato@seu-dominio.com` (ou o email que você configurou)
5. Salve

### 5. Testar

1. Envie um email de teste pela página Admin
2. Verifique se o email chega no cliente

---

## 💡 Dica

Se você não tem um domínio próprio, pode:
- Comprar um domínio (ex: no Registro.br, GoDaddy, etc.)
- Usar um subdomínio de um domínio que você já possui

---

## ✅ Após Verificar

Depois de verificar o domínio, você poderá enviar emails para **qualquer endereço de email**, não apenas para o email da conta.

