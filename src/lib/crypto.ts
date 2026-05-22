import { bytesToBase64, base64ToBytes } from "./encoding";
import type { SecretPayload, InputFormat } from "../types/secretPayload";

const PBKDF2_ITERATIONS = 300_000;
const SALT_LENGTH = 16; // bytes
const IV_LENGTH = 12; // bytes

/** Uint8Array から ArrayBuffer を安全に取得（TypeScript 6 の型互換対応） */
function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  return (bytes.buffer as ArrayBuffer).slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
}

/** あいことばとsaltからAES-GCM 256bit鍵を導出 */
async function deriveKey(
  passphrase: string,
  salt: Uint8Array
): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    encoder.encode(passphrase),
    "PBKDF2",
    false,
    ["deriveKey"]
  );

  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: toArrayBuffer(salt),
      iterations: PBKDF2_ITERATIONS,
      hash: "SHA-256",
    },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

/** メッセージを暗号化し、SecretPayload を返す */
export async function encryptMessage(
  message: string,
  passphrase: string,
  hint: string,
  format: InputFormat,
  showLength: boolean
): Promise<SecretPayload> {
  const salt = crypto.getRandomValues(new Uint8Array(SALT_LENGTH));
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
  const key = await deriveKey(passphrase, salt);

  const encoder = new TextEncoder();
  const cipherBuffer = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: toArrayBuffer(iv) },
    key,
    encoder.encode(message)
  );

  const payload: SecretPayload = {
    v: 1,
    app: "himitsu-qr",
    alg: "AES-GCM",
    kdf: "PBKDF2-SHA256",
    iter: PBKDF2_ITERATIONS,
    salt: bytesToBase64(salt),
    iv: bytesToBase64(iv),
    hint,
    format,
    showLength,
    ciphertext: bytesToBase64(new Uint8Array(cipherBuffer)),
  };

  if (showLength) {
    payload.length = [...passphrase].length; // サロゲートペア対応
  }

  return payload;
}

/** SecretPayload とあいことばから復号を試みる */
export async function decryptMessage(
  payload: SecretPayload,
  passphrase: string
): Promise<string> {
  const salt = base64ToBytes(payload.salt);
  const iv = base64ToBytes(payload.iv);
  const ciphertext = base64ToBytes(payload.ciphertext);
  const key = await deriveKey(passphrase, salt);

  const plainBuffer = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: toArrayBuffer(iv) },
    key,
    toArrayBuffer(ciphertext)
  );

  return new TextDecoder().decode(plainBuffer);
}
