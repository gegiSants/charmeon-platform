import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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

    const body = await req.json();
    
    // Formato Twilio
    if (body.MessageSid && body.From && body.Body) {
      const fromNumber = body.From.replace('whatsapp:', '').replace('+55', '');
      const messageBody = body.Body.toLowerCase().trim();
      
      // Buscar agendamento pendente pelo número do cliente
      const { data: appointments, error } = await supabaseClient
        .from('appointments')
        .select('id, client_name, status, whatsapp_confirmation_sent, whatsapp_confirmed')
        .eq('status', 'pending')
        .eq('whatsapp_confirmation_sent', true)
        .eq('whatsapp_confirmed', false)
        .like('client_phone', `%${fromNumber}%`)
        .order('appointment_date', { ascending: true })
        .limit(1);

      if (error || !appointments || appointments.length === 0) {
        return new Response(JSON.stringify({ 
          success: false,
          message: "Agendamento não encontrado"
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });
      }

      const appointment = appointments[0];
      let confirmed = false;
      let cancelled = false;

      // Verificar resposta
      if (messageBody.includes('sim') || messageBody.includes('confirmo') || messageBody.includes('confirmar') || messageBody === '✅' || messageBody === 'sim') {
        confirmed = true;
      } else if (messageBody.includes('não') || messageBody.includes('nao') || messageBody.includes('reagendar') || messageBody === '❌' || messageBody === 'nao') {
        cancelled = true;
      }

      if (confirmed) {
        // Confirmar agendamento
        const { error: updateError } = await supabaseClient
          .from('appointments')
          .update({
            status: 'confirmed',
            whatsapp_confirmed: true,
            whatsapp_confirmed_at: new Date().toISOString(),
          })
          .eq('id', appointment.id);

        if (updateError) {
          throw new Error(`Erro ao confirmar: ${updateError.message}`);
        }

        // Enviar mensagem de confirmação
        const confirmationMessage = `✅ *Confirmado!*

Obrigada pela confirmação, ${appointment.client_name}! 

Estamos ansiosos para te atender. Em caso de qualquer dúvida, entre em contato conosco.

Até breve! 💅✨`;

        // Aqui você pode enviar uma mensagem de resposta via Twilio ou WhatsApp API
        // Por enquanto, apenas retornamos sucesso

        return new Response(JSON.stringify({ 
          success: true,
          action: 'confirmed',
          appointmentId: appointment.id,
          message: "Agendamento confirmado com sucesso"
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });
      } else if (cancelled) {
        // Marcar como cancelado ou manter pendente para reagendamento
        const { error: updateError } = await supabaseClient
          .from('appointments')
          .update({
            status: 'cancelled',
            whatsapp_confirmed: false,
          })
          .eq('id', appointment.id);

        if (updateError) {
          throw new Error(`Erro ao cancelar: ${updateError.message}`);
        }

        return new Response(JSON.stringify({ 
          success: true,
          action: 'cancelled',
          appointmentId: appointment.id,
          message: "Agendamento cancelado. Entre em contato para reagendar."
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });
      } else {
        // Resposta não reconhecida
        return new Response(JSON.stringify({ 
          success: false,
          message: "Resposta não reconhecida. Por favor, responda com 'SIM' para confirmar ou 'NÃO' para reagendar."
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });
      }
    }

    // Formato genérico (pode ser adaptado para outras APIs)
    return new Response(JSON.stringify({ 
      success: false,
      message: "Formato de webhook não reconhecido"
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('Erro no webhook WhatsApp:', errorMessage);
    return new Response(JSON.stringify({ 
      success: false,
      error: errorMessage 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});

