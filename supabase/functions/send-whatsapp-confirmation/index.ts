import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface Appointment {
  id: string;
  client_name: string;
  client_phone: string;
  appointment_date: string;
  appointment_time: string;
  professional_id: string;
  service_id: string;
  professionals?: { name: string };
  services?: { name: string };
}

serve(async (req) => {
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

    // Verificar se já foi enviado
    if (apt.whatsapp_confirmation_sent) {
      return new Response(JSON.stringify({ 
        success: true,
        message: "Confirmação já foi enviada anteriormente",
        alreadySent: true
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Formatar data
    const appointmentDate = new Date(apt.appointment_date);
    const formattedDate = appointmentDate.toLocaleDateString('pt-BR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    // Criar mensagem com botões de confirmação
    const message = `Olá ${apt.client_name}! 👋

Este é um lembrete do seu agendamento no *Studio Ingrid Leandro*:

📅 *Data:* ${formattedDate}
🕐 *Horário:* ${apt.appointment_time}
💅 *Serviço:* ${apt.services?.name || 'N/A'}
👩‍💼 *Profissional:* ${apt.professionals?.name || 'N/A'}

Por favor, confirme se você poderá comparecer:

✅ *SIM* - Confirmo minha presença
❌ *NÃO* - Preciso reagendar

*Importante:* Em caso de não comparecimento, o sinal não será ressarcido.`;

    // Enviar via WhatsApp
    // Opção 1: Usar Twilio WhatsApp API
    const twilioAccountSid = Deno.env.get("TWILIO_ACCOUNT_SID");
    const twilioAuthToken = Deno.env.get("TWILIO_AUTH_TOKEN");
    const twilioWhatsAppNumber = Deno.env.get("TWILIO_WHATSAPP_NUMBER"); // Formato: whatsapp:+5511999999999

    let messageSent = false;
    let messageId = null;

    if (twilioAccountSid && twilioAuthToken && twilioWhatsAppNumber) {
      // Limpar número do telefone
      const cleanPhone = apt.client_phone.replace(/\D/g, '');
      const whatsappTo = `whatsapp:+55${cleanPhone}`;

      const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${twilioAccountSid}/Messages.json`;
      
      const formData = new URLSearchParams();
      formData.append('From', twilioWhatsAppNumber);
      formData.append('To', whatsappTo);
      formData.append('Body', message);

      const twilioResponse = await fetch(twilioUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${btoa(`${twilioAccountSid}:${twilioAuthToken}`)}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: formData.toString(),
      });

      if (twilioResponse.ok) {
        const twilioData = await twilioResponse.json();
        messageSent = true;
        messageId = twilioData.sid;
        console.log('WhatsApp enviado via Twilio:', twilioData.sid);
      } else {
        const errorText = await twilioResponse.text();
        console.error('Erro ao enviar WhatsApp via Twilio:', errorText);
      }
    }

    // Opção 2: Usar API oficial do WhatsApp Business (se Twilio não estiver configurado)
    // Você pode adicionar aqui a integração com a API oficial do WhatsApp Business

    // Atualizar banco de dados
    const updateData: any = {
      whatsapp_confirmation_sent: messageSent,
      whatsapp_confirmation_sent_at: messageSent ? new Date().toISOString() : null,
    };

    if (messageId) {
      updateData.whatsapp_message_id = messageId;
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
        ? "Mensagem de confirmação enviada com sucesso!" 
        : "Erro ao enviar mensagem. Verifique as configurações do WhatsApp.",
      messageId,
      appointmentId
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: messageSent ? 200 : 500,
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('Erro ao enviar confirmação WhatsApp:', errorMessage);
    return new Response(JSON.stringify({ 
      success: false,
      error: errorMessage 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});

