import { describe, it, expect } from "vitest";
import {
  bytesToBase64,
  base64ToBytes,
  bytesToBase64Url,
  base64UrlToBytes,
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

  it("宛名・差出人を往復変換できる（v2）", () => {
    const payload: SecretPayload = {
      ...samplePayload,
      to: "ゆきちゃん",
      from: "おかあさん",
    };
    const decoded = encodedToPayload<SecretPayload>(payloadToEncoded(payload));
    expect(decoded.to).toBe("ゆきちゃん");
    expect(decoded.from).toBe("おかあさん");
  });

  it("宛名・差出人なしのとき to/from は付かない", () => {
    const decoded = encodedToPayload<SecretPayload>(payloadToEncoded(samplePayload));
    expect(decoded.to).toBeUndefined();
    expect(decoded.from).toBeUndefined();
  });

  it("旧バイナリ形式（v1・後方互換）もデコードできる", () => {
    // v1 で配布済みのQRを再現：v2 エンコード結果から宛名・差出人ブロックを抜き、
    // version バイトを 1 に戻したもの
    const encoded = payloadToEncoded(samplePayload);
    const bytes = base64UrlToBytes(encoded);
    const saltLen = bytes[6];
    const ivLen = bytes[6 + 1 + saltLen];
    const hintLenOffset = 6 + 1 + saltLen + 1 + ivLen + 1;
    const hintLen = bytes[hintLenOffset] | (bytes[hintLenOffset + 1] << 8);
    const namesOffset = hintLenOffset + 2 + hintLen;
    // 宛名長(0)・差出人長(0) の 2 バイトを取り除く
    const v1bytes = new Uint8Array(bytes.length - 2);
    v1bytes.set(bytes.slice(0, namesOffset), 0);
    v1bytes.set(bytes.slice(namesOffset + 2), namesOffset);
    v1bytes[0] = 1;
    const decoded = encodedToPayload<SecretPayload>(bytesToBase64Url(v1bytes));
    expect(decoded).toEqual(samplePayload);
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
