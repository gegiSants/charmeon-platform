# ⚠️ INSTRUÇÃO IMPORTANTE - Formato do Telefone

## Campo: `client_phone`

### ❌ FORMATO INCORRETO (NÃO USAR):
```
(11) 98765-4321
(11) 99027-8446
11 98765-4321
11-98765-4321
```

### ✅ FORMATO CORRETO (USAR):
```
5511987654321
5511990278446
```

## Regras de Formatação:

1. **Sempre incluir o código do país `55` no início**
2. **Adicionar o DDD (2 dígitos)**
3. **Adicionar o número completo (9 dígitos para celular ou 8 dígitos para fixo)**
4. **Remover TODOS os caracteres especiais:**
   - ❌ Parênteses `()`
   - ❌ Hífens `-`
   - ❌ Espaços ` `
   - ❌ Pontos `.`

## Exemplos de Conversão:

| Formato Original | Formato Correto para Enviar |
|-----------------|----------------------------|
| `(11) 98765-4321` | `5511987654321` |
| `(11) 99027-8446` | `5511990278446` |
| `(21) 99999-8888` | `5521999998888` |
| `(85) 3234-5678` | `558532345678` |
| `11 98765-4321` | `5511987654321` |
| `11987654321` | `5511987654321` |

## Implementação no n8n:

No workflow do n8n, você deve criar uma transformação que:

1. Recebe o telefone no formato original: `(11) 98765-4321`
2. Remove todos os caracteres especiais
3. Adiciona `55` no início se não existir
4. Envia no formato: `5511987654321`

### Exemplo de Expressão (n8n):
```javascript
// Se o telefone já vem formatado como "(11) 98765-4321"
let phone = $json.appointment.client_phone;
// Remove todos os caracteres não numéricos
phone = phone.replace(/\D/g, '');
// Adiciona 55 no início se não começar com 55
if (!phone.startsWith('55')) {
  phone = '55' + phone;
}
return phone;
```

## Payload de Exemplo Corrigido:

```json
{
  "appointment": {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "client_name": "Maria Silva",
    "client_phone": "5511987654321",
    "appointment_date": "2026-01-15",
    "appointment_time": "14:00",
    "payment_type": "sinal",
    "amount_paid": 45.00,
    "total_amount": 150.00,
    "status": "pending",
    "created_at": "2026-01-12T10:30:00Z"
  },
  "professional": {
    "id": "223e4567-e89b-12d3-a456-426614174001",
    "name": "Ingrid Leandro",
    "specialty": "Especialista em Cílios e Unhas",
    "phone": "(11) 99027-8446",
    "photo_url": "https://example.com/photo.jpg"
  },
  "service": {
    "id": "323e4567-e89b-12d3-a456-426614174002",
    "name": "Alongamento de Cílios Fio a Fio",
    "price": 150.00,
    "duration": 90,
    "photo_url": "https://example.com/service.jpg"
  }
}
```

**ATENÇÃO**: Note que `client_phone` está no formato `5511987654321` (com código 55 e sem caracteres especiais).


