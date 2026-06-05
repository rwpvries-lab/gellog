import "server-only";

import { createPrivateKey, createSign } from "node:crypto";
import { connect } from "node:http2";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * APNs delivery (server-only). Pairs with the device-side registration in
 * `native-push.ts`, which stores tokens in `device_tokens`. This module signs
 * an APNs provider token (ES256 JWT) and pushes to api.push.apple.com over
 * HTTP/2 — no third-party deps, just node:crypto + node:http2.
 *
 * Required env (set in Vercel — see README/CLAUDE notes):
 *   APNS_PRIVATE_KEY  full .p8 contents, incl. BEGIN/END lines
 *   APNS_KEY_ID       APNs Auth Key ID            (ABP9JKN426)
 *   APNS_TEAM_ID      Apple Developer Team ID     (7N5C924G3K)
 * Optional:
 *   APNS_BUNDLE_ID    push topic (defaults to com.sidusstudio.gellog)
 *   APNS_PRODUCTION   "true" → api.push.apple.com, else sandbox host
 */

const APNS_TOPIC = process.env.APNS_BUNDLE_ID ?? "com.sidusstudio.gellog";
const APNS_HOST =
  process.env.APNS_PRODUCTION === "true"
    ? "https://api.push.apple.com"
    : "https://api.sandbox.push.apple.com";

export interface ApnsPayload {
  title: string;
  body: string;
  /** Merged into the APNs payload alongside `aps`; surfaces in notification handlers. */
  data?: Record<string, string>;
  badge?: number;
  sound?: string;
}

function base64url(input: Buffer | string): string {
  return Buffer.from(input)
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

let cachedToken: { jwt: string; issuedAt: number } | null = null;

/** APNs accepts a provider token for up to 1h; refresh well before that. */
function getProviderToken(): string {
  const keyId = process.env.APNS_KEY_ID;
  const teamId = process.env.APNS_TEAM_ID;
  const privateKeyRaw = process.env.APNS_PRIVATE_KEY;
  if (!keyId || !teamId || !privateKeyRaw) {
    throw new Error(
      "APNS_KEY_ID, APNS_TEAM_ID and APNS_PRIVATE_KEY must be set",
    );
  }

  const now = Math.floor(Date.now() / 1000);
  if (cachedToken && now - cachedToken.issuedAt < 50 * 60) {
    return cachedToken.jwt;
  }

  // Vercel env vars often store the PEM with escaped newlines — normalise.
  const pem = privateKeyRaw.replace(/\\n/g, "\n");
  const key = createPrivateKey(pem);

  const header = base64url(JSON.stringify({ alg: "ES256", kid: keyId }));
  const claims = base64url(JSON.stringify({ iss: teamId, iat: now }));
  const signingInput = `${header}.${claims}`;

  // ES256 → JOSE needs raw r||s, not DER, hence the ieee-p1363 encoding.
  const signature = createSign("SHA256")
    .update(signingInput)
    .sign({ key, dsaEncoding: "ieee-p1363" });

  const jwt = `${signingInput}.${base64url(signature)}`;
  cachedToken = { jwt, issuedAt: now };
  return jwt;
}

interface ApnsResult {
  token: string;
  status: number;
  /** APNs `reason` from the JSON error body, when present. */
  reason?: string;
}

/** POST one notification to one device token over HTTP/2. */
function sendToToken(
  client: ReturnType<typeof connect>,
  jwt: string,
  deviceToken: string,
  payload: ApnsPayload,
): Promise<ApnsResult> {
  const body = JSON.stringify({
    aps: {
      alert: { title: payload.title, body: payload.body },
      sound: payload.sound ?? "default",
      ...(payload.badge !== undefined ? { badge: payload.badge } : {}),
    },
    ...payload.data,
  });

  return new Promise((resolve, reject) => {
    const req = client.request({
      ":method": "POST",
      ":path": `/3/device/${deviceToken}`,
      authorization: `bearer ${jwt}`,
      "apns-topic": APNS_TOPIC,
      "apns-push-type": "alert",
      "content-type": "application/json",
    });

    let status = 0;
    let responseBody = "";
    req.setEncoding("utf8");
    req.on("response", (headers) => {
      status = Number(headers[":status"]) || 0;
    });
    req.on("data", (chunk) => {
      responseBody += chunk;
    });
    req.on("end", () => {
      let reason: string | undefined;
      if (responseBody) {
        try {
          reason = JSON.parse(responseBody).reason;
        } catch {
          /* non-JSON body — leave reason undefined */
        }
      }
      resolve({ token: deviceToken, status, reason });
    });
    req.on("error", reject);

    req.write(body);
    req.end();
  });
}

/**
 * Send a push to every iOS device registered for `userId`. Reuses a single
 * HTTP/2 connection for all of the user's tokens and prunes tokens APNs
 * rejects as permanently invalid (410 / 400 BadDeviceToken).
 */
export async function sendPushToUser(
  supabase: SupabaseClient,
  userId: string,
  payload: ApnsPayload,
): Promise<void> {
  const { data: rows, error } = await supabase
    .from("device_tokens")
    .select("token")
    .eq("user_id", userId)
    .eq("platform", "ios");
  if (error) throw error;

  const tokens = (rows ?? []).map((r) => r.token as string);
  if (tokens.length === 0) return;

  const jwt = getProviderToken();
  const client = connect(APNS_HOST);
  const stale: string[] = [];

  try {
    await new Promise<void>((resolve, reject) => {
      client.once("connect", () => resolve());
      client.once("error", reject);
    });

    const results = await Promise.all(
      tokens.map((token) => sendToToken(client, jwt, token, payload)),
    );

    for (const result of results) {
      if (
        result.status === 410 ||
        (result.status === 400 && result.reason === "BadDeviceToken")
      ) {
        stale.push(result.token);
      } else if (result.status !== 200) {
        console.error(
          `[apns] push to ${result.token.slice(0, 8)}… failed: ${result.status} ${result.reason ?? ""}`,
        );
      }
    }
  } finally {
    client.close();
  }

  if (stale.length > 0) {
    await supabase
      .from("device_tokens")
      .delete()
      .eq("user_id", userId)
      .in("token", stale);
  }
}
