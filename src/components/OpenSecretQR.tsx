import { useState, useCallback } from "react";
import { decryptMessage } from "../lib/crypto";
import { inputModeForFormat } from "../lib/passphraseFormat";
import type { InputFormat, SecretPayload } from "../types/secretPayload";

interface Props {
  payload: SecretPayload;
  onGoHome: () => void;
}

type Phase = "input" | "decrypting" | "success" | "failure";

export function OpenSecretQR({ payload, onGoHome }: Props) {
  const [passphrase, setPassphrase] = useState("");
  const [showPassphrase, setShowPassphrase] = useState(false);
  const [phase, setPhase] = useState<Phase>("input");
  const [decryptedMessage, setDecryptedMessage] = useState("");
  const [copyState, setCopyState] = useState<"idle" | "copied">("idle");
  const [errorDetail, setErrorDetail] = useState("");

  const handleDecrypt = useCallback(async () => {
    if (!passphrase || phase === "decrypting") return;

    setPhase("decrypting");
    setErrorDetail("");

    try {
      const message = await decryptMessage(payload, passphrase);
      setDecryptedMessage(message);
      setPhase("success");
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error("Decryption failed:", e);
      console.error("Payload:", JSON.stringify(payload, null, 2));
      setErrorDetail(msg);
      setPhase("failure");
    }
  }, [passphrase, payload, phase]);

  const handleRetry = () => {
    // 入力はクリアしない：打ち間違いを直すだけのことが多く、全消しは手間
    setPhase("input");
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(decryptedMessage);
      setCopyState("copied");
      setTimeout(() => setCopyState("idle"), 2000);
    } catch {
      // フォールバック不要：メッセージ自体は表示されている
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleDecrypt();
    }
  };

  // 作成時の入力形式に合わせてキーボードを切り替える（数字のみ → テンキー）
  const inputMode = inputModeForFormat(payload.format as InputFormat);

  // 成功画面
  if (phase === "success") {
    return (
      <div className="screen open-screen">
        <div className="card success-card" role="alert" aria-live="assertive">
          <div className="success-header">
            <span className="success-icon">🎉</span>
            <h2 className="success-title">メッセージが開きました</h2>
          </div>
          <div className="message-display">
            <p className="decrypted-message">{decryptedMessage}</p>
          </div>
          <div className="button-group">
            <button className="btn btn-primary" onClick={handleCopy}>
              {copyState === "copied" ? "✅ コピーしました" : "📋 コピーする"}
            </button>
            <button className="btn btn-secondary" onClick={onGoHome}>
              最初に戻る
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 失敗画面
  if (phase === "failure") {
    return (
      <div className="screen open-screen">
        <div className="card failure-card" role="alert" aria-live="assertive">
          <div className="failure-header">
            <span className="failure-icon">🔒</span>
            <h2 className="failure-title">開けませんでした</h2>
          </div>
          <p className="failure-description">
            あいことばが違うか、QRコードの内容が壊れている可能性があります。
          </p>
          <p className="failure-hint">
            ひらがな・カタカナ・漢字・数字・スペース・記号が合っているか確認してください。
          </p>
          {import.meta.env.DEV && errorDetail && (
            <p className="failure-hint" style={{ fontSize: "0.72rem", color: "#b2bec3", marginTop: 8, wordBreak: "break-all" }}>
              Debug: {errorDetail}
            </p>
          )}
          <div className="button-group">
            <button className="btn btn-primary" onClick={handleRetry}>
              もう一度試す
            </button>
            <button className="btn btn-secondary" onClick={onGoHome}>
              最初に戻る
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 入力画面 / 復号中
  return (
    <div className="screen open-screen">
      <div className="card open-card">
        <div className="open-header">
          <span className="open-icon">✉️</span>
          <h2 className="open-title">秘密のメッセージが届いています</h2>
        </div>

        {payload.hint && (
          <div className="open-info-block">
            <div className="info-label">ヒント</div>
            <div className="info-value">{payload.hint}</div>
          </div>
        )}

        {payload.format && payload.format !== "指定なし" && (
          <div className="open-info-block">
            <div className="info-label">入力形式</div>
            <div className="info-value">{payload.format}</div>
          </div>
        )}

        {payload.showLength && payload.length != null && (
          <div className="open-info-block">
            <div className="info-label">文字数</div>
            <div className="info-value">{payload.length}文字</div>
          </div>
        )}

        <div className="form-group open-input-group">
          <label htmlFor="open-passphrase" className="form-label">
            あいことばを入力してください
          </label>
          <div className="input-with-toggle">
            <input
              id="open-passphrase"
              type="text"
              inputMode={inputMode}
              className={`form-input open-input${showPassphrase ? "" : " form-input-masked"}`}
              placeholder="あいことば"
              value={passphrase}
              onChange={(e) => setPassphrase(e.target.value)}
              onKeyDown={handleKeyDown}
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck={false}
              autoFocus
              disabled={phase === "decrypting"}
            />
            <button
              type="button"
              className="toggle-visibility"
              onClick={() => setShowPassphrase(!showPassphrase)}
              aria-label={showPassphrase ? "非表示にする" : "表示する"}
            >
              {showPassphrase ? "🙈" : "👁"}
            </button>
          </div>
        </div>

        <button
          className="btn btn-primary btn-open"
          onClick={handleDecrypt}
          disabled={!passphrase || phase === "decrypting"}
        >
          {phase === "decrypting" ? (
            <span className="btn-loading">
              <span className="spinner" />
              復号中...
            </span>
          ) : (
            "開く"
          )}
        </button>
      </div>

      <button className="btn-text-link" onClick={onGoHome}>
        自分もひみつQRを作る →
      </button>
    </div>
  );
}
