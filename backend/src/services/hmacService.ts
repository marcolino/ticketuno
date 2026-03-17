import crypto from "crypto";

// ─── Config ───────────────────────────────────────────────────────────────────
//
// In production, load this from an environment variable or a secrets manager.
// Never commit the real secret to source control.

const HMAC_SECRET = process.env.TICKET_HMAC_SECRET; // TODO
const HMAC_ALGO = "sha256";

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Builds a stable, deterministic string from the payload fields.
 * Fields are sorted alphabetically so the signature never depends
 * on insertion order.
 */
function buildSignatureInput(fields: Record<string, unknown>): string {
  return Object.keys(fields)
    .sort()
    .map((key) => `${key}=${String(fields[key])}`)
    .join("&")
  ;
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Returns an HMAC-SHA256 hex digest for the given payload fields.
 * The `sig` field itself is excluded before signing.
 */
export function sign(fields: Record<string, unknown>): string {
  const { sig: _excluded, ...signable } = fields as Record<string, unknown>;
  const input = buildSignatureInput(signable);

  return crypto
    .createHmac(HMAC_ALGO, HMAC_SECRET!)
    .update(input, "utf8")
    .digest("hex");
}

/**
 * Returns true when the `sig` field inside `fields` matches a fresh signature
 * computed from the remaining fields.  Comparison is timing-safe.
 */
export function verify(fields: Record<string, unknown>): boolean {
  const provided  = String(fields.sig ?? "");
  const expected  = sign(fields);              // sign() ignores the `sig` field

  // timingSafeEqual requires same-length buffers
  if (provided.length !== expected.length) return false;

  return crypto.timingSafeEqual(
    Buffer.from(provided, "hex"),
    Buffer.from(expected, "hex"),
  );
}
