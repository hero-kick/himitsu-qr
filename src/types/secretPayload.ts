/** QRコードに格納される暗号化ペイロード */
export type SecretPayload = {
  /** ペイロードバージョン */
  v: number;
  /** アプリ識別子 */
  app: "himitsu-qr";
  /** 暗号化アルゴリズム */
  alg: "AES-GCM";
  /** 鍵導出関数 */
  kdf: "PBKDF2-SHA256";
  /** PBKDF2 イテレーション回数 */
  iter: number;
  /** Base64エンコードされたsalt */
  salt: string;
  /** Base64エンコードされたiv */
  iv: string;
  /** あいことばのヒント */
  hint: string;
  /** 入力形式（指定なし / ひらがなのみ / カタカナのみ 等） */
  format: string;
  /** 文字数ヒントを表示するか */
  showLength: boolean;
  /** あいことばの文字数（showLength=true のときのみ） */
  length?: number;
  /** Base64エンコードされた暗号文 */
  ciphertext: string;
};

/** 入力形式の選択肢 */
export const INPUT_FORMATS = [
  "指定なし",
  "ひらがなのみ",
  "カタカナのみ",
  "漢字あり",
  "数字のみ",
  "英字のみ",
  "英数字",
  "記号あり",
] as const;

export type InputFormat = (typeof INPUT_FORMATS)[number];
