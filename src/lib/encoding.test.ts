import { describe, it, expect } from "vitest";
import {
  bytesToBase64,
  base64ToBytes,
  base64UrlEncodeString,
  base64UrlDecodeString,
  payloadToEncoded,
  encodedToPayload,
} from "./encoding";

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
  it("オブジェクトを往復変換できる", () => {
    const payload = {
      v: 1,
      app: "himitsu-qr",
      message: "テスト",
      nested: { a: 1, b: [2, 3] },
    };
    const encoded = payloadToEncoded(payload);
    const decoded = encodedToPayload<typeof payload>(encoded);
    expect(decoded).toEqual(payload);
  });

  it("不正なエンコード文字列でエラーが発生する", () => {
    expect(() => encodedToPayload("!!!invalid!!!")).toThrow();
  });
});
