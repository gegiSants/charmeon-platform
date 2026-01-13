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

    // Buscar agendamentos que estão entre 1 e 2 dias no futuro
    // e ainda não receberam email de confirmação
    const today = new Date();
    const oneDayFromNow = new Date(today);
    oneDayFromNow.setDate(today.getDate() + 1);
    
    const twoDaysFromNow = new Date(today);
    twoDaysFromNow.setDate(today.getDate() + 2);

    const { data: appointments, error } = await supabaseClient
      .from('appointments')
      .select(`
        id,
        client_name,
        client_email,
        client_phone,
        appointment_date,
        appointment_time,
        professional_id,
        service_id,
        status,
        email_confirmation_sent,
        professionals:professional_id (name),
        services:service_id (name)
      `)
      .eq('status', 'pending')
      .eq('email_confirmation_sent', false)
      .not('client_email', 'is', null)
      .gte('appointment_date', oneDayFromNow.toISOString().split('T')[0])
      .lte('appointment_date', twoDaysFromNow.toISOString().split('T')[0]);

    if (error) {
      throw new Error(`Erro ao buscar agendamentos: ${error.message}`);
    }

    if (!appointments || appointments.length === 0) {
      return new Response(JSON.stringify({ 
        success: true,
        message: "Nenhum agendamento para confirmar",
        count: 0
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Enviar confirmação para cada agendamento
    const results = [];
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

    for (const apt of appointments) {
      try {
        const response = await fetch(`${supabaseUrl}/functions/v1/send-email-confirmation`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${supabaseServiceKey}`,
            'apikey': supabaseServiceKey,
          },
          body: JSON.stringify({ appointmentId: apt.id }),
        });

        const result = await response.json();
        results.push({
          appointmentId: apt.id,
          clientName: apt.client_name,
          clientEmail: apt.client_email,
          success: result.success,
          message: result.message,
        });
      } catch (err) {
        results.push({
          appointmentId: apt.id,
          clientName: apt.client_name,
          clientEmail: apt.client_email,
          success: false,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }

    const successCount = results.filter(r => r.success).length;
    const failCount = results.filter(r => !r.success).length;

    return new Response(JSON.stringify({ 
      success: true,
      message: `Processados ${appointments.length} agendamentos`,
      sent: successCount,
      failed: failCount,
      results
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return new Response(JSON.stringify({ 
      success: false,
      error: errorMessage 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});








