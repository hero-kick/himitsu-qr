import type { InputFormat } from "../types/secretPayload";

/**
 * 入力形式ごとに許可する1文字の正規表現。
 * null を返す形式（指定なし・記号あり）は文字を制限しない。
 */
export function allowedCharPattern(format: InputFormat): RegExp | null {
  switch (format) {
    case "ひらがなのみ":
      return /[぀-ゟー]/; // ひらがな + 長音符（ー）
    case "カタカナのみ":
      return /[゠-ヿ]/; // カタカナ（ー・含む）
    case "漢字あり":
      return /[぀-ヿ一-鿿]/; // 漢字 + かな
    case "数字のみ":
      return /[0-9]/;
    case "英字のみ":
      return /[A-Za-z]/;
    case "英数字":
      return /[A-Za-z0-9]/;
    case "指定なし":
    case "記号あり":
    default:
      return null;
  }
}

/** 形式に合わない文字を取り除いた文字列を返す */
export function filterToFormat(value: string, format: InputFormat): string {
  const pattern = allowedCharPattern(format);
  if (!pattern) return value;
  return Array.from(value)
    .filter((ch) => pattern.test(ch))
    .join("");
}

/** あいことばが形式に一致しているか（= 不正な文字を含まないか） */
export function matchesFormat(value: string, format: InputFormat): boolean {
  return filterToFormat(value, format) === value;
}

/** モバイルキーボードに渡す inputMode */
export function inputModeForFormat(
  format: InputFormat
): "numeric" | "text" {
  return format === "数字のみ" ? "numeric" : "text";
}
