import { useState, useRef, useEffect, useCallback } from "react";
import type { Html5Qrcode } from "html5-qrcode";
import { encodedToPayload } from "../lib/encoding";
import { isValidPayload } from "../lib/validation";
import type { SecretPayload } from "../types/secretPayload";
import { SafetyNotice } from "./SafetyNotice";

interface Props {
  onPayloadReady: (payload: SecretPayload) => void;
}

type InputMode = "scan" | "image" | "text";

/** QR読み取り結果（URL）からペイロードを抽出 */
function extractPayload(raw: string): SecretPayload | null {
  let encoded = raw.trim();
  const hashIdx = encoded.indexOf("#open=");
  if (hashIdx !== -1) {
    encoded = encoded.slice(hashIdx + "#open=".length);
  }
  if (!encoded) return null;
  try {
    const parsed = encodedToPayload<unknown>(encoded);
    if (!isValidPayload(parsed)) return null;
    return parsed;
  } catch {
    return null;
  }
}

/** 画像ファイルを読み込んで HTMLImageElement を返す */
function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("画像の読み込みに失敗しました"));
    img.src = src;
  });
}

/** 画像ファイルから QR コードをデコード（jsQR）。読み取れなければ null */
async function decodeQRFromImageFile(file: File): Promise<string | null> {
  const url = URL.createObjectURL(file);
  try {
    const img = await loadImage(url);
    // 巨大な写真はダウンスケールして処理（速度＆メモリ対策）
    const maxDim = 1600;
    const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
    const width = Math.max(1, Math.round(img.width * scale));
    const height = Math.max(1, Math.round(img.height * scale));

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return null;
    ctx.drawImage(img, 0, 0, width, height);

    const imageData = ctx.getImageData(0, 0, width, height);
    // jsQR は画像モードでのみ使うため、必要時に動的読み込み（初期バンドルを軽くする）
    const jsQR = (await import("jsqr")).default;
    const result = jsQR(imageData.data, width, height, {
      inversionAttempts: "attemptBoth",
    });
    return result?.data ?? null;
  } finally {
    URL.revokeObjectURL(url);
  }
}

export function ManualOpen({ onPayloadReady }: Props) {
  const [mode, setMode] = useState<InputMode>("scan");
  const [textInput, setTextInput] = useState("");
  const [error, setError] = useState("");
  const [scanning, setScanning] = useState(false);
  const [starting, setStarting] = useState(false);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // カメラスキャン開始（ボタンクリックで呼ばれる）
  const startScanner = useCallback(async () => {
    if (scanning || starting) return;
    setError("");
    setStarting(true);

    try {
      // html5-qrcode はカメラ起動時のみ使うため、必要時に動的読み込み（初期バンドルを軽くする）
      const { Html5Qrcode } = await import("html5-qrcode");
      const scanner = new Html5Qrcode("qr-reader");
      scannerRef.current = scanner;

      await scanner.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        (decodedText) => {
          const payload = extractPayload(decodedText);
          if (payload) {
            scanner.stop().catch(() => {});
            scannerRef.current = null;
            setScanning(false);
            onPayloadReady(payload);
          } else {
            setError("ひみつQRではないQRコードです。");
          }
        },
        () => {}
      );
      setScanning(true);
    } catch (e) {
      setScanning(false);
      scannerRef.current = null;
      const msg = e instanceof Error ? e.message : String(e);
      if (msg.includes("Permission") || msg.includes("NotAllowed")) {
        setError("カメラの使用が許可されていません。ブラウザの設定を確認してください。");
      } else {
        setError("カメラを起動できませんでした。画像または貼り付けをお試しください。");
      }
    } finally {
      setStarting(false);
    }
  }, [scanning, starting, onPayloadReady]);

  // カメラスキャン停止
  const stopScanner = useCallback(() => {
    if (scannerRef.current) {
      scannerRef.current.stop().catch(() => {});
      scannerRef.current = null;
    }
    setScanning(false);
  }, []);

  // コンポーネント破棄時にスキャナー停止
  useEffect(() => {
    return () => {
      if (scannerRef.current) {
        scannerRef.current.stop().catch(() => {});
        scannerRef.current = null;
      }
    };
  }, []);

  // モード切替ハンドラ
  const switchMode = (newMode: InputMode) => {
    if (newMode !== "scan") stopScanner();
    setError("");
    setMode(newMode);
  };

  // 画像からQR読み取り
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError("");

    try {
      const decodedText = await decodeQRFromImageFile(file);
      if (!decodedText) {
        setError("画像からQRコードを読み取れませんでした。QRがはっきり大きく写った画像をお試しください。");
        return;
      }

      const payload = extractPayload(decodedText);
      if (payload) {
        onPayloadReady(payload);
      } else {
        setError("ひみつQRではないQRコード画像です。");
      }
    } catch {
      setError("画像を読み込めませんでした。別の画像をお試しください。");
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // テキスト貼り付けで開く
  const handleTextOpen = () => {
    setError("");
    const payload = extractPayload(textInput);
    if (payload) {
      onPayloadReady(payload);
    } else if (!textInput.trim()) {
      setError("暗号データまたはURLを入力してください。");
    } else {
      setError("データを読み取れませんでした。コピーし直してお試しください。");
    }
  };

  // クリップボードから貼り付け（モバイルでの手間を減らす）
  const canPaste =
    typeof navigator !== "undefined" &&
    !!navigator.clipboard &&
    typeof navigator.clipboard.readText === "function";
  const handlePasteFromClipboard = async () => {
    setError("");
    try {
      const text = await navigator.clipboard.readText();
      if (text.trim()) {
        setTextInput(text);
      } else {
        setError("クリップボードが空です。先にURLや暗号データをコピーしてください。");
      }
    } catch {
      setError("クリップボードから読み取れませんでした。入力欄を長押しして貼り付けてください。");
    }
  };

  return (
    <div className="screen create-screen">
      {/* 入力方法の切り替え */}
      <div className="mode-switcher">
        <button
          type="button"
          className={`mode-btn ${mode === "scan" ? "mode-active" : ""}`}
          onClick={() => switchMode("scan")}
        >
          📷 カメラ
        </button>
        <button
          type="button"
          className={`mode-btn ${mode === "image" ? "mode-active" : ""}`}
          onClick={() => switchMode("image")}
        >
          🖼️ 画像
        </button>
        <button
          type="button"
          className={`mode-btn ${mode === "text" ? "mode-active" : ""}`}
          onClick={() => switchMode("text")}
        >
          📋 貼り付け
        </button>
      </div>

      <div className="card">
        {/* カメラスキャンモード */}
        {mode === "scan" && (
          <>
            <div
              id="qr-reader"
              className="qr-scanner-container"
            />
            {!scanning && (
              <div className="button-group" style={{ marginTop: 12 }}>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={startScanner}
                  disabled={starting}
                >
                  {starting ? (
                    <span className="btn-loading">
                      <span className="spinner" />
                      起動中...
                    </span>
                  ) : error ? (
                    "もう一度カメラを起動"
                  ) : (
                    "カメラを起動"
                  )}
                </button>
              </div>
            )}
            {scanning && (
              <p className="form-note" style={{ textAlign: "center", marginTop: 12 }}>
                ひみつQRのQRコードをかざしてください
              </p>
            )}
          </>
        )}

        {/* 画像アップロードモード */}
        {mode === "image" && (
          <div className="form-group">
            <label className="form-label">QRコードの画像を選択</label>
            <p className="form-note" style={{ marginBottom: 12 }}>
              スクリーンショットやLINEで受け取ったQR画像を選んでください。
            </p>
            <label className="btn btn-outline image-upload-btn">
              📁 画像を選択
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                style={{ display: "none" }}
              />
            </label>
          </div>
        )}

        {/* テキスト貼り付けモード */}
        {mode === "text" && (
          <div className="form-group">
            <label htmlFor="manual-data" className="form-label">
              暗号データまたはURLを貼り付け
            </label>
            {canPaste && (
              <button
                type="button"
                className="btn btn-outline"
                style={{ width: "100%", marginBottom: 10 }}
                onClick={handlePasteFromClipboard}
              >
                📋 クリップボードから貼り付け
              </button>
            )}
            <textarea
              id="manual-data"
              className="form-textarea"
              placeholder={"例）https://example.com/#open=eyJ2Ijox...\nまたは暗号データ文字列をそのまま貼り付け"}
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              rows={5}
            />
            <p className="form-note">
              QRのURLまたは「暗号データをコピー」で取得した文字列を貼り付けてください。
            </p>
            <div className="button-group" style={{ marginTop: 16 }}>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleTextOpen}
                disabled={!textInput.trim()}
              >
                この暗号データを開く
              </button>
            </div>
          </div>
        )}

        {error && <p className="generation-error" role="alert" style={{ marginTop: 16 }}>{error}</p>}
      </div>

      <SafetyNotice />
    </div>
  );
}
