# 🎨 Guia de Teste de Fontes

Este documento explica como testar diferentes combinações de fontes no sistema sem quebrar nada.

## 📋 Configuração Atual

### Opção 1: Poppins + Inter (ATIVA)
- **Títulos**: Poppins (weight 600)
- **Textos/Botões**: Inter (weight 400)

### Opção 2: Montserrat + Inter (Disponível)
- **Títulos**: Montserrat (weight 600)
- **Textos/Botões**: Inter (weight 400)

## 🔄 Como Trocar as Fontes

### Método 1: Alterar no `tailwind.config.ts`

Edite o arquivo `tailwind.config.ts`:

```typescript
fontFamily: {
  sans: ['Inter', 'Poppins', 'sans-serif'], // Textos e botões
  serif: ['Poppins', 'Montserrat', 'sans-serif'], // Títulos (font-serif)
  // ou para Montserrat:
  // serif: ['Montserrat', 'Poppins', 'sans-serif'],
},
```

### Método 2: Alterar no `src/index.css`

Edite as fontes no `@layer base`:

```css
body {
  font-family: 'Inter', 'Poppins', sans-serif; /* Textos */
}

h1, h2, h3, h4, h5, h6 {
  font-family: 'Poppins', 'Montserrat', sans-serif; /* Títulos */
  font-weight: 600;
}
```

## 🎯 Classes Disponíveis

- `font-serif` - Usado para títulos (atualmente Poppins)
- `font-sans` - Usado para textos (atualmente Inter)
- `font-heading-montserrat` - Classe alternativa para títulos com Montserrat
- `font-body-inter` - Classe alternativa para textos com Inter

## 📝 Onde as Fontes São Usadas

### Títulos (font-serif):
- Headers e títulos principais
- CardTitle components
- h1, h2, h3, h4, h5, h6

### Textos (font-sans):
- Corpo do texto
- Botões
- Inputs
- Labels
- Parágrafos

## ✅ Teste Rápido

1. **Poppins + Inter** (atual):
   - Títulos: Poppins 600
   - Textos: Inter 400

2. **Montserrat + Inter**:
   - Altere `serif` no tailwind.config.ts para `['Montserrat', 'Poppins', 'sans-serif']`
   - Títulos: Montserrat 600
   - Textos: Inter 400

3. **Poppins + Poppins** (tudo igual):
   - Altere `sans` no tailwind.config.ts para `['Poppins', 'sans-serif']`
   - Títulos: Poppins 600
   - Textos: Poppins 400

## 🔍 Verificar Resultado

Após alterar, recarregue a página e verifique:
- Títulos estão com a fonte correta
- Textos estão legíveis
- Botões estão com boa legibilidade
- Mobile está funcionando bem

## ⚠️ Nota

As fontes são carregadas do Google Fonts, então você precisa de internet para testar. Se quiser usar fontes locais, será necessário baixá-las e configurar no projeto.

