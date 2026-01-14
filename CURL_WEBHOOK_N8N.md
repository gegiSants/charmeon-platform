# Comando cURL para Teste do Webhook n8n

## URL do Webhook
```
https://n8n.codethio.com/webhook/charmeon
```

## Comando cURL Completo

### Linux/Mac/Git Bash
```bash
curl -X POST https://n8n.codethio.com/webhook/charmeon \
  -H "Content-Type: application/json" \
  -d '{
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
  }'
```

### Windows PowerShell (linha única)
```powershell
Invoke-RestMethod -Uri "https://n8n.codethio.com/webhook/charmeon" -Method POST -Body '{"appointment":{"id":"123e4567-e89b-12d3-a456-426614174000","client_name":"Maria Silva","client_phone":"5511987654321","appointment_date":"2026-01-15","appointment_time":"14:00","payment_type":"sinal","amount_paid":45.00,"total_amount":150.00,"status":"pending","created_at":"2026-01-12T10:30:00Z"},"professional":{"id":"223e4567-e89b-12d3-a456-426614174001","name":"Ingrid Leandro","specialty":"Especialista em Cílios e Unhas","phone":"(11) 99027-8446","photo_url":"https://example.com/photo.jpg"},"service":{"id":"323e4567-e89b-12d3-a456-426614174002","name":"Alongamento de Cílios Fio a Fio","price":150.00,"duration":90,"photo_url":"https://example.com/service.jpg"}}' -ContentType "application/json"
```

### Windows CMD (com curl.exe)
```cmd
curl.exe -X POST https://n8n.codethio.com/webhook/charmeon -H "Content-Type: application/json" -d "{\"appointment\":{\"id\":\"123e4567-e89b-12d3-a456-426614174000\",\"client_name\":\"Maria Silva\",\"client_phone\":\"5511987654321\",\"appointment_date\":\"2026-01-15\",\"appointment_time\":\"14:00\",\"payment_type\":\"sinal\",\"amount_paid\":45.00,\"total_amount\":150.00,\"status\":\"pending\",\"created_at\":\"2026-01-12T10:30:00Z\"},\"professional\":{\"id\":\"223e4567-e89b-12d3-a456-426614174001\",\"name\":\"Ingrid Leandro\",\"specialty\":\"Especialista em Cílios e Unhas\",\"phone\":\"(11) 99027-8446\",\"photo_url\":\"https://example.com/photo.jpg\"},\"service\":{\"id\":\"323e4567-e89b-12d3-a456-426614174002\",\"name\":\"Alongamento de Cílios Fio a Fio\",\"price\":150.00,\"duration\":90,\"photo_url\":\"https://example.com/service.jpg\"}}"
```

## Payload JSON (para usar em ferramentas como Postman, Insomnia, etc.)

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

## Resposta Esperada

Quando o webhook está funcionando corretamente, a resposta deve ser:

```json
{
  "message": "Workflow was started"
}
```

## Observações Importantes

- **Método**: POST
- **Content-Type**: application/json
- **Campos opcionais**: `professional` e `service` podem ser `null` se não estiverem disponíveis
- **Formato de data**: YYYY-MM-DD para `appointment_date`
- **Formato de hora**: HH:MM (24 horas) para `appointment_time`
- **Formato de timestamp**: ISO 8601 para `created_at`
- **⚠️ FORMATO DO TELEFONE (`client_phone`)**: 
  - **DEVE ser enviado no formato internacional brasileiro**
  - **Formato**: `55` + DDD + número (sem espaços, parênteses ou hífens)
  - **Exemplo**: `(11) 98765-4321` → `5511987654321`
  - **Exemplo**: `(11) 99027-8446` → `5511990278446`
  - **Sempre incluir o código do país `55` no início**
  - **Remover todos os caracteres especiais** (espaços, parênteses, hífens)

## Estrutura dos Dados

### appointment (obrigatório)
- `id`: UUID do agendamento
- `client_name`: Nome completo do cliente
- `client_phone`: Telefone do cliente **FORMATADO NO FORMATO INTERNACIONAL BRASILEIRO**
  - Formato: `55` + DDD + número (sem espaços, parênteses ou hífens)
  - Exemplo: `5511987654321` (de `(11) 98765-4321`)
  - **IMPORTANTE**: Sempre incluir código do país `55` e remover caracteres especiais
- `appointment_date`: Data do agendamento (YYYY-MM-DD)
- `appointment_time`: Horário do agendamento (HH:MM)
- `payment_type`: "sinal" ou "total"
- `amount_paid`: Valor pago (decimal)
- `total_amount`: Valor total do serviço (decimal)
- `status`: "pending", "confirmed", "completed" ou "cancelled"
- `created_at`: Timestamp ISO 8601

### professional (pode ser null)
- `id`: UUID da profissional
- `name`: Nome da profissional
- `specialty`: Especialidade
- `phone`: Telefone de contato
- `photo_url`: URL da foto (pode ser null)

### service (pode ser null)
- `id`: UUID do serviço
- `name`: Nome do serviço
- `price`: Preço do serviço (decimal)
- `duration`: Duração em minutos (inteiro)
- `photo_url`: URL da foto (pode ser null)

