import fetch from "node-fetch";

const TENANT_ID = process.env.AZURE_TENANT_ID ?? "";
const CLIENT_ID = process.env.AZURE_CLIENT_ID ?? "";
const CLIENT_SECRET = process.env.AZURE_CLIENT_SECRET ?? "";
const BACKEND_SCOPE = process.env.BACKEND_SCOPE ?? `api://${CLIENT_ID}/.default`;

interface TokenCache {
  token: string;
  expiresAt: number;
}

let cache: TokenCache | null = null;

/**
 * Obtains a service-to-service access token (client credentials flow)
 * for the bot to call the second-look backend API.
 */
export async function getServiceToken(): Promise<string> {
  if (cache && Date.now() < cache.expiresAt - 60_000) {
    return cache.token;
  }

  const url = `https://login.microsoftonline.com/${TENANT_ID}/oauth2/v2.0/token`;
  const body = new URLSearchParams({
    grant_type: "client_credentials",
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET,
    scope: BACKEND_SCOPE,
  });

  const res = await fetch(url, { method: "POST", body });
  if (!res.ok) {
    throw new Error(`Token request failed: ${res.status} ${await res.text()}`);
  }

  const data = (await res.json()) as { access_token: string; expires_in: number };
  cache = { token: data.access_token, expiresAt: Date.now() + data.expires_in * 1000 };
  return cache.token;
}
