import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { getCorsHeaders } from "../_shared/cors.ts";
import { generateConfirmationToken } from "../_shared/tokens.ts";

interface Appointment {
  id: string;
  client_name: string;
  client_email: string;
  client_phone: string;
  appointment_date: string;
  appointment_time: string;
  professional_id: string;
  service_id: string;
  professionals?: { name: string };
  services?: { name: string };
  email_confirmation_sent: boolean;
}

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req.headers.get("Origin"));

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const { appointmentId } = await req.json();

    if (!appointmentId) {
      throw new Error("appointmentId é obrigatório");
    }

    // Buscar dados do agendamento
    const { data: appointment, error: fetchError } = await supabaseClient
      .from('appointments')
      .select(`
        *,
        professionals:professional_id (name),
        services:service_id (name)
      `)
      .eq('id', appointmentId)
      .single();

    if (fetchError || !appointment) {
      throw new Error(`Agendamento não encontrado: ${fetchError?.message}`);
    }

    const apt = appointment as Appointment;

    // Verificar se tem email
    if (!apt.client_email) {
      throw new Error("Agendamento não possui email cadastrado");
    }

    // Verificar se já foi enviado
    if (apt.email_confirmation_sent) {
      return new Response(JSON.stringify({ 
        success: true,
        message: "Confirmação já foi enviada anteriormente",
        alreadySent: true
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Função para escapar HTML
    const escapeHtml = (text: string): string => {
      return String(text || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
    };

    // Formatar data
    const appointmentDate = new Date(apt.appointment_date);
    const formattedDate = appointmentDate.toLocaleDateString('pt-BR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    // Criar links de confirmação
    let baseUrl = Deno.env.get("SITE_URL") || "https://seu-site.com";
    baseUrl = baseUrl.trim().replace(/\/+$/, '').replace(/\/api$/, '');
    const confirmToken = await generateConfirmationToken(apt.id, "confirm");
    const cancelToken = await generateConfirmationToken(apt.id, "cancel");
    const confirmUrl = `${baseUrl}/confirmar?token=${encodeURIComponent(confirmToken)}&action=confirm`;
    const cancelUrl = `${baseUrl}/confirmar?token=${encodeURIComponent(cancelToken)}&action=cancel`;

    // Escapar valores para HTML
    const clientNameEscaped = escapeHtml(apt.client_name);
    const serviceNameEscaped = escapeHtml(apt.services?.name || 'N/A');
    const professionalNameEscaped = escapeHtml(apt.professionals?.name || 'N/A');
    const formattedDateEscaped = escapeHtml(formattedDate);
    const appointmentTimeEscaped = escapeHtml(apt.appointment_time);

    // Criar HTML do email
    const emailHtml = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #f43f5e 0%, #ec4899 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
    .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
    .info-box { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #f43f5e; }
    .button { display: inline-block; padding: 12px 30px; margin: 10px 5px; text-decoration: none; border-radius: 5px; font-weight: bold; }
    .button-confirm { background: #10b981; color: white; }
    .button-cancel { background: #ef4444; color: white; }
    .footer { text-align: center; margin-top: 30px; color: #6b7280; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Studio Ingrid Leandro</h1>
      <p>Confirmação de Agendamento</p>
    </div>
    <div class="content">
      <p>Olá <strong>${clientNameEscaped}</strong>! 👋</p>
      
      <p>Este é um lembrete do seu agendamento:</p>
      
      <div class="info-box">
        <p><strong>📅 Data:</strong> ${formattedDateEscaped}</p>
        <p><strong>🕐 Horário:</strong> ${appointmentTimeEscaped}</p>
        <p><strong>💅 Serviço:</strong> ${serviceNameEscaped}</p>
        <p><strong>👩‍💼 Profissional:</strong> ${professionalNameEscaped}</p>
      </div>

      <p>Por favor, confirme se você poderá comparecer:</p>
      
      <div style="text-align: center; margin: 30px 0;">
        <a href="${confirmUrl}" class="button button-confirm">✅ SIM - Confirmo</a>
        <a href="${cancelUrl}" class="button button-cancel">❌ NÃO - Reagendar</a>
      </div>

      <div class="info-box" style="background: #fef3c7; border-left-color: #f59e0b;">
        <p><strong>⚠️ Importante:</strong></p>
        <p>Em caso de não comparecimento, o sinal não será ressarcido. Se precisar reagendar, entre em contato conosco com pelo menos 48h de antecedência.</p>
      </div>

      <p>Ou responda este email com:</p>
      <ul>
        <li><strong>SIM</strong> ou <strong>CONFIRMO</strong> - para confirmar</li>
        <li><strong>NÃO</strong> ou <strong>REAGENDAR</strong> - para reagendar</li>
      </ul>
    </div>
    <div class="footer">
      <p>Studio Ingrid Leandro - Especialistas em realçar sua beleza natural</p>
      <p>Este é um email automático, por favor não responda diretamente.</p>
    </div>
  </div>
</body>
</html>`;

    // Versão texto simples
    const emailText = `Olá ${apt.client_name}!

Este é um lembrete do seu agendamento no Studio Ingrid Leandro:

📅 Data: ${formattedDate}
🕐 Horário: ${apt.appointment_time}
💅 Serviço: ${apt.services?.name || 'N/A'}
👩‍💼 Profissional: ${apt.professionals?.name || 'N/A'}

Por favor, confirme se você poderá comparecer:

✅ SIM - Confirmo: ${confirmUrl}
❌ NÃO - Reagendar: ${cancelUrl}

Ou responda este email com:
- SIM ou CONFIRMO - para confirmar
- NÃO ou REAGENDAR - para reagendar

⚠️ Importante: Em caso de não comparecimento, o sinal não será ressarcido.

Studio Ingrid Leandro`;

    // Enviar via Resend
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    const fromEmailRaw = Deno.env.get("FROM_EMAIL");
    const fromNameRaw = Deno.env.get("FROM_NAME") || "Studio Ingrid Leandro";

    let messageSent = false;
    let messageId = null;

    if (!resendApiKey || !fromEmailRaw) {
      throw new Error("RESEND_API_KEY e FROM_EMAIL devem ser configurados. Veja SOLUCAO_SIMPLES_EMAIL.md");
    }

    // Limpar e extrair email do valor (remover markdown, espaços extras, etc)
    let fromEmail = fromEmailRaw.trim();
    // Se tiver backticks, remover
    fromEmail = fromEmail.replace(/`/g, '');
    // Se tiver formatação markdown como `- FROM_EMAIL: `email@example.com``, extrair apenas o email
    const emailMatch = fromEmail.match(/([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z]{2,})/);
    if (emailMatch) {
      fromEmail = emailMatch[1];
    }
    // Remover espaços extras
    fromEmail = fromEmail.trim();

    // Validar formato do email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(fromEmail)) {
      throw new Error(`FROM_EMAIL inválido: "${fromEmailRaw}". Deve estar apenas o email, exemplo: onboarding@resend.dev`);
    }

    // Limpar nome também
    let fromName = fromNameRaw.trim();
    fromName = fromName.replace(/`/g, '').trim();

    // Formatar campo 'from': usar apenas email para domínio de teste, ou nome <email> para domínios próprios
    let fromField: string;
    if (fromEmail === "onboarding@resend.dev") {
      // Domínio de teste: usar apenas email (sem nome)
      fromField = fromEmail;
    } else if (fromName && fromName.length > 0) {
      // Domínio próprio: usar formato Nome <email>
      fromField = `${fromName} <${fromEmail}>`;
    } else {
      // Sem nome: usar apenas email
      fromField = fromEmail;
    }

    try {
      const resendResponse = await fetch("https://api.resend.com/emails", {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${resendApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: fromField,
          to: [apt.client_email],
          subject: `Confirmação de Agendamento - ${formattedDate} às ${apt.appointment_time}`,
          text: emailText,
          html: emailHtml,
          tags: [
            { name: 'appointment_id', value: apt.id.replace(/[^a-zA-Z0-9_-]/g, '_') },
            { name: 'client_phone', value: apt.client_phone.replace(/[^a-zA-Z0-9_-]/g, '_') }
          ]
        }),
      });

      if (resendResponse.ok) {
        const resendData = await resendResponse.json();
        messageSent = true;
        messageId = resendData.id || apt.id;
        console.log('Email enviado via Resend para:', apt.client_email);
      } else {
        const errorText = await resendResponse.text();
        console.error('Erro ao enviar email via Resend:', errorText);
        
        // Tentar parsear o erro para dar mensagem mais clara
        let errorMessage = errorText;
        try {
          const errorJson = JSON.parse(errorText);
          if (errorJson.message) {
            errorMessage = errorJson.message;
            
            // Se for erro de domínio não verificado, dar instruções claras
            if (errorMessage.includes('only send testing emails') || errorMessage.includes('verify a domain')) {
              errorMessage = `⚠️ DOMÍNIO NÃO VERIFICADO NO RESEND\n\n` +
                `O email está sendo enviado de um domínio de teste (onboarding@resend.dev), que só permite enviar para o email da conta.\n\n` +
                `Para enviar para clientes reais, você precisa:\n` +
                `1. Acessar: https://resend.com/domains\n` +
                `2. Verificar seu domínio (ex: seu-dominio.com)\n` +
                `3. Atualizar o secret FROM_EMAIL no Supabase para usar o domínio verificado\n` +
                `   Exemplo: contato@seu-dominio.com\n\n` +
                `Erro original: ${errorJson.message}`;
            }
          }
        } catch {
          // Se não conseguir parsear, usar o texto original
        }
        
        throw new Error(`Erro ao enviar email: ${errorMessage}`);
      }
    } catch (error) {
      console.error('Erro ao enviar email:', error);
      throw error;
    }

    // Atualizar banco de dados
    const updateData: any = {
      email_confirmation_sent: messageSent,
      email_confirmation_sent_at: messageSent ? new Date().toISOString() : null,
    };

    if (messageId) {
      updateData.email_message_id = messageId;
    }

    const { error: updateError } = await supabaseClient
      .from('appointments')
      .update(updateData)
      .eq('id', appointmentId);

    if (updateError) {
      console.error('Erro ao atualizar agendamento:', updateError);
    }

    return new Response(JSON.stringify({ 
      success: messageSent,
      message: messageSent 
        ? "Email de confirmação enviado com sucesso!" 
        : "Erro ao enviar email. Verifique as configurações.",
      messageId,
      appointmentId
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: messageSent ? 200 : 500,
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('Erro ao enviar confirmação por email:', errorMessage);
    return new Response(JSON.stringify({ 
      success: false,
      error: errorMessage 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
