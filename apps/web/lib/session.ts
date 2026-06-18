import type { Role } from '@koma/iam';

export type SessionPayload = {
  userId: string;
  role: Role;
  /** 有効期限（epoch ミリ秒） */
  exp: number;
};

function base64urlEncode(data: ArrayBuffer | Uint8Array): string {
  const bytes = data instanceof Uint8Array ? data : new Uint8Array(data);
  let binary = '';
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

function base64urlDecode(str: string): Uint8Array<ArrayBuffer> {
  const padded = str.replace(/-/g, '+').replace(/_/g, '/');
  const padLength = (4 - (padded.length % 4)) % 4;
  const padded2 = padded + '='.repeat(padLength);
  const binary = atob(padded2);
  const buffer = new ArrayBuffer(binary.length);
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

async function importHmacKey(secret: string): Promise<CryptoKey> {
  const keyData = new TextEncoder().encode(secret);
  return crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify'],
  );
}

/**
 * セッションペイロードを署名して `base64url(JSON).base64url(署名)` 形式のトークンを返す。
 * Web Crypto (HMAC-SHA256) を使用。Cookie の set はスコープ外。
 */
export async function signSession(
  payload: SessionPayload,
  secret: string,
): Promise<string> {
  const encoder = new TextEncoder();
  const payloadJson = JSON.stringify(payload);
  const payloadPart = base64urlEncode(encoder.encode(payloadJson));

  const key = await importHmacKey(secret);
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(payloadPart));
  const signaturePart = base64urlEncode(signature);

  return `${payloadPart}.${signaturePart}`;
}

/**
 * トークンを検証し、有効なら SessionPayload を返す。
 * 署名不一致・形式不正・`now >= exp` の場合は null を返す。
 * `now` 省略時は `Date.now()` を使用。
 */
export async function verifySession(
  token: string,
  secret: string,
  now?: number,
): Promise<SessionPayload | null> {
  try {
    const dotIndex = token.indexOf('.');
    if (dotIndex === -1) return null;

    const payloadPart = token.slice(0, dotIndex);
    const signaturePart = token.slice(dotIndex + 1);

    if (!payloadPart || !signaturePart) return null;

    const encoder = new TextEncoder();
    const key = await importHmacKey(secret);
    const signatureBytes = base64urlDecode(signaturePart);

    const valid = await crypto.subtle.verify(
      'HMAC',
      key,
      signatureBytes,
      encoder.encode(payloadPart),
    );
    if (!valid) return null;

    const payloadBytes = base64urlDecode(payloadPart);
    const payloadJson = new TextDecoder().decode(payloadBytes);
    const payload = JSON.parse(payloadJson) as SessionPayload;

    const currentTime = now ?? Date.now();
    if (currentTime >= payload.exp) return null;

    return payload;
  } catch {
    return null;
  }
}
