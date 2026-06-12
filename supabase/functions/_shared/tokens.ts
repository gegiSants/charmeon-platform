type ConfirmationAction = "confirm" | "cancel";

async function getHmacKey(): Promise<CryptoKey> {
  const secret = Deno.env.get("CONFIRMATION_TOKEN_SECRET");
  if (!secret) {
    throw new Error("CONFIRMATION_TOKEN_SECRET não configurado");
  }
  return crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}

function toBase64Url(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function fromBase64Url(value: string): Uint8Array {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/");
  const binary = atob(padded);
  return Uint8Array.from(binary, (c) => c.charCodeAt(0));
}

export async function generateConfirmationToken(
  appointmentId: string,
  action: ConfirmationAction,
  expiresInHours = 72,
): Promise<string> {
  const expiry = Math.floor(Date.now() / 1000) + expiresInHours * 3600;
  const payload = `${appointmentId}:${action}:${expiry}`;
  const key = await getHmacKey();
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(payload),
  );
  return `${payload}:${toBase64Url(new Uint8Array(signature))}`;
}

export async function verifyConfirmationToken(
  token: string,
): Promise<{ appointmentId: string; action: ConfirmationAction } | null> {
  const parts = token.split(":");
  if (parts.length !== 4) return null;

  const [appointmentId, action, expiryStr, signatureB64] = parts;
  if (action !== "confirm" && action !== "cancel") return null;

  const expiry = Number(expiryStr);
  if (!Number.isFinite(expiry) || expiry < Math.floor(Date.now() / 1000)) {
    return null;
  }

  const payload = `${appointmentId}:${action}:${expiryStr}`;
  const key = await getHmacKey();

  const valid = await crypto.subtle.verify(
    "HMAC",
    key,
    fromBase64Url(signatureB64),
    new TextEncoder().encode(payload),
  );

  if (!valid) return null;
  return { appointmentId, action };
}
