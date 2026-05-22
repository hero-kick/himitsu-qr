import { INPUT_FORMATS } from "../types/secretPayload";
import type { SecretPayload, InputFormat } from "../types/secretPayload";

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

/** Uint8Array → Base64URL（URLセーフ・パディングなし） */
export function bytesToBase64Url(bytes: Uint8Array): string {
  return bytesToBase64(bytes)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

/** Base64URL → Uint8Array */
export function base64UrlToBytes(encoded: string): Uint8Array {
  let base64 = encoded.replace(/-/g, "+").replace(/_/g, "/");
  while (base64.length % 4 !== 0) base64 += "=";
  return base64ToBytes(base64);
}

/** 文字列 → Base64URL（URLセーフ） */
export function base64UrlEncodeString(str: string): string {
  return bytesToBase64Url(new TextEncoder().encode(str));
}

/** Base64URL → 文字列 */
export function base64UrlDecodeString(encoded: string): string {
  return new TextDecoder().decode(base64UrlToBytes(encoded));
}

// --- コンパクトなバイナリ形式 ---
// 旧形式は JSON 文字列を二重に Base64 していて冗長だった。
// QRを小さく（印刷向き）するため、必要なバイトだけを連結して 1 回だけ Base64URL する。
//
// レイアウト（version 1）:
//   [0]       version = 1
//   [1]       flags: bit0=showLength, bit1-3=入力形式インデックス(0-7)
//   [2..5]    iter (uint32 LE)
//   [6]       salt 長 (=16)
//   [7..]     salt
//   [.]       iv 長 (=12)
//   [.]       iv
//   [.]       あいことば文字数（showLength のとき有効、それ以外は0）
//   [.][.]    ヒントのバイト長 (uint16 LE)
//   [.]       ヒント (UTF-8)
//   [残り]    暗号文
const FORMAT_VERSION = 1;
const APP_DEFAULTS = {
  v: 1 as const,
  app: "himitsu-qr" as const,
  alg: "AES-GCM" as const,
  kdf: "PBKDF2-SHA256" as const,
};

/** SecretPayload → コンパクトな Base64URL 文字列 */
export function payloadToEncoded(payload: SecretPayload): string {
  const salt = base64ToBytes(payload.salt);
  const iv = base64ToBytes(payload.iv);
  const ciphertext = base64ToBytes(payload.ciphertext);
  const hintBytes = new TextEncoder().encode(payload.hint);
  const formatIdx = Math.max(0, INPUT_FORMATS.indexOf(payload.format as InputFormat));

  const total =
    1 + 1 + 4 + 1 + salt.length + 1 + iv.length + 1 + 2 + hintBytes.length + ciphertext.length;
  const out = new Uint8Array(total);
  let o = 0;

  out[o++] = FORMAT_VERSION;
  out[o++] = (payload.showLength ? 1 : 0) | ((formatIdx & 0x07) << 1);

  const iter = payload.iter >>> 0;
  out[o++] = iter & 0xff;
  out[o++] = (iter >>> 8) & 0xff;
  out[o++] = (iter >>> 16) & 0xff;
  out[o++] = (iter >>> 24) & 0xff;

  out[o++] = salt.length;
  out.set(salt, o);
  o += salt.length;

  out[o++] = iv.length;
  out.set(iv, o);
  o += iv.length;

  out[o++] = payload.length != null ? Math.min(255, payload.length) : 0;

  out[o++] = hintBytes.length & 0xff;
  out[o++] = (hintBytes.length >>> 8) & 0xff;
  out.set(hintBytes, o);
  o += hintBytes.length;

  out.set(ciphertext, o);

  return bytesToBase64Url(out);
}

/** コンパクト形式（または旧JSON形式）の文字列 → SecretPayload */
export function encodedToPayload<T>(encoded: string): T {
  const bytes = base64UrlToBytes(encoded);
  if (bytes.length === 0) {
    throw new Error("empty payload");
  }

  // 後方互換：旧形式は JSON 文字列なので先頭が '{' (0x7B)
  if (bytes[0] === 0x7b) {
    const json = new TextDecoder().decode(bytes);
    return JSON.parse(json) as T;
  }

  if (bytes[0] !== FORMAT_VERSION) {
    throw new Error(`unsupported payload version: ${bytes[0]}`);
  }
  if (bytes.length < 9) {
    throw new Error("payload too short");
  }

  let o = 1;
  const flags = bytes[o++];
  const showLength = (flags & 0x01) === 0x01;
  const formatIdx = (flags >>> 1) & 0x07;

  const iter =
    (bytes[o] | (bytes[o + 1] << 8) | (bytes[o + 2] << 16) | (bytes[o + 3] << 24)) >>> 0;
  o += 4;

  const saltLen = bytes[o++];
  const salt = bytes.slice(o, o + saltLen);
  o += saltLen;

  const ivLen = bytes[o++];
  const iv = bytes.slice(o, o + ivLen);
  o += ivLen;

  const pwLen = bytes[o++];

  const hintLen = bytes[o] | (bytes[o + 1] << 8);
  o += 2;
  const hint = new TextDecoder().decode(bytes.slice(o, o + hintLen));
  o += hintLen;

  const ciphertext = bytes.slice(o);

  const payload: SecretPayload = {
    ...APP_DEFAULTS,
    iter,
    salt: bytesToBase64(salt),
    iv: bytesToBase64(iv),
    hint,
    format: INPUT_FORMATS[formatIdx] ?? "指定なし",
    showLength,
    ciphertext: bytesToBase64(ciphertext),
  };
  if (showLength) payload.length = pwLen;

  return payload as T;
}
