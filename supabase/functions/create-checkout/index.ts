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

    // SEMPRE tentar gerar QR Code PIX direto primeiro
    const idempotencyKey = crypto.randomUUID();
    
    const paymentData: {
      transaction_amount: number;
      description: string;
      payment_method_id: string;
      payer: {
        email: string;
        first_name: string;
        last_name: string;
        phone?: { area_code: string; number: string };
      };
      external_reference: string;
      metadata: Record<string, string>;
    } = {
      transaction_amount: amount,
      description: paymentDescription,
      payment_method_id: "pix",
      payer: {
        email: clientEmail || `cliente${Date.now()}@exemplo.com`,
        first_name: clientName.split(' ')[0] || clientName,
        last_name: clientName.split(' ').slice(1).join(' ') || clientName,
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
    };

    if (clientPhone) {
      const phoneNumbers = clientPhone.replace(/\D/g, '');
      if (phoneNumbers.length >= 10) {
        paymentData.payer.phone = {
          area_code: phoneNumbers.substring(0, 2),
          number: phoneNumbers.substring(2),
        };
      }
    }

    // Tentar criar pagamento direto PIX (gera QR code)
    const directPaymentResponse = await fetch("https://api.mercadopago.com/v1/payments", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${cleanToken}`,
        "X-Idempotency-Key": idempotencyKey,
      },
      body: JSON.stringify(paymentData),
    });

    // Se funcionou, retornar QR code direto
    if (directPaymentResponse.ok) {
      const payment = await directPaymentResponse.json();
      const pixData = payment.point_of_interaction?.transaction_data;

      if (!pixData) {
        throw new Error("QR Code PIX não foi gerado pelo Mercado Pago");
      }

      return new Response(JSON.stringify({ 
        paymentId: payment.id,
        preferenceId: payment.id,
        qrCode: pixData.qr_code || pixData.qr_code_base64,
        qrCodeBase64: pixData.qr_code_base64,
        ticketUrl: pixData.ticket_url,
        type: 'pix',
        provider: 'mercadopago'
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Se falhou, usar checkout hospedado (fallback para tokens de teste)
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
