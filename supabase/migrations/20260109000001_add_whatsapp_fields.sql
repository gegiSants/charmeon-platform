-- Adicionar campos para controle de confirmação via WhatsApp
ALTER TABLE public.appointments 
ADD COLUMN IF NOT EXISTS whatsapp_confirmation_sent BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS whatsapp_confirmed BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS whatsapp_confirmation_sent_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS whatsapp_confirmed_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS whatsapp_message_id TEXT,
ADD COLUMN IF NOT EXISTS mercado_pago_payment_id TEXT,
ADD COLUMN IF NOT EXISTS mercado_pago_preference_id TEXT;

-- Criar índice para consultas de agendamentos próximos
CREATE INDEX IF NOT EXISTS idx_appointments_date_status 
ON public.appointments(appointment_date, status) 
WHERE status IN ('pending', 'confirmed');

-- Comentários para documentação
COMMENT ON COLUMN public.appointments.whatsapp_confirmation_sent IS 'Indica se a mensagem de confirmação foi enviada via WhatsApp';
COMMENT ON COLUMN public.appointments.whatsapp_confirmed IS 'Indica se o cliente confirmou via WhatsApp';
COMMENT ON COLUMN public.appointments.whatsapp_confirmation_sent_at IS 'Data/hora em que a mensagem foi enviada';
COMMENT ON COLUMN public.appointments.whatsapp_confirmed_at IS 'Data/hora em que o cliente confirmou';
COMMENT ON COLUMN public.appointments.whatsapp_message_id IS 'ID da mensagem WhatsApp enviada (para rastreamento)';

