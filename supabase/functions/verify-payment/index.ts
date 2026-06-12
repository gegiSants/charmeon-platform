import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { getCorsHeaders } from "../_shared/cors.ts";

const logStep = (step: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[VERIFY-PAYMENT] ${step}${detailsStr}`);
};

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req.headers.get("Origin"));

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const { sessionId, paymentIntentId, appointmentId } = await req.json();
    logStep("Request data received", { sessionId, paymentIntentId, appointmentId });

    if (!sessionId && !paymentIntentId) {
      throw new Error("Missing sessionId or paymentIntentId");
    }

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
    
    let paid = false;
    let amount = 0;
    let paymentId = '';

    // Check if it's a PaymentIntent (PIX) or Checkout Session (Card)
    if (paymentIntentId) {
      // Verify PaymentIntent for PIX payments
      logStep("Retrieving PaymentIntent", { paymentIntentId });
      const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
      logStep("PaymentIntent retrieved", { status: paymentIntent.status });

      if (paymentIntent.status === 'succeeded') {
        paid = true;
        amount = paymentIntent.amount / 100;
        paymentId = paymentIntent.id;
      }
    } else if (sessionId) {
      // Verify Checkout Session for card payments
      logStep("Retrieving Checkout Session", { sessionId });
      const session = await stripe.checkout.sessions.retrieve(sessionId);
      logStep("Session retrieved", { status: session.payment_status });

      if (session.payment_status === 'paid') {
        paid = true;
        amount = session.amount_total ? session.amount_total / 100 : 0;
        paymentId = session.id;
      }
    }

    if (paid && appointmentId) {
      // Update appointment status
      const updateData: any = {
        status: 'confirmed',
        amount_paid: amount,
      };

      if (paymentIntentId) {
        updateData.stripe_payment_intent_id = paymentId;
      } else if (sessionId) {
        updateData.stripe_session_id = paymentId;
      }

      const { error: updateError } = await supabaseClient
        .from('appointments')
        .update(updateData)
        .eq('id', appointmentId);

      if (updateError) {
        logStep("Error updating appointment", { error: updateError.message });
      } else {
        logStep("Appointment updated successfully");
      }
    }

    return new Response(JSON.stringify({ 
      success: true, 
      paid,
      amount
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
