-- Criar tabela de clientes para armazenar email vinculado ao telefone
CREATE TABLE IF NOT EXISTS public.clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL,
  name TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Adicionar campos para controle de confirmação via email
ALTER TABLE public.appointments 
ADD COLUMN IF NOT EXISTS client_email TEXT,
ADD COLUMN IF NOT EXISTS email_confirmation_sent BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS email_confirmed BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS email_confirmation_sent_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS email_confirmed_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS email_message_id TEXT,
ADD COLUMN IF NOT EXISTS mercado_pago_payment_id TEXT,
ADD COLUMN IF NOT EXISTS mercado_pago_preference_id TEXT;

-- Criar índice para consultas de agendamentos próximos
CREATE INDEX IF NOT EXISTS idx_appointments_date_status 
ON public.appointments(appointment_date, status) 
WHERE status IN ('pending', 'confirmed');

-- Criar índice para busca rápida de clientes por telefone
CREATE INDEX IF NOT EXISTS idx_clients_phone ON public.clients(phone);

-- Habilitar RLS na tabela clients
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

-- Políticas para clients
CREATE POLICY "Clientes são visíveis publicamente"
ON public.clients FOR SELECT
USING (true);

CREATE POLICY "Clientes podem ser inseridos"
ON public.clients FOR INSERT
WITH CHECK (true);

CREATE POLICY "Clientes podem ser atualizados"
ON public.clients FOR UPDATE
USING (true);

-- Comentários para documentação
COMMENT ON COLUMN public.appointments.client_email IS 'Email do cliente para envio de confirmação';
COMMENT ON COLUMN public.appointments.email_confirmation_sent IS 'Indica se a mensagem de confirmação foi enviada via email';
COMMENT ON COLUMN public.appointments.email_confirmed IS 'Indica se o cliente confirmou via email';
COMMENT ON COLUMN public.appointments.email_confirmation_sent_at IS 'Data/hora em que a mensagem foi enviada';
COMMENT ON COLUMN public.appointments.email_confirmed_at IS 'Data/hora em que o cliente confirmou';
COMMENT ON COLUMN public.appointments.email_message_id IS 'ID da mensagem de email enviada (para rastreamento)';

