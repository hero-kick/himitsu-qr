/** Uint8Array → 標準Base64文字列 */
export function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/** 標準Base64文字列 → Uint8Array */
export function base64ToBytes(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

/** 文字列 → Base64URL（URLセーフ） */
export function base64UrlEncodeString(str: string): string {
  const utf8 = new TextEncoder().encode(str);
  const base64 = bytesToBase64(utf8);
  return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/** Base64URL → 文字列 */
export function base64UrlDecodeString(encoded: string): string {
  let base64 = encoded.replace(/-/g, "+").replace(/_/g, "/");
  // パディング補完
  while (base64.length % 4 !== 0) {
    base64 += "=";
  }
  const bytes = base64ToBytes(base64);
  return new TextDecoder().decode(bytes);
}

/** SecretPayload オブジェクト → Base64URLエンコード文字列 */
export function payloadToEncoded(payload: object): string {
  const json = JSON.stringify(payload);
  return base64UrlEncodeString(json);
}

/** Base64URLエンコード文字列 → パースされたオブジェクト */
export function encodedToPayload<T>(encoded: string): T {
  const json = base64UrlDecodeString(encoded);
  return JSON.parse(json) as T;
}
