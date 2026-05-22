import type { SecretPayload, InputFormat } from "../types/secretPayload";
import { matchesFormat } from "./passphraseFormat";

export type StrengthLevel = "low" | "medium" | "high";

export interface StrengthResult {
  level: StrengthLevel;
  label: string;
  description: string;
}

export interface ValidationWarning {
  type: "error" | "warning" | "info";
  message: string;
}

/** パースされたオブジェクトが SecretPayload の構造を持つか検証 */
export function isValidPayload(obj: unknown): obj is SecretPayload {
  if (typeof obj !== "object" || obj === null) return false;
  const o = obj as Record<string, unknown>;
  return (
    o.v === 1 &&
    o.app === "himitsu-qr" &&
    o.alg === "AES-GCM" &&
    o.kdf === "PBKDF2-SHA256" &&
    typeof o.iter === "number" &&
    typeof o.salt === "string" &&
    typeof o.iv === "string" &&
    typeof o.hint === "string" &&
    typeof o.format === "string" &&
    typeof o.showLength === "boolean" &&
    typeof o.ciphertext === "string"
  );
}

/** あいことばの安全度を判定 */
export function evaluateStrength(
  passphrase: string,
  hint: string,
  showLength: boolean
): StrengthResult {
  const len = [...passphrase].length; // サロゲートペア対応
  const isNumericOnly = /^\d+$/.test(passphrase);
  const hintContainsAnswer = doesHintContainAnswer(hint, passphrase);

  // 低い
  if (len < 4 || hintContainsAnswer) {
    return {
      level: "low",
      label: "推測されやすい",
      description: "誰でも開けてしまうかもしれません",
    };
  }

  if (isNumericOnly && len < 8) {
    return {
      level: "low",
      label: "推測されやすい",
      description: "数字だけだと試しやすいため、もう少し長くするのがおすすめです",
    };
  }

  // 高い
  if (len >= 16 && !isNumericOnly && !hintContainsAnswer) {
    return {
      level: "high",
      label: "かなり開けにくい",
      description: "あいことばを知らない人にはまず開けません",
    };
  }

  if (len >= 10 && !isNumericOnly && !showLength) {
    return {
      level: "high",
      label: "かなり開けにくい",
      description: "あいことばを知らない人にはまず開けません",
    };
  }

  // ふつう
  return {
    level: "medium",
    label: "サプライズ用途ならOK",
    description: "友人や家族へのメッセージにちょうどよい安全度です",
  };
}

/** ヒントにあいことばそのものが含まれていないかチェック */
export function doesHintContainAnswer(
  hint: string,
  passphrase: string
): boolean {
  if (!hint || !passphrase) return false;
  const normalizedHint = hint.toLowerCase().trim();
  const normalizedPass = passphrase.toLowerCase().trim();
  return normalizedHint.includes(normalizedPass);
}

/** 入力バリデーションの警告リストを返す */
export function validateInputs(
  message: string,
  passphrase: string,
  passphraseConfirm: string,
  hint: string,
  format: InputFormat
): ValidationWarning[] {
  const warnings: ValidationWarning[] = [];
  const len = [...passphrase].length;

  if (!message.trim()) {
    warnings.push({ type: "error", message: "秘密のメッセージを入力してください" });
  }

  if (!passphrase) {
    warnings.push({ type: "error", message: "あいことばを入力してください" });
  }

  // 入力形式と中身の食い違いはブロック（形式が「嘘」にならないように）
  if (passphrase && !matchesFormat(passphrase, format)) {
    warnings.push({
      type: "error",
      message: `あいことばに「${format}」以外の文字が含まれています`,
    });
  }

  if (passphrase && passphraseConfirm && passphrase !== passphraseConfirm) {
    warnings.push({ type: "error", message: "あいことばが一致しません" });
  }

  if (passphrase && !passphraseConfirm) {
    warnings.push({ type: "error", message: "あいことば（確認）を入力してください" });
  }

  if (passphrase && len < 4) {
    warnings.push({
      type: "warning",
      message: "あいことばが短すぎます（4文字以上を推奨）",
    });
  } else if (passphrase && len < 8) {
    warnings.push({
      type: "info",
      message: "あいことばがやや短めです（8文字以上がおすすめ）",
    });
  }

  if (passphrase && /^\d+$/.test(passphrase) && len < 8) {
    warnings.push({
      type: "warning",
      message: "数字のみで短いあいことばは推測されやすくなります",
    });
  }

  if (doesHintContainAnswer(hint, passphrase)) {
    warnings.push({
      type: "warning",
      message: "ヒントにあいことばそのものが含まれています",
    });
  }

  return warnings;
}

/** 作成可能な状態かどうか判定 */
export function canCreate(
  message: string,
  passphrase: string,
  passphraseConfirm: string,
  format: InputFormat
): boolean {
  return (
    message.trim().length > 0 &&
    passphrase.length > 0 &&
    passphrase === passphraseConfirm &&
    matchesFormat(passphrase, format)
  );
}
