import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
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

    if (!amount || !serviceName || !clientName) {
      throw new Error("Campos obrigatórios: amount, serviceName, clientName");
    }

    const mpAccessToken = Deno.env.get("MERCADOPAGO_ACCESS_TOKEN");
    if (!mpAccessToken) {
      throw new Error("MERCADOPAGO_ACCESS_TOKEN não configurado");
    }

    const cleanToken = mpAccessToken.trim();
    const paymentDescription = paymentType === 'sinal' 
      ? `Sinal (30%) - ${serviceName} - ${professionalName}`
      : `Pagamento Total - ${serviceName} - ${professionalName}`;

    // Usar checkout hospedado (sempre funciona)
    const preferenceData = {
      items: [
        {
          title: paymentDescription,
          quantity: 1,
          unit_price: amount,
        }
      ],
      payment_methods: {
        excluded_payment_methods: [
          { id: "visa" },
          { id: "master" },
          { id: "amex" },
          { id: "elo" },
          { id: "hipercard" },
          { id: "diners" },
          { id: "ticket" },
          { id: "debit_card" },
        ],
        installments: null,
      },
      payer: {
        email: clientEmail || `cliente${Date.now()}@exemplo.com`,
        name: clientName,
        surname: clientName.split(' ').slice(1).join(' ') || clientName,
      },
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
      statement_descriptor: "STUDIO IL",
    };

    if (clientPhone) {
      const phoneNumbers = clientPhone.replace(/\D/g, '');
      if (phoneNumbers.length >= 10) {
        preferenceData.payer.phone = {
          area_code: phoneNumbers.substring(0, 2),
          number: phoneNumbers.substring(2),
        };
      }
    }

    const mpResponse = await fetch("https://api.mercadopago.com/checkout/preferences", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${cleanToken}`,
      },
      body: JSON.stringify(preferenceData),
    });

    if (!mpResponse.ok) {
      const errorData = await mpResponse.text();
      throw new Error(`Mercado Pago API error: ${mpResponse.status} - ${errorData}`);
    }

    const preference = await mpResponse.json();

    if (!preference.id) {
      throw new Error("Preferência não foi criada pelo Mercado Pago");
    }

    return new Response(JSON.stringify({ 
      paymentId: preference.id,
      preferenceId: preference.id,
      initPoint: preference.init_point || preference.sandbox_init_point,
      sandboxInitPoint: preference.sandbox_init_point,
      type: 'pix',
      provider: 'mercadopago'
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
