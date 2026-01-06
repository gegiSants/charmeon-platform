-- Tabela de profissionais
CREATE TABLE public.professionals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  specialty TEXT NOT NULL,
  photo_url TEXT,
  phone TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Tabela de serviços
CREATE TABLE public.services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  professional_id UUID REFERENCES public.professionals(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  duration INTEGER NOT NULL,
  photo_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Tabela de agendamentos
CREATE TABLE public.appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_name TEXT NOT NULL,
  client_phone TEXT NOT NULL,
  professional_id UUID REFERENCES public.professionals(id) ON DELETE SET NULL,
  service_id UUID REFERENCES public.services(id) ON DELETE SET NULL,
  appointment_date DATE NOT NULL,
  appointment_time TEXT NOT NULL,
  payment_type TEXT CHECK (payment_type IN ('sinal', 'total')) NOT NULL,
  amount_paid DECIMAL(10,2) NOT NULL DEFAULT 0,
  total_amount DECIMAL(10,2) NOT NULL,
  status TEXT CHECK (status IN ('pending', 'confirmed', 'completed', 'cancelled')) DEFAULT 'pending' NOT NULL,
  stripe_session_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Habilitar RLS
ALTER TABLE public.professionals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;

-- Políticas públicas de leitura para profissionais e serviços
CREATE POLICY "Profissionais são visíveis publicamente"
ON public.professionals FOR SELECT
USING (true);

CREATE POLICY "Serviços são visíveis publicamente"
ON public.services FOR SELECT
USING (true);

-- Políticas públicas para agendamentos (clientes podem criar)
CREATE POLICY "Clientes podem criar agendamentos"
ON public.appointments FOR INSERT
WITH CHECK (true);

CREATE POLICY "Agendamentos são visíveis publicamente"
ON public.appointments FOR SELECT
USING (true);

CREATE POLICY "Agendamentos podem ser atualizados"
ON public.appointments FOR UPDATE
USING (true);

-- Inserir dados iniciais
INSERT INTO public.professionals (name, specialty, phone, photo_url) VALUES
('Ingrid Leandro', 'Especialista em Cílios e Unhas', '(11) 99027-8446', 'https://images.unsplash.com/photo-1594744803329-e58b31de8bf5?w=400&h=400&fit=crop&crop=face'),
('Amanda Silva', 'Nail Designer', '(11) 99999-0000', 'https://images.unsplash.com/photo-1580618672591-eb180b1a973f?w=400&h=400&fit=crop&crop=face');

-- Inserir serviços para Ingrid
INSERT INTO public.services (professional_id, name, price, duration)
SELECT id, 'Alongamento de Cílios Fio a Fio', 150.00, 90
FROM public.professionals WHERE name = 'Ingrid Leandro';

INSERT INTO public.services (professional_id, name, price, duration)
SELECT id, 'Alongamento Volume Russo', 200.00, 120
FROM public.professionals WHERE name = 'Ingrid Leandro';

INSERT INTO public.services (professional_id, name, price, duration)
SELECT id, 'Manutenção de Cílios', 80.00, 60
FROM public.professionals WHERE name = 'Ingrid Leandro';

INSERT INTO public.services (professional_id, name, price, duration)
SELECT id, 'Alongamento de Unhas em Gel', 120.00, 90
FROM public.professionals WHERE name = 'Ingrid Leandro';

INSERT INTO public.services (professional_id, name, price, duration)
SELECT id, 'Esmaltação em Gel', 60.00, 45
FROM public.professionals WHERE name = 'Ingrid Leandro';

-- Inserir serviços para Amanda
INSERT INTO public.services (professional_id, name, price, duration)
SELECT id, 'Nail Art', 80.00, 60
FROM public.professionals WHERE name = 'Amanda Silva';

INSERT INTO public.services (professional_id, name, price, duration)
SELECT id, 'Manicure Completa', 45.00, 45
FROM public.professionals WHERE name = 'Amanda Silva';

INSERT INTO public.services (professional_id, name, price, duration)
SELECT id, 'Pedicure Completa', 50.00, 50
FROM public.professionals WHERE name = 'Amanda Silva';