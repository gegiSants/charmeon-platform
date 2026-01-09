# 🚀 Deploy no Vercel - Passo a Passo

## 1. Conectar Repositório

No Vercel:
- Clique em "Import Git Repository"
- Conecte com GitHub/GitLab/Bitbucket
- Selecione o repositório `studio-ingrid-leandro-booking`

## 2. Configurar Projeto

O Vercel vai detectar automaticamente:
- **Framework Preset:** Vite
- **Build Command:** `npm run build`
- **Output Directory:** `dist`
- **Install Command:** `npm install`

✅ **Não precisa mudar nada!** O `vercel.json` já está configurado.

## 3. ⚠️ IMPORTANTE: Variáveis de Ambiente

**ANTES de fazer o deploy**, configure as variáveis de ambiente:

No Vercel, vá em **Settings → Environment Variables** e adicione:

```
VITE_SUPABASE_URL=https://qxnjfsqypjyzuwqwowpb.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_LXCDMFFeyxsA87nVy3RY8g_8gWotU8Q
```

**Importante:**
- ✅ Marque para **Production**, **Preview** e **Development**
- ✅ Clique em **Save**

## 4. Fazer Deploy

1. Clique em **Deploy**
2. Aguarde o build (2-3 minutos)
3. Quando terminar, você terá uma URL tipo: `seu-projeto.vercel.app`

## 5. Testar

1. Acesse a URL do Vercel
2. Faça um agendamento de teste
3. Vá para pagamento
4. Verifique se o QR Code PIX aparece

## 🔧 Se der erro no build

Verifique:
- ✅ Variáveis de ambiente estão configuradas
- ✅ Repositório está conectado corretamente
- ✅ Build Command está correto: `npm run build`

## 📝 Próximos Passos

Depois do deploy:
1. Teste o fluxo completo
2. Configure token de **produção** do Mercado Pago no Supabase
3. Teste pagamento real

