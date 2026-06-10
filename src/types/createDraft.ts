import type { InputFormat } from "./secretPayload";

/** 作成中の入力内容（結果画面から「修正」で戻ったときに復元するため） */
export interface CreateDraft {
  message: string;
  passphrase: string;
  passphraseConfirm: string;
  hint: string;
  format: InputFormat;
  showLength: boolean;
  to: string;
  from: string;
}

export const EMPTY_DRAFT: CreateDraft = {
  message: "",
  passphrase: "",
  passphraseConfirm: "",
  hint: "",
  format: "指定なし",
  showLength: false,
  to: "",
  from: "",
};
