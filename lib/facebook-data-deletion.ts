/**
 * Facebook Data Deletion Request callback helpers.
 * @see https://developers.facebook.com/docs/development/create-an-app/app-dashboard/data-deletion-callback
 */

function base64UrlToBytes(value: string): Uint8Array {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/");
  const pad = padded.length % 4 === 0 ? "" : "=".repeat(4 - (padded.length % 4));
  const binary = atob(padded + pad);
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) out[i] = binary.charCodeAt(i);
  return out;
}

function bytesToBase64Url(bytes: ArrayBuffer | Uint8Array): string {
  const view = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let binary = "";
  for (let i = 0; i < view.length; i++) binary += String.fromCharCode(view[i]!);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

export type FacebookSignedRequest = {
  user_id?: string;
  algorithm?: string;
  issued_at?: number;
};

/** Decode + HMAC-verify Facebook `signed_request`. Returns null if invalid. */
export async function parseFacebookSignedRequest(
  signedRequest: string,
  appSecret: string,
): Promise<FacebookSignedRequest | null> {
  const parts = signedRequest.split(".");
  if (parts.length !== 2) return null;
  const [encodedSig, encodedPayload] = parts;
  if (!encodedSig || !encodedPayload) return null;

  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(appSecret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const expected = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(encodedPayload),
  );
  const expectedB64 = bytesToBase64Url(expected);
  if (expectedB64 !== encodedSig) return null;

  try {
    const json = new TextDecoder().decode(base64UrlToBytes(encodedPayload));
    const payload = JSON.parse(json) as FacebookSignedRequest;
    if ((payload.algorithm ?? "HMAC-SHA256").toUpperCase() !== "HMAC-SHA256") {
      return null;
    }
    return payload;
  } catch {
    return null;
  }
}

export function deletionConfirmationCode(userId: string): string {
  const stamp = Date.now().toString(36);
  const id = userId.replace(/[^a-zA-Z0-9]/g, "").slice(0, 12) || "user";
  return `ec-${id}-${stamp}`;
}
