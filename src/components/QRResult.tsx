import { useState, useRef, useEffect } from "react";

interface Props {
  qrDataUrl: string;
  qrUrl: string;
  encodedPayload: string;
  lengthWarning: boolean;
  to: string;
  from: string;
  onReset: () => void;
  onEdit: () => void;
  onTestOpen: () => void;
}

type CopyState = "idle" | "copied" | "failed";

/** Canvas に装飾付きQR画像を描画して返す（宛名があれば表書きとして入れる） */
function renderDecoratedQR(qrDataUrl: string, to: string): Promise<HTMLCanvasElement> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const padding = 40;
      const headerH = to ? 44 : 0;
      const footerH = 48;
      const canvasW = img.width + padding * 2;
      const canvasH = img.height + padding * 2 + headerH + footerH;

      const canvas = document.createElement("canvas");
      canvas.width = canvasW;
      canvas.height = canvasH;
      const ctx = canvas.getContext("2d")!;

      // 背景
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.roundRect(0, 0, canvasW, canvasH, 16);
      ctx.fill();

      // 宛名（表書き）
      if (to) {
        ctx.fillStyle = "#2d3436";
        ctx.font = "bold 26px serif";
        ctx.textAlign = "center";
        ctx.fillText(`${to}さんへ`, canvasW / 2, padding + 6);
      }

      // QR画像
      ctx.drawImage(img, padding, padding + headerH);

      // フッターテキスト
      ctx.fillStyle = "#6c5ce7";
      ctx.font = "bold 20px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("🔐 ひみつQR", canvasW / 2, img.height + headerH + padding * 2 + 8);

      ctx.fillStyle = "#b2bec3";
      ctx.font = "13px sans-serif";
      ctx.fillText(
        "あいことばで開く、ひみつのメッセージ",
        canvasW / 2,
        img.height + headerH + padding * 2 + 32
      );

      resolve(canvas);
    };
    img.src = qrDataUrl;
  });
}

/** 装飾付きQR画像を保存（iOS Safari 対応: Web Share API → ダウンロードリンク） */
async function saveDecoratedQR(qrDataUrl: string, to: string): Promise<void> {
  const canvas = await renderDecoratedQR(qrDataUrl, to);

  // Web Share API が使える場合（iOS Safari 等）はファイル共有
  if (navigator.share && navigator.canShare) {
    try {
      const blob = await new Promise<Blob>((resolve) =>
        canvas.toBlob((b) => resolve(b!), "image/png")
      );
      const file = new File([blob], "himitsu-qr.png", { type: "image/png" });
      if (navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file] });
        return;
      }
    } catch (e) {
      // ユーザーがキャンセルした場合は何もしない
      if (e instanceof Error && e.name === "AbortError") return;
      // share に失敗した場合はフォールバック
    }
  }

  // フォールバック：ダウンロードリンク
  const link = document.createElement("a");
  link.download = "himitsu-qr.png";
  link.href = canvas.toDataURL("image/png");
  link.click();
}

export function QRResult({ qrDataUrl, qrUrl, encodedPayload, lengthWarning, to, from, onReset, onEdit, onTestOpen }: Props) {
  const [urlCopyState, setUrlCopyState] = useState<CopyState>("idle");
  const [dataCopyState, setDataCopyState] = useState<CopyState>("idle");
  const [showFallbackUrl, setShowFallbackUrl] = useState(false);
  const [toast, setToast] = useState("");
  const toastTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const titleRef = useRef<HTMLHeadingElement>(null);

  // 画面遷移時に見出しへフォーカス（スクリーンリーダーに新画面を知らせる）
  useEffect(() => {
    titleRef.current?.focus();
  }, []);

  const canShare = typeof navigator !== "undefined" && typeof navigator.share === "function";

  const showToast = (msg: string) => {
    setToast(msg);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(""), 2000);
  };

  const handleShare = async () => {
    const greeting = to ? `${to}さんへ。` : "";
    const sender = from ? `${from}から、` : "";
    try {
      await navigator.share({
        title: "ひみつQR",
        text: `${greeting}${sender}あいことばを知ってる人だけが開ける、ひみつのメッセージだよ🔐 開いてみて！`,
        url: qrUrl,
      });
    } catch (e) {
      if (e instanceof Error && e.name === "AbortError") return;
      // 共有に失敗したらURLコピーにフォールバック
      copyToClipboard(qrUrl, setUrlCopyState, "URL");
    }
  };

  const copyToClipboard = async (text: string, setter: (s: CopyState) => void, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setter("copied");
      showToast(`${label}をコピーしました`);
      setTimeout(() => setter("idle"), 2000);
    } catch {
      setter("failed");
      setShowFallbackUrl(true);
    }
  };

  const handleSaveImage = async () => {
    await saveDecoratedQR(qrDataUrl, to);
    showToast("画像を保存しました");
  };

  return (
    <div className="screen result-screen">
      <div className="card result-card">
        <div className="result-header">
          <span className="result-icon">✨</span>
          <h2 className="result-title" ref={titleRef} tabIndex={-1}>封ができました</h2>
          {(to || from) && (
            <p className="result-envelope-note">
              {to && `${to}さんへ`}
              {to && from && " ・ "}
              {from && `${from}より`}
            </p>
          )}
        </div>

        <div className="qr-container">
          <img
            src={qrDataUrl}
            alt="秘密のQRコード"
            className="qr-image"
          />
        </div>

        {lengthWarning && (
          <div className="generation-error" role="alert">
            メッセージが長いためQRコードが読み取りにくくなる可能性があります。短めのメッセージがおすすめです。
          </div>
        )}

        <div className="result-info">
          <p className="result-description">
            このQRが、あなたの手紙の封筒です。
          </p>
          <p className="result-description">
            開けられるのは、あいことばを知っている人だけ。
          </p>
        </div>

        <div className="result-actions">
          {canShare && (
            <button className="btn btn-primary" onClick={handleShare}>
              📤 送る・シェアする
            </button>
          )}

          <button className={`btn ${canShare ? "btn-outline" : "btn-primary"}`} onClick={handleSaveImage}>
            📥 QR画像を保存
          </button>

          <button
            className="btn btn-outline"
            onClick={() =>
              copyToClipboard(qrUrl, setUrlCopyState, "URL")
            }
          >
            {urlCopyState === "copied"
              ? "✅ コピーしました"
              : urlCopyState === "failed"
                ? "❌ コピーに失敗"
                : "🔗 QRのURLをコピー"}
          </button>

          <button
            className="btn btn-outline"
            onClick={() =>
              copyToClipboard(encodedPayload, setDataCopyState, "暗号データ")
            }
          >
            {dataCopyState === "copied"
              ? "✅ コピーしました"
              : dataCopyState === "failed"
                ? "❌ コピーに失敗"
                : "📋 暗号データをコピー"}
          </button>

          {showFallbackUrl && (
            <div className="fallback-url">
              <p className="form-note">URLを手動でコピーしてください：</p>
              <textarea
                className="form-textarea fallback-textarea"
                readOnly
                value={qrUrl}
                rows={3}
                onClick={(e) => (e.target as HTMLTextAreaElement).select()}
              />
            </div>
          )}

          <hr className="divider" />

          <p className="form-note" style={{ textAlign: "center", margin: "0 0 2px" }}>
            送る前に、あいことばで開けるか確認できます👇
          </p>
          <button className="btn btn-secondary" onClick={onTestOpen}>
            🔓 テストで開いてみる
          </button>
          <button className="btn btn-secondary" onClick={onEdit}>
            ✏️ 内容を修正する
          </button>
          <button className="btn btn-secondary" onClick={onReset}>
            🔄 最初から新しく作る
          </button>
        </div>
      </div>

      {/* トースト通知 */}
      <div className={`toast toast-success ${toast ? "toast-visible" : ""}`} role="status" aria-live="polite">
        {toast}
      </div>
    </div>
  );
}
