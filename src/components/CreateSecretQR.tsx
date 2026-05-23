import { useState, useRef, useCallback } from "react";
import { encryptMessage } from "../lib/crypto";
import { payloadToEncoded } from "../lib/encoding";
import { generateQRCodeDataUrl, isQRDataTooLong } from "../lib/qr";
import { validateInputs, canCreate } from "../lib/validation";
import { filterToFormat, inputModeForFormat } from "../lib/passphraseFormat";
import { INPUT_FORMATS } from "../types/secretPayload";
import type { InputFormat } from "../types/secretPayload";
import { StrengthMeter } from "./StrengthMeter";
import { SafetyNotice } from "./SafetyNotice";

interface Props {
  onGenerated: (qrDataUrl: string, qrUrl: string, encodedPayload: string, lengthWarning: boolean) => void;
}

export function CreateSecretQR({ onGenerated }: Props) {
  const [message, setMessage] = useState("");
  const [passphrase, setPassphrase] = useState("");
  const [passphraseConfirm, setPassphraseConfirm] = useState("");
  const [hint, setHint] = useState("");
  const [format, setFormat] = useState<InputFormat>("指定なし");
  const [showLength, setShowLength] = useState(false);
  const [showPassphrase, setShowPassphrase] = useState(false);
  const [showPassphraseConfirm, setShowPassphraseConfirm] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState("");

  // 日本語IME変換中フラグ：変換確定前に文字を間引かないようにする
  const composingRef = useRef(false);

  const warnings = validateInputs(message, passphrase, passphraseConfirm, hint, format);
  const errors = warnings.filter((w) => w.type === "error");
  const isValid = canCreate(message, passphrase, passphraseConfirm, format);

  // メッセージ長の概算警告（コンパクトなバイナリ形式でURL化されるため、
  // オーバーヘッドは約1.4倍。長文になるとQRが密になり印刷で読みにくくなる）
  const messageByteLength = new TextEncoder().encode(message).length;
  const estimatedTooLong = messageByteLength > 1000;

  const inputMode = inputModeForFormat(format);

  // あいことば入力：IME変換中は素通し、確定後は形式に合わない文字を除去
  const handlePassphraseChange = (raw: string) => {
    setPassphrase(composingRef.current ? raw : filterToFormat(raw, format));
  };
  const handlePassphraseConfirmChange = (raw: string) => {
    setPassphraseConfirm(composingRef.current ? raw : filterToFormat(raw, format));
  };

  const handleGenerate = useCallback(async () => {
    if (!isValid || isGenerating) return;

    setIsGenerating(true);
    setError("");

    try {
      const payload = await encryptMessage(
        message,
        passphrase,
        hint,
        format,
        showLength
      );

      const encoded = payloadToEncoded(payload);
      const baseUrl = window.location.origin + window.location.pathname;
      const qrUrl = `${baseUrl}#open=${encoded}`;

      const tooLong = isQRDataTooLong(qrUrl);
      const qrDataUrl = await generateQRCodeDataUrl(qrUrl);
      onGenerated(qrDataUrl, qrUrl, encoded, tooLong);
    } catch (e) {
      setError("QRコードの生成に失敗しました。メッセージを短くしてお試しください。");
      console.error(e);
    } finally {
      setIsGenerating(false);
    }
  }, [message, passphrase, hint, format, showLength, isValid, isGenerating, onGenerated]);

  const handleClear = () => {
    setMessage("");
    setPassphrase("");
    setPassphraseConfirm("");
    setHint("");
    setFormat("指定なし");
    setShowLength(false);
    setError("");
  };

  return (
    <div className="screen create-screen">
      <form className="card" autoComplete="off" onSubmit={(e) => { e.preventDefault(); handleGenerate(); }}>
        <div className="form-group">
          <label htmlFor="message" className="form-label">
            秘密のメッセージ
          </label>
          <textarea
            id="message"
            className="form-textarea"
            placeholder="例）誕生日おめでとう。いつもありがとう。"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={4}
            aria-describedby={estimatedTooLong ? "message-length-warning" : undefined}
          />
          <div className="char-count">
            {message.length > 0 && `${message.length}文字`}
          </div>
          {estimatedTooLong && (
            <p id="message-length-warning" className="field-error" role="alert">
              メッセージが長めです。QRコードが読み取りにくくなる可能性があります。
            </p>
          )}
        </div>

        {/* 入力形式：あいことばを入力する前に決める */}
        <div className="form-group">
          <label htmlFor="format" className="form-label">
            あいことばの入力形式
          </label>
          <select
            id="format"
            className="form-select"
            value={format}
            onChange={(e) => setFormat(e.target.value as InputFormat)}
          >
            {INPUT_FORMATS.map((f) => (
              <option key={f} value={f}>
                {f}
              </option>
            ))}
          </select>
          <p className="form-note">
            選んだ形式に合った文字だけを入力できます。この形式は受け取った人にヒントとして表示されます。
          </p>
        </div>

        <div className="form-group">
          <label htmlFor="passphrase" className="form-label">
            あいことば
          </label>
          <div className="input-with-toggle">
            <input
              id="passphrase"
              type="text"
              inputMode={inputMode}
              className={`form-input${showPassphrase ? "" : " form-input-masked"}`}
              placeholder="例）カフェルナ"
              value={passphrase}
              onChange={(e) => handlePassphraseChange(e.target.value)}
              onCompositionStart={() => { composingRef.current = true; }}
              onCompositionEnd={(e) => {
                composingRef.current = false;
                setPassphrase(filterToFormat(e.currentTarget.value, format));
              }}
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck={false}
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

        <div className="form-group">
          <label htmlFor="passphrase-confirm" className="form-label">
            あいことば（確認）
          </label>
          <div className="input-with-toggle">
            <input
              id="passphrase-confirm"
              type="text"
              inputMode={inputMode}
              className={`form-input${showPassphraseConfirm ? "" : " form-input-masked"}`}
              placeholder="もう一度入力してください"
              value={passphraseConfirm}
              onChange={(e) => handlePassphraseConfirmChange(e.target.value)}
              onCompositionStart={() => { composingRef.current = true; }}
              onCompositionEnd={(e) => {
                composingRef.current = false;
                setPassphraseConfirm(filterToFormat(e.currentTarget.value, format));
              }}
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck={false}
              aria-describedby="passphrase-confirm-status"
            />
            <button
              type="button"
              className="toggle-visibility"
              onClick={() => setShowPassphraseConfirm(!showPassphraseConfirm)}
              aria-label={showPassphraseConfirm ? "非表示にする" : "表示する"}
            >
              {showPassphraseConfirm ? "🙈" : "👁"}
            </button>
          </div>
          {passphrase && passphraseConfirm && passphrase !== passphraseConfirm && (
            <p id="passphrase-confirm-status" className="field-error" role="alert">あいことばが一致しません</p>
          )}
          {passphrase && passphraseConfirm && passphrase === passphraseConfirm && (
            <p id="passphrase-confirm-status" className="field-success">一致しています</p>
          )}
        </div>

        <StrengthMeter
          passphrase={passphrase}
          hint={hint}
          showLength={showLength}
        />

        <div className="form-group">
          <label htmlFor="hint" className="form-label">
            あいことばのヒント
          </label>
          <input
            id="hint"
            type="text"
            className="form-input"
            placeholder="例）初めて一緒に行ったカフェの名前"
            value={hint}
            onChange={(e) => setHint(e.target.value)}
          />
          <p className="form-note">
            ヒントはQRを読み取った人なら誰でも見られます。
          </p>
        </div>

        <div className="form-group">
          <label className="form-checkbox-label">
            <input
              type="checkbox"
              className="form-checkbox"
              checked={showLength}
              onChange={(e) => setShowLength(e.target.checked)}
            />
            <span className="checkbox-custom" />
            <span>文字数ヒントを表示する</span>
          </label>
          <p className="form-note">
            便利ですが、推測されやすくなる場合があります。
          </p>
        </div>

        {/* バリデーション警告 */}
        {warnings.filter((w) => w.type !== "error").length > 0 && (
          <div className="validation-warnings">
            {warnings
              .filter((w) => w.type !== "error")
              .map((w, i) => (
                <p key={i} className={`validation-${w.type}`}>
                  {w.type === "warning" ? "⚠️ " : "💡 "}
                  {w.message}
                </p>
              ))}
          </div>
        )}

        {/* 形式不一致などのブロッキングエラー */}
        {passphrase && errors.some((e) => e.message.includes("以外の文字")) && (
          <p className="generation-error" role="alert">
            あいことばに「{format}」以外の文字が含まれています。
          </p>
        )}

        {error && <p className="generation-error">{error}</p>}

        <div className="button-group">
          <button
            type="submit"
            className="btn btn-primary"
            disabled={!isValid || errors.length > 0 || isGenerating}
          >
            {isGenerating ? (
              <span className="btn-loading">
                <span className="spinner" />
                生成中...
              </span>
            ) : (
              "秘密QRを作る"
            )}
          </button>
          <button
            className="btn btn-secondary"
            onClick={handleClear}
            type="button"
          >
            入力をクリア
          </button>
        </div>
      </form>

      <SafetyNotice />
    </div>
  );
}
