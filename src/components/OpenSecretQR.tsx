import { useState, useCallback, useMemo } from "react";
import { decryptMessage } from "../lib/crypto";
import { inputModeForFormat } from "../lib/passphraseFormat";
import type { InputFormat, SecretPayload } from "../types/secretPayload";

interface Props {
  payload: SecretPayload;
  onGoHome: () => void;
  /** お返事を書く（宛名と差出人を入れ替えて作成画面へ） */
  onReply: (to: string, from: string) => void;
}

type Phase = "input" | "decrypting" | "success" | "failure";

const CONFETTI_COLORS = ["#6c5ce7", "#a29bfe", "#fd79a8", "#ffeaa7", "#55efc4", "#74b9ff"];

/** インデックスから 0〜1 の擬似乱数を作る（レンダー中でも純粋） */
function pseudoRandom(i: number, salt: number): number {
  const x = Math.sin(i * 127.1 + salt * 311.7) * 43758.5453;
  return x - Math.floor(x);
}

/** 開封成功時の紙吹雪（CSSアニメーション、reduced-motion では自動的に無効） */
function Confetti() {
  const pieces = useMemo(
    () =>
      Array.from({ length: 28 }, (_, i) => ({
        left: `${pseudoRandom(i, 1) * 100}%`,
        delay: `${pseudoRandom(i, 2) * 0.6}s`,
        duration: `${2.2 + pseudoRandom(i, 3) * 1.6}s`,
        color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
        size: 6 + pseudoRandom(i, 4) * 6,
        rotate: pseudoRandom(i, 5) * 360,
      })),
    []
  );
  return (
    <div className="confetti-container" aria-hidden="true">
      {pieces.map((p, i) => (
        <span
          key={i}
          className="confetti-piece"
          style={{
            left: p.left,
            animationDelay: p.delay,
            animationDuration: p.duration,
            background: p.color,
            width: p.size,
            height: p.size * 0.6,
            transform: `rotate(${p.rotate}deg)`,
          }}
        />
      ))}
    </div>
  );
}

export function OpenSecretQR({ payload, onGoHome, onReply }: Props) {
  const [passphrase, setPassphrase] = useState("");
  // 最初から表示する：受け取った人は自分しか画面を見ていないことがほとんどで、
  // 伏せ字は「打ち間違いで開かない」というつまずきの方を生みやすい
  const [showPassphrase, setShowPassphrase] = useState(true);
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

  // 成功画面：便箋として表示
  if (phase === "success") {
    return (
      <div className="screen open-screen">
        <Confetti />
        <div className="card success-card" role="alert" aria-live="assertive">
          <div className="success-header">
            <span className="success-icon">💌</span>
            <h2 className="success-title">封が開きました</h2>
          </div>
          <div className="letter-paper">
            {payload.to && <p className="letter-to">{payload.to}さんへ</p>}
            <p className="decrypted-message">{decryptedMessage}</p>
            {payload.from && <p className="letter-from">— {payload.from} より</p>}
          </div>
          <div className="button-group">
            <button className="btn btn-primary" onClick={handleCopy}>
              {copyState === "copied" ? "✅ コピーしました" : "📋 メッセージをコピー"}
            </button>
            <button
              className="btn btn-outline"
              onClick={() => onReply(payload.from ?? "", payload.to ?? "")}
            >
              💌 お返事を書く
            </button>
            <button className="btn btn-secondary" onClick={onGoHome}>
              自分もひみつQRを作る
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
            <h2 className="failure-title">封が開きませんでした</h2>
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

  // 入力画面 / 復号中 — 封筒の表書きを見せる
  return (
    <div className="screen open-screen">
      <div className="card open-card">
        <div className="open-header">
          <span className="open-icon">✉️</span>
          {payload.to && <p className="envelope-to">{payload.to}さんへ</p>}
          <h2 className="open-title">
            {payload.from
              ? `${payload.from}さんから、ひみつのメッセージです`
              : "ひみつのメッセージが届いています"}
          </h2>
          <p className="open-subtitle">あいことばが、封を開ける鍵です</p>
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
              aria-label={showPassphrase ? "あいことばを隠す" : "あいことばを表示する"}
            >
              {showPassphrase ? "👁" : "🙈"}
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
              封を開けています...
            </span>
          ) : (
            "封を開ける"
          )}
        </button>
      </div>

      <button className="btn-text-link" onClick={onGoHome}>
        自分もひみつQRを作る →
      </button>
    </div>
  );
}
