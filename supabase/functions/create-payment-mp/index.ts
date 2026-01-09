import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CREATE-PAYMENT-MP] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const accessToken = Deno.env.get("MERCADOPAGO_ACCESS_TOKEN");
    if (!accessToken) throw new Error("MERCADOPAGO_ACCESS_TOKEN is not set");
    logStep("Mercado Pago token verified");

    const { 
      appointmentId, 
      clientName, 
      clientEmail,
      clientPhone,
      serviceName, 
      amount, 
      paymentType,
      professionalName,
      appointmentDate,
      appointmentTime 
    } = await req.json();

    logStep("Request data received", { 
      appointmentId, 
      clientName, 
      serviceName, 
      amount, 
      paymentType 
    });

    if (!amount || !serviceName || !clientName) {
      throw new Error("Missing required fields: amount, serviceName, clientName");
    }

    const amountInCents = Math.round(amount * 100);
    const origin = req.headers.get("origin") || "http://localhost:8083";

    // Criar preferência de pagamento no Mercado Pago
    const preferenceData = {
      items: [
        {
          title: `${paymentType === 'sinal' ? 'Sinal (30%)' : 'Pagamento Total'} - ${serviceName}`,
          description: `${professionalName} - Data: ${appointmentDate} às ${appointmentTime}`,
          quantity: 1,
          unit_price: amount,
          currency_id: "BRL",
        },
      ],
      payer: {
        name: clientName,
        email: clientEmail || undefined,
        phone: clientPhone ? {
          area_code: clientPhone.replace(/\D/g, '').substring(0, 2),
          number: clientPhone.replace(/\D/g, '').substring(2),
        } : undefined,
      },
      payment_methods: {
        excluded_payment_methods: paymentType === 'sinal' ? [] : [],
        excluded_payment_types: paymentType === 'sinal' 
          ? [{ id: "credit_card" }, { id: "debit_card" }, { id: "ticket" }] // Apenas PIX para sinal
          : [{ id: "ticket" }], // Cartão para total
        installments: paymentType === 'total' ? 12 : 1,
      },
      back_urls: {
        success: `${origin}/pagamento-sucesso?payment_id={payment_id}&appointment_id=${appointmentId}`,
        failure: `${origin}/pagamento?canceled=true`,
        pending: `${origin}/pagamento-pix?preference_id={preference_id}&appointment_id=${appointmentId}`,
      },
      auto_return: "approved",
      notification_url: `${origin}/api/webhook-mp`,
      statement_descriptor: "Studio Ingrid Leandro",
      external_reference: appointmentId,
      metadata: {
        appointmentId,
        clientName,
        paymentType,
        serviceName,
        professionalName,
        appointmentDate,
        appointmentTime,
      },
    };

    logStep("Creating Mercado Pago preference", { paymentType, amount });

    // Criar preferência via API do Mercado Pago
    const mpResponse = await fetch("https://api.mercadopago.com/checkout/preferences", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${accessToken}`,
      },
      body: JSON.stringify(preferenceData),
    });

    if (!mpResponse.ok) {
      const errorData = await mpResponse.text();
      logStep("Mercado Pago API error", { status: mpResponse.status, error: errorData });
      throw new Error(`Mercado Pago API error: ${mpResponse.status} - ${errorData}`);
    }

    const preference = await mpResponse.json();
    logStep("Preference created", { 
      preferenceId: preference.id,
      init_point: preference.init_point?.substring(0, 50) + '...'
    });

    // Se for PIX, buscar o QR code
    if (paymentType === 'sinal' && preference.point_of_interaction) {
      const pixData = preference.point_of_interaction.transaction_data;
      
      return new Response(JSON.stringify({ 
        preferenceId: preference.id,
        initPoint: preference.init_point,
        qrCode: pixData?.qr_code || pixData?.qr_code_base64,
        qrCodeBase64: pixData?.qr_code_base64,
        ticketUrl: pixData?.ticket_url,
        type: 'pix'
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Para cartão, retornar URL de checkout
    return new Response(JSON.stringify({ 
      preferenceId: preference.id,
      initPoint: preference.init_point,
      sandboxInitPoint: preference.sandbox_init_point,
      type: 'card'
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



