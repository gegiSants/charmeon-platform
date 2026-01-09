import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[VERIFY-PAYMENT-MP] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const accessToken = Deno.env.get("MERCADOPAGO_ACCESS_TOKEN");
    if (!accessToken) throw new Error("MERCADOPAGO_ACCESS_TOKEN is not set");

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const { paymentId, preferenceId, appointmentId } = await req.json();
    logStep("Request data received", { paymentId, preferenceId, appointmentId });

    if (!paymentId && !preferenceId) {
      throw new Error("Missing paymentId or preferenceId");
    }

    let paid = false;
    let amount = 0;
    let paymentStatus = '';

    // Verificar pagamento via payment_id
    if (paymentId) {
      logStep("Verifying payment", { paymentId });
      
      const paymentResponse = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
        headers: {
          "Authorization": `Bearer ${accessToken}`,
        },
      });

      if (paymentResponse.ok) {
        const payment = await paymentResponse.json();
        logStep("Payment retrieved", { 
          status: payment.status,
          status_detail: payment.status_detail 
        });

        paymentStatus = payment.status;
        if (payment.status === 'approved') {
          paid = true;
          amount = payment.transaction_amount || 0;
        }
      }
    } 
    // Verificar via preference_id
    else if (preferenceId) {
      logStep("Verifying preference", { preferenceId });
      
      const prefResponse = await fetch(`https://api.mercadopago.com/checkout/preferences/${preferenceId}`, {
        headers: {
          "Authorization": `Bearer ${accessToken}`,
        },
      });

      if (prefResponse.ok) {
        const preference = await prefResponse.json();
        
        // Buscar pagamentos relacionados a esta preferência
        if (preference.id) {
          const paymentsResponse = await fetch(
            `https://api.mercadopago.com/v1/payments/search?external_reference=${appointmentId}`,
            {
              headers: {
                "Authorization": `Bearer ${accessToken}`,
              },
            }
          );

          if (paymentsResponse.ok) {
            const paymentsData = await paymentsResponse.json();
            const approvedPayment = paymentsData.results?.find((p: any) => p.status === 'approved');
            
            if (approvedPayment) {
              paid = true;
              amount = approvedPayment.transaction_amount || 0;
              paymentStatus = approvedPayment.status;
            }
          }
        }
      }
    }

    if (paid && appointmentId) {
      // Atualizar status do agendamento - manter como 'pending' até confirmação via WhatsApp
      // O status será mudado para 'confirmed' quando o cliente confirmar via WhatsApp
      const updateData: any = {
        status: 'pending', // Mantém como pending até confirmação do cliente
        amount_paid: amount,
      };

      if (paymentId) {
        updateData.mercado_pago_payment_id = paymentId;
      }
      if (preferenceId) {
        updateData.mercado_pago_preference_id = preferenceId;
      }

      const { error: updateError } = await supabaseClient
        .from('appointments')
        .update(updateData)
        .eq('id', appointmentId);

      if (updateError) {
        logStep("Error updating appointment", { error: updateError.message });
      } else {
        logStep("Appointment updated successfully - payment confirmed, awaiting WhatsApp confirmation");
      }
    }

    return new Response(JSON.stringify({ 
      success: true, 
      paid,
      amount,
      status: paymentStatus
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});



