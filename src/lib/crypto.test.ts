import { describe, it, expect } from "vitest";
import { encryptMessage, decryptMessage } from "./crypto";
import type { InputFormat } from "../types/secretPayload";

describe("encryptMessage / decryptMessage", () => {
  it("暗号化→復号の往復で元のメッセージが得られる", async () => {
    const message = "誕生日おめでとう。いつもありがとう。";
    const passphrase = "カフェルナ";
    const hint = "初めて一緒に行ったカフェの名前";
    const format: InputFormat = "カタカナのみ";
    const showLength = true;

    const payload = await encryptMessage(message, passphrase, hint, format, showLength);
    const decrypted = await decryptMessage(payload, passphrase);

    expect(decrypted).toBe(message);
  });

  it("誤ったパスフレーズでは復号に失敗する", async () => {
    const payload = await encryptMessage("秘密", "正しいパス", "", "指定なし", false);

    await expect(decryptMessage(payload, "間違いパス")).rejects.toThrow();
  });

  it("ペイロードに正しいメタデータが含まれる", async () => {
    const payload = await encryptMessage("test", "pass1234", "hint", "英字のみ", true);

    expect(payload.v).toBe(1);
    expect(payload.app).toBe("himitsu-qr");
    expect(payload.alg).toBe("AES-GCM");
    expect(payload.kdf).toBe("PBKDF2-SHA256");
    expect(payload.iter).toBe(300_000);
    expect(payload.hint).toBe("hint");
    expect(payload.format).toBe("英字のみ");
    expect(payload.showLength).toBe(true);
    expect(payload.length).toBe(8);
  });

  it("showLength=false のとき length が含まれない", async () => {
    const payload = await encryptMessage("test", "pass", "", "指定なし", false);
    expect(payload.length).toBeUndefined();
  });

  it("salt と iv は毎回異なる", async () => {
    const p1 = await encryptMessage("msg", "pass", "", "指定なし", false);
    const p2 = await encryptMessage("msg", "pass", "", "指定なし", false);

    expect(p1.salt).not.toBe(p2.salt);
    expect(p1.iv).not.toBe(p2.iv);
  });

  it("サロゲートペア文字の文字数が正しくカウントされる", async () => {
    const payload = await encryptMessage("test", "🎉🎉🎉", "", "指定なし", true);
    expect(payload.length).toBe(3);
  });
});
