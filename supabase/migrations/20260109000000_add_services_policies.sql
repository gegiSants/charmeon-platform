-- Adicionar políticas RLS para INSERT, UPDATE e DELETE na tabela services
-- Permitir que qualquer pessoa possa inserir, atualizar e deletar serviços
-- (em produção, você pode querer restringir isso)

CREATE POLICY "Serviços podem ser inseridos"
ON public.services FOR INSERT
WITH CHECK (true);

CREATE POLICY "Serviços podem ser atualizados"
ON public.services FOR UPDATE
USING (true);

CREATE POLICY "Serviços podem ser deletados"
ON public.services FOR DELETE
USING (true);

-- Adicionar políticas para profissionais também (caso não existam)
CREATE POLICY "Profissionais podem ser inseridos"
ON public.professionals FOR INSERT
WITH CHECK (true);

CREATE POLICY "Profissionais podem ser atualizados"
ON public.professionals FOR UPDATE
USING (true);

CREATE POLICY "Profissionais podem ser deletados"
ON public.professionals FOR DELETE
USING (true);

