import { describe, it, expect } from "vitest";
import {
  bytesToBase64,
  base64ToBytes,
  base64UrlEncodeString,
  base64UrlDecodeString,
  payloadToEncoded,
  encodedToPayload,
} from "./encoding";
import type { SecretPayload } from "../types/secretPayload";

describe("bytesToBase64 / base64ToBytes", () => {
  it("空のバイト列を往復変換できる", () => {
    const bytes = new Uint8Array([]);
    const b64 = bytesToBase64(bytes);
    const decoded = base64ToBytes(b64);
    expect(decoded).toEqual(bytes);
  });

  it("任意のバイト列を往復変換できる", () => {
    const bytes = new Uint8Array([0, 1, 127, 128, 255]);
    const b64 = bytesToBase64(bytes);
    const decoded = base64ToBytes(b64);
    expect(decoded).toEqual(bytes);
  });

  it("16バイトのランダムデータを往復変換できる", () => {
    const bytes = crypto.getRandomValues(new Uint8Array(16));
    const b64 = bytesToBase64(bytes);
    const decoded = base64ToBytes(b64);
    expect(decoded).toEqual(bytes);
  });
});

describe("base64UrlEncodeString / base64UrlDecodeString", () => {
  it("ASCII文字列を往復変換できる", () => {
    const str = "Hello, World!";
    const encoded = base64UrlEncodeString(str);
    expect(encoded).not.toContain("+");
    expect(encoded).not.toContain("/");
    expect(encoded).not.toContain("=");
    const decoded = base64UrlDecodeString(encoded);
    expect(decoded).toBe(str);
  });

  it("日本語文字列を往復変換できる", () => {
    const str = "誕生日おめでとう。カフェルナ🎉";
    const encoded = base64UrlEncodeString(str);
    const decoded = base64UrlDecodeString(encoded);
    expect(decoded).toBe(str);
  });

  it("空文字列を往復変換できる", () => {
    const encoded = base64UrlEncodeString("");
    const decoded = base64UrlDecodeString(encoded);
    expect(decoded).toBe("");
  });
});

describe("payloadToEncoded / encodedToPayload", () => {
  const samplePayload: SecretPayload = {
    v: 1,
    app: "himitsu-qr",
    alg: "AES-GCM",
    kdf: "PBKDF2-SHA256",
    iter: 300000,
    salt: bytesToBase64(crypto.getRandomValues(new Uint8Array(16))),
    iv: bytesToBase64(crypto.getRandomValues(new Uint8Array(12))),
    hint: "初めて行ったカフェ",
    format: "カタカナのみ",
    showLength: true,
    length: 5,
    ciphertext: bytesToBase64(crypto.getRandomValues(new Uint8Array(48))),
  };

  it("SecretPayload を往復変換できる", () => {
    const encoded = payloadToEncoded(samplePayload);
    const decoded = encodedToPayload<SecretPayload>(encoded);
    expect(decoded).toEqual(samplePayload);
  });

  it("showLength=false のとき length は付かない", () => {
    const payload: SecretPayload = { ...samplePayload, showLength: false };
    delete payload.length;
    const decoded = encodedToPayload<SecretPayload>(payloadToEncoded(payload));
    expect(decoded.showLength).toBe(false);
    expect(decoded.length).toBeUndefined();
  });

  it("ヒントなし・指定なし形式でも往復できる", () => {
    const payload: SecretPayload = {
      ...samplePayload,
      hint: "",
      format: "指定なし",
      showLength: false,
    };
    delete payload.length;
    const decoded = encodedToPayload<SecretPayload>(payloadToEncoded(payload));
    expect(decoded.hint).toBe("");
    expect(decoded.format).toBe("指定なし");
  });

  it("コンパクト形式は旧JSON形式より短い", () => {
    const compact = payloadToEncoded(samplePayload);
    const legacyJson = base64UrlEncodeString(JSON.stringify(samplePayload));
    expect(compact.length).toBeLessThan(legacyJson.length);
  });

  it("旧JSON形式（後方互換）もデコードできる", () => {
    const legacy = base64UrlEncodeString(JSON.stringify(samplePayload));
    const decoded = encodedToPayload<SecretPayload>(legacy);
    expect(decoded).toEqual(samplePayload);
  });

  it("不正なエンコード文字列でエラーが発生する", () => {
    expect(() => encodedToPayload("!!!invalid!!!")).toThrow();
  });
});
