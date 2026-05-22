import { describe, it, expect } from "vitest";
import {
  filterToFormat,
  matchesFormat,
  inputModeForFormat,
} from "./passphraseFormat";

describe("filterToFormat", () => {
  it("指定なしは何も除去しない", () => {
    expect(filterToFormat("abcあ123!", "指定なし")).toBe("abcあ123!");
  });

  it("記号ありは何も除去しない", () => {
    expect(filterToFormat("ab!@#あ", "記号あり")).toBe("ab!@#あ");
  });

  it("数字のみは数字以外を除去する", () => {
    expect(filterToFormat("a1b2c3", "数字のみ")).toBe("123");
  });

  it("英字のみは英字以外を除去する", () => {
    expect(filterToFormat("ab12CD!", "英字のみ")).toBe("abCD");
  });

  it("英数字は英数字以外を除去する", () => {
    expect(filterToFormat("ab12!あ", "英数字")).toBe("ab12");
  });

  it("ひらがなのみはひらがなと長音符だけ残す", () => {
    expect(filterToFormat("あいカナ漢字ーa1", "ひらがなのみ")).toBe("あいー");
  });

  it("カタカナのみはカタカナだけ残す", () => {
    expect(filterToFormat("アイあいa1", "カタカナのみ")).toBe("アイ");
  });

  it("漢字ありは漢字とかなを残す", () => {
    expect(filterToFormat("漢字あいアab1", "漢字あり")).toBe("漢字あいア");
  });
});

describe("matchesFormat", () => {
  it("形式に合致していれば true", () => {
    expect(matchesFormat("12345", "数字のみ")).toBe(true);
    expect(matchesFormat("あいうえお", "ひらがなのみ")).toBe(true);
  });

  it("不正な文字を含めば false", () => {
    expect(matchesFormat("12a45", "数字のみ")).toBe(false);
    expect(matchesFormat("あいうA", "ひらがなのみ")).toBe(false);
  });

  it("指定なしは常に true", () => {
    expect(matchesFormat("何でもOK!123", "指定なし")).toBe(true);
  });
});

describe("inputModeForFormat", () => {
  it("数字のみは numeric", () => {
    expect(inputModeForFormat("数字のみ")).toBe("numeric");
  });

  it("それ以外は text", () => {
    expect(inputModeForFormat("ひらがなのみ")).toBe("text");
    expect(inputModeForFormat("指定なし")).toBe("text");
  });
});
