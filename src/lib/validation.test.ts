import { describe, it, expect } from "vitest";
import {
  evaluateStrength,
  doesHintContainAnswer,
  validateInputs,
  canCreate,
  isValidPayload,
} from "./validation";

describe("evaluateStrength", () => {
  it("4文字未満は low", () => {
    const result = evaluateStrength("abc", "", false);
    expect(result.level).toBe("low");
  });

  it("数字のみ8文字未満は low", () => {
    const result = evaluateStrength("12345", "", false);
    expect(result.level).toBe("low");
  });

  it("ヒントに答えが含まれていると low", () => {
    const result = evaluateStrength("カフェルナ", "カフェルナの名前", false);
    expect(result.level).toBe("low");
  });

  it("8文字以上で medium", () => {
    const result = evaluateStrength("あいうえおかき", "", false);
    expect(result.level).toBe("medium");
  });

  it("16文字以上・数字のみではない → high", () => {
    const result = evaluateStrength("あいうえおかきくけこさしすせそた", "", false);
    expect(result.level).toBe("high");
  });

  it("10文字以上・数字のみではない・文字数ヒントなし → high", () => {
    const result = evaluateStrength("あいうえおかきくけこ", "", false);
    expect(result.level).toBe("high");
  });

  it("10文字以上でも文字数ヒントありなら medium", () => {
    const result = evaluateStrength("あいうえおかきくけこ", "", true);
    expect(result.level).toBe("medium");
  });
});

describe("doesHintContainAnswer", () => {
  it("ヒントに答えが含まれていれば true", () => {
    expect(doesHintContainAnswer("答えはカフェルナ", "カフェルナ")).toBe(true);
  });

  it("大文字小文字を無視する", () => {
    expect(doesHintContainAnswer("Answer is Hello", "hello")).toBe(true);
  });

  it("含まれていなければ false", () => {
    expect(doesHintContainAnswer("初めてのカフェ", "カフェルナ")).toBe(false);
  });

  it("空文字列では false", () => {
    expect(doesHintContainAnswer("", "test")).toBe(false);
    expect(doesHintContainAnswer("hint", "")).toBe(false);
  });
});

describe("validateInputs", () => {
  it("メッセージが空なら error", () => {
    const warnings = validateInputs("", "pass", "pass", "", "指定なし");
    expect(warnings.some((w) => w.type === "error")).toBe(true);
  });

  it("あいことばが空なら error", () => {
    const warnings = validateInputs("msg", "", "", "", "指定なし");
    expect(warnings.some((w) => w.type === "error")).toBe(true);
  });

  it("確認が一致しなければ error", () => {
    const warnings = validateInputs("msg", "pass1", "pass2", "", "指定なし");
    expect(warnings.some((w) => w.type === "error" && w.message.includes("一致"))).toBe(true);
  });

  it("バリデーション通過時は error なし", () => {
    const warnings = validateInputs("メッセージ", "カフェルナテスト", "カフェルナテスト", "ヒント", "指定なし");
    expect(warnings.filter((w) => w.type === "error")).toHaveLength(0);
  });

  it("入力形式に合わない文字があれば error", () => {
    const warnings = validateInputs("msg", "abc123", "abc123", "", "数字のみ");
    expect(warnings.some((w) => w.type === "error" && w.message.includes("以外の文字"))).toBe(true);
  });

  it("入力形式に合致していれば形式エラーなし", () => {
    const warnings = validateInputs("msg", "12345678", "12345678", "", "数字のみ");
    expect(warnings.some((w) => w.message.includes("以外の文字"))).toBe(false);
  });
});

describe("canCreate", () => {
  it("全条件満たせば true", () => {
    expect(canCreate("msg", "pass", "pass", "指定なし")).toBe(true);
  });

  it("メッセージが空なら false", () => {
    expect(canCreate("", "pass", "pass", "指定なし")).toBe(false);
  });

  it("確認不一致なら false", () => {
    expect(canCreate("msg", "pass", "wrong", "指定なし")).toBe(false);
  });

  it("入力形式に合わなければ false", () => {
    expect(canCreate("msg", "abc", "abc", "数字のみ")).toBe(false);
  });

  it("入力形式に合致すれば true", () => {
    expect(canCreate("msg", "12345", "12345", "数字のみ")).toBe(true);
  });
});

describe("isValidPayload", () => {
  const validPayload = {
    v: 1,
    app: "himitsu-qr",
    alg: "AES-GCM",
    kdf: "PBKDF2-SHA256",
    iter: 300000,
    salt: "abc123",
    iv: "def456",
    hint: "ヒント",
    format: "カタカナのみ",
    showLength: true,
    length: 5,
    ciphertext: "encrypted",
  };

  it("正しいペイロードを受け入れる", () => {
    expect(isValidPayload(validPayload)).toBe(true);
  });

  it("null を拒否する", () => {
    expect(isValidPayload(null)).toBe(false);
  });

  it("app が異なれば拒否する", () => {
    expect(isValidPayload({ ...validPayload, app: "other" })).toBe(false);
  });

  it("必須フィールドが欠けていたら拒否する", () => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { ciphertext: _omitted, ...incomplete } = validPayload;
    expect(isValidPayload(incomplete)).toBe(false);
  });

  it("v が 1 以外なら拒否する", () => {
    expect(isValidPayload({ ...validPayload, v: 2 })).toBe(false);
  });
});
