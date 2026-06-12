export function getCorsHeaders(origin?: string | null): Record<string, string> {
  const allowed = Deno.env.get("ALLOWED_ORIGIN") ?? Deno.env.get("SITE_URL") ?? "";
  const requestOrigin = origin ?? "";

  let allowOrigin = allowed || requestOrigin;
  if (allowed && requestOrigin && requestOrigin !== allowed) {
    allowOrigin = allowed;
  }

  return {
    "Access-Control-Allow-Origin": allowOrigin || "*",
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type, x-webhook-secret, x-cron-secret, x-test-secret",
  };
}
