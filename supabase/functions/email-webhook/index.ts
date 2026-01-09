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
    
    // Formato SendGrid Inbound Parse Webhook
    if (body.from && body.text && body.subject) {
      const fromEmail = body.from;
      const emailBody = (body.text || body.html || '').toLowerCase().trim();
      
      // Buscar agendamento pendente pelo email do cliente
      const { data: appointments, error } = await supabaseClient
        .from('appointments')
        .select('id, client_name, status, email_confirmation_sent, email_confirmed')
        .eq('status', 'pending')
        .eq('email_confirmation_sent', true)
        .eq('email_confirmed', false)
        .eq('client_email', fromEmail)
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
      if (emailBody.includes('sim') || emailBody.includes('confirmo') || emailBody.includes('confirmar') || emailBody.includes('confirmado')) {
        confirmed = true;
      } else if (emailBody.includes('não') || emailBody.includes('nao') || emailBody.includes('reagendar') || emailBody.includes('cancelar')) {
        cancelled = true;
      }

      if (confirmed) {
        // Confirmar agendamento
        const { error: updateError } = await supabaseClient
          .from('appointments')
          .update({
            status: 'confirmed',
            email_confirmed: true,
            email_confirmed_at: new Date().toISOString(),
          })
          .eq('id', appointment.id);

        if (updateError) {
          throw new Error(`Erro ao confirmar: ${updateError.message}`);
        }

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
        // Marcar como cancelado
        const { error: updateError } = await supabaseClient
          .from('appointments')
          .update({
            status: 'cancelled',
            email_confirmed: false,
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

    // Formato de confirmação via link (GET request)
    const url = new URL(req.url);
    const token = url.searchParams.get('token');
    const action = url.searchParams.get('action');

    if (token && action) {
      const { data: appointment, error } = await supabaseClient
        .from('appointments')
        .select('id, client_name, status, email_confirmation_sent')
        .eq('id', token)
        .eq('status', 'pending')
        .eq('email_confirmation_sent', true)
        .single();

      if (error || !appointment) {
        return new Response(`
          <html>
            <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
              <h1>Erro</h1>
              <p>Agendamento não encontrado ou já processado.</p>
            </body>
          </html>
        `, {
          headers: { ...corsHeaders, "Content-Type": "text/html" },
          status: 404,
        });
      }

      if (action === 'confirm') {
        const { error: updateError } = await supabaseClient
          .from('appointments')
          .update({
            status: 'confirmed',
            email_confirmed: true,
            email_confirmed_at: new Date().toISOString(),
          })
          .eq('id', token);

        if (updateError) {
          throw new Error(`Erro ao confirmar: ${updateError.message}`);
        }

        return new Response(`
          <html>
            <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
              <h1 style="color: #10b981;">✅ Confirmado!</h1>
              <p>Obrigada pela confirmação, ${appointment.client_name}!</p>
              <p>Estamos ansiosos para te atender.</p>
            </body>
          </html>
        `, {
          headers: { ...corsHeaders, "Content-Type": "text/html" },
          status: 200,
        });
      } else if (action === 'cancel') {
        const { error: updateError } = await supabaseClient
          .from('appointments')
          .update({
            status: 'cancelled',
            email_confirmed: false,
          })
          .eq('id', token);

        if (updateError) {
          throw new Error(`Erro ao cancelar: ${updateError.message}`);
        }

        return new Response(`
          <html>
            <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
              <h1 style="color: #ef4444;">❌ Cancelado</h1>
              <p>Seu agendamento foi cancelado.</p>
              <p>Entre em contato conosco para reagendar.</p>
            </body>
          </html>
        `, {
          headers: { ...corsHeaders, "Content-Type": "text/html" },
          status: 200,
        });
      }
    }

    return new Response(JSON.stringify({ 
      success: false,
      message: "Formato de webhook não reconhecido"
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('Erro no webhook de email:', errorMessage);
    return new Response(JSON.stringify({ 
      success: false,
      error: errorMessage 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});

