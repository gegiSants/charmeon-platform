@echo off
REM Configure: set N8N_WEBHOOK_URL=https://seu-n8n.com/webhook/charmeon
if "%N8N_WEBHOOK_URL%"=="" (
  echo Erro: defina N8N_WEBHOOK_URL antes de executar.
  exit /b 1
)

curl -X POST "%N8N_WEBHOOK_URL%" ^
  -H "Content-Type: application/json" ^
  -d "{\"appointment\":{\"id\":\"123e4567-e89b-12d3-a456-426614174000\",\"client_name\":\"Maria Silva\",\"client_phone\":\"5511987654321\",\"appointment_date\":\"2026-01-15\",\"appointment_time\":\"14:00\",\"payment_type\":\"sinal\",\"amount_paid\":45.00,\"total_amount\":150.00,\"status\":\"pending\",\"created_at\":\"2026-01-12T10:30:00Z\"},\"professional\":{\"id\":\"223e4567-e89b-12d3-a456-426614174001\",\"name\":\"Profissional Exemplo\",\"specialty\":\"Especialista\",\"phone\":\"5511999999999\",\"photo_url\":\"https://example.com/photo.jpg\"},\"service\":{\"id\":\"323e4567-e89b-12d3-a456-426614174002\",\"name\":\"Servico Exemplo\",\"price\":150.00,\"duration\":90,\"photo_url\":\"https://example.com/service.jpg\"}}"

echo.
echo Teste concluido!
