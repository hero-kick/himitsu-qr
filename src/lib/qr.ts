import QRCode from "qrcode";

/** テキストからQRコードのDataURL（PNG）を生成 */
export async function generateQRCodeDataUrl(text: string): Promise<string> {
  return QRCode.toDataURL(text, {
    errorCorrectionLevel: "M",
    margin: 2,
    width: 512,
    color: {
      dark: "#2D3436",
      light: "#FFFFFF",
    },
  });
}

/** QRコードに格納可能なおおよその文字数上限を超えているか判定 */
export function isQRDataTooLong(text: string): boolean {
  // QRコードのバイナリモードでの実用上限（約2,900バイト程度が読み取り可能上限）
  const byteLength = new TextEncoder().encode(text).length;
  return byteLength > 2500;
}
