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
      // Buscar dados completos do agendamento com profissional e serviço
      const { data: appointmentData, error: fetchError } = await supabaseClient
        .from('appointments')
        .select('*, professionals:professional_id(id, name, specialty, phone, photo_url), services:service_id(id, name, price, duration, photo_url)')
        .eq('id', appointmentId)
        .single();

      if (fetchError) {
        logStep("Error fetching appointment data", { error: fetchError.message });
      }

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
        
        // Enviar mensagem via WhatsApp através do webhook do n8n
        if (appointmentData) {
          try {
            const n8nWebhookUrl = "https://n8n.codethio.com/webhook/charmeon";
            
            // Preparar dados para enviar ao n8n
            // O Supabase retorna relacionamentos como objetos únicos (não arrays) quando há foreign key
            const professional = Array.isArray(appointmentData.professionals) 
              ? appointmentData.professionals[0] 
              : appointmentData.professionals;
            
            const service = Array.isArray(appointmentData.services) 
              ? appointmentData.services[0] 
              : appointmentData.services;

            const webhookData = {
              appointment: {
                id: appointmentData.id,
                client_name: appointmentData.client_name,
                client_phone: appointmentData.client_phone,
                appointment_date: appointmentData.appointment_date,
                appointment_time: appointmentData.appointment_time,
                payment_type: appointmentData.payment_type,
                amount_paid: amount,
                total_amount: appointmentData.total_amount,
                status: appointmentData.status,
                created_at: appointmentData.created_at,
              },
              professional: professional ? {
                id: professional.id,
                name: professional.name,
                specialty: professional.specialty,
                phone: professional.phone,
                photo_url: professional.photo_url,
              } : null,
              service: service ? {
                id: service.id,
                name: service.name,
                price: service.price,
                duration: service.duration,
                photo_url: service.photo_url,
              } : null,
            };

            logStep("Sending WhatsApp notification via n8n webhook", { appointmentId });
            
            const webhookResponse = await fetch(n8nWebhookUrl, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(webhookData),
            });

            if (webhookResponse.ok) {
              logStep("WhatsApp notification sent successfully");
              
              // Atualizar coluna whatsapp_confirmation_sent para true
              await supabaseClient
                .from('appointments')
                .update({ 
                  whatsapp_confirmation_sent: true,
                  whatsapp_confirmation_sent_at: new Date().toISOString()
                })
                .eq('id', appointmentId);
            } else {
              const errorText = await webhookResponse.text();
              logStep("Error sending WhatsApp notification", { 
                status: webhookResponse.status,
                error: errorText 
              });
            }
          } catch (webhookError) {
            logStep("Exception sending WhatsApp notification", { 
              error: webhookError instanceof Error ? webhookError.message : String(webhookError) 
            });
            // Não falhar o processo se o webhook falhar
          }
        }
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



