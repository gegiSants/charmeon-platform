export function requireWebhookSecret(req: Request): Response | null {
  const secret = Deno.env.get("WEBHOOK_SECRET");
  if (!secret) return null;

  const provided = req.headers.get("x-webhook-secret");
  if (provided !== secret) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }
  return null;
}

export function requireCronSecret(req: Request): Response | null {
  const secret = Deno.env.get("CRON_SECRET");
  if (!secret) return null;

  const provided = req.headers.get("x-cron-secret");
  if (provided !== secret) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }
  return null;
}
