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

    // Tentar parsear body se for POST, se falhar ou for GET, body será null
    let body: any = {};
    try {
      if (req.method === 'POST') {
        body = await req.json();
      }
    } catch {
      // Body vazio ou inválido, continuar
      body = {};
    }
    
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

    // Formato de confirmação via link (POST request com body JSON)
    let appointmentId = body.appointmentId;
    let action = body.action;

    console.log('📧 Email webhook chamado:', {
      method: req.method,
      bodyAppointmentId: body.appointmentId,
      bodyAction: body.action,
      hasBody: !!body
    });

    // Se não vier no body, tentar GET params
    if (!appointmentId || !action) {
      const url = new URL(req.url);
      appointmentId = url.searchParams.get('token') || appointmentId;
      action = url.searchParams.get('action') || action;
      console.log('📧 Parâmetros da URL:', {
        token: url.searchParams.get('token'),
        action: url.searchParams.get('action'),
        appointmentId,
        action
      });
    }

    if (appointmentId && action) {
      const token = appointmentId;
      console.log('📧 Buscando agendamento:', { token, action });
      
      const { data: appointment, error } = await supabaseClient
        .from('appointments')
        .select('id, client_name, status, email_confirmation_sent, email_confirmed')
        .eq('id', token)
        .single();

      if (error || !appointment) {
        const errorMsg = error ? `Erro ao buscar agendamento: ${error.message}` : 'Agendamento não encontrado';
        console.error('❌ Erro ao buscar agendamento:', { error, token });
        
        if (req.method === 'POST') {
          return new Response(JSON.stringify({ 
            success: false,
            error: errorMsg
          }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 404,
          });
        }
        
        return new Response(`
          <html>
            <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
              <h1>Erro</h1>
              <p>${errorMsg}</p>
            </body>
          </html>
        `, {
          headers: { ...corsHeaders, "Content-Type": "text/html" },
          status: 404,
        });
      }

      console.log('📧 Agendamento encontrado:', {
        id: appointment.id,
        status: appointment.status,
        email_confirmed: appointment.email_confirmed,
        email_confirmation_sent: appointment.email_confirmation_sent
      });

      // Se já foi confirmado, retornar sucesso mesmo assim
      if (appointment.email_confirmed && action === 'confirm') {
        console.log('✅ Agendamento já estava confirmado');
        if (req.method === 'POST') {
          return new Response(JSON.stringify({ 
            success: true,
            action: 'confirmed',
            appointmentId: appointment.id,
            message: "Agendamento já estava confirmado"
          }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 200,
          });
        }
        return new Response(`
          <html>
            <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
              <h1 style="color: #10b981;">✅ Já Confirmado!</h1>
              <p>Este agendamento já estava confirmado anteriormente.</p>
            </body>
          </html>
        `, {
          headers: { ...corsHeaders, "Content-Type": "text/html" },
          status: 200,
        });
      }

      if (action === 'confirm') {
        console.log('✅ Confirmando agendamento:', token);
        const updateData = {
          status: 'confirmed',
          email_confirmed: true,
          email_confirmed_at: new Date().toISOString(),
        };
        console.log('📝 Dados para atualizar:', updateData);
        
        const { data: updatedData, error: updateError } = await supabaseClient
          .from('appointments')
          .update(updateData)
          .eq('id', token)
          .select();

        if (updateError) {
          console.error('❌ Erro ao atualizar agendamento:', updateError);
          throw new Error(`Erro ao confirmar: ${updateError.message}`);
        }

        console.log('✅ Agendamento atualizado com sucesso:', updatedData);

        // Se for POST (JSON), retornar JSON. Se for GET, retornar HTML
        if (req.method === 'POST') {
          return new Response(JSON.stringify({ 
            success: true,
            action: 'confirmed',
            appointmentId: appointment.id,
            message: "Agendamento confirmado com sucesso"
          }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 200,
          });
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
        console.log('❌ Cancelando agendamento:', token);
        const updateData = {
          status: 'cancelled',
          email_confirmed: false,
        };
        console.log('📝 Dados para atualizar:', updateData);
        
        const { data: updatedData, error: updateError } = await supabaseClient
          .from('appointments')
          .update(updateData)
          .eq('id', token)
          .select();

        if (updateError) {
          console.error('❌ Erro ao cancelar agendamento:', updateError);
          throw new Error(`Erro ao cancelar: ${updateError.message}`);
        }

        console.log('✅ Agendamento cancelado com sucesso:', updatedData);

        // Se for POST (JSON), retornar JSON. Se for GET, retornar HTML
        if (req.method === 'POST') {
          return new Response(JSON.stringify({ 
            success: true,
            action: 'cancelled',
            appointmentId: appointment.id,
            message: "Solicitação de reagendamento recebida"
          }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 200,
          });
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


