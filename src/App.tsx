import { useState, useEffect, useCallback, lazy, Suspense } from "react";
import { encodedToPayload } from "./lib/encoding";
import { isValidPayload } from "./lib/validation";
import type { SecretPayload } from "./types/secretPayload";
import { CreateSecretQR } from "./components/CreateSecretQR";
import { QRResult } from "./components/QRResult";
import { OpenSecretQR } from "./components/OpenSecretQR";

// 「開く」タブはカメラ用の重いライブラリを含むため、開いたときだけ読み込む
const ManualOpen = lazy(() =>
  import("./components/ManualOpen").then((m) => ({ default: m.ManualOpen }))
);

type Screen =
  | { type: "create" }
  | { type: "manual-open" }
  | { type: "result"; qrDataUrl: string; qrUrl: string; encodedPayload: string; lengthWarning: boolean }
  | { type: "open"; payload: SecretPayload }
  | { type: "error" };

/** URLハッシュから #open= を解析 — 成功: payload, 形式不正: "error", 該当なし: null */
function parseHash(): SecretPayload | "error" | null {
  const hash = window.location.hash;
  if (!hash.startsWith("#open=")) return null;

  try {
    const encoded = hash.slice("#open=".length);
    if (!encoded) return "error";
    const parsed = encodedToPayload<unknown>(encoded);
    if (!isValidPayload(parsed)) return "error";
    return parsed;
  } catch {
    return "error";
  }
}

/** 初期ハッシュからスクリーンを決定 */
function getInitialScreen(): Screen {
  const result = parseHash();
  if (result === "error") return { type: "error" };
  if (result) return { type: "open", payload: result };
  return { type: "create" };
}

/** #open= 付き URL で来たかどうか（タブ非表示の判定に使用） */
function isDirectOpen(): boolean {
  return window.location.hash.startsWith("#open=");
}

export default function App() {
  const [screen, setScreen] = useState<Screen>(getInitialScreen);
  const [cameFromQR] = useState(isDirectOpen);

  // タブの表示状態：QR読み取り経由で来た開封画面ではタブを出さない
  const showTabs = !cameFromQR || screen.type === "create" || screen.type === "manual-open" || screen.type === "result";

  // ハッシュ変更を監視
  useEffect(() => {
    const handleHashChange = () => {
      const r = parseHash();
      if (r === "error") {
        setScreen({ type: "error" });
      } else if (r) {
        setScreen({ type: "open", payload: r });
      }
    };

    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, []);

  // ブラウザ戻るボタンで作成画面に戻る
  useEffect(() => {
    const handlePopState = () => {
      const r = parseHash();
      if (r && r !== "error") {
        setScreen({ type: "open", payload: r });
      } else {
        setScreen({ type: "create" });
      }
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  const handleGenerated = useCallback(
    (qrDataUrl: string, qrUrl: string, encodedPayload: string, lengthWarning: boolean) => {
      history.pushState({ screen: "result" }, "", window.location.pathname);
      setScreen({ type: "result", qrDataUrl, qrUrl, encodedPayload, lengthWarning });
      window.scrollTo({ top: 0, behavior: "smooth" });
    },
    []
  );

  const handleGoHome = useCallback(() => {
    history.replaceState(null, "", window.location.pathname);
    setScreen({ type: "create" });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  const handleTestOpen = useCallback(() => {
    if (screen.type !== "result") return;
    try {
      const parsed = encodedToPayload<unknown>(screen.encodedPayload);
      if (!isValidPayload(parsed)) return;
      setScreen({ type: "open", payload: parsed });
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch {
      // ignore
    }
  }, [screen]);

  const handlePayloadReady = useCallback((payload: SecretPayload) => {
    setScreen({ type: "open", payload });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  const activeTab = screen.type === "create" || screen.type === "result" ? "create" : "open";

  return (
    <div className="app-container">
      {/* ヘッダー：結果画面・エラー画面以外で表示 */}
      {(screen.type === "create" || screen.type === "manual-open") && (
        <header className="app-header">
          <div className="app-logo">
            <span className="logo-icon">🔐</span>
            <h1 className="app-title">ひみつQR</h1>
          </div>
          <p className="app-tagline">
            あいことばで開く、秘密のQRメッセージ。
          </p>
          <div className="app-usecases">
            <span className="usecase-chip">🎁 プレゼント</span>
            <span className="usecase-chip">🧩 謎解き</span>
            <span className="usecase-chip">💜 推し活</span>
            <span className="usecase-chip">🎉 イベント</span>
          </div>
          <p className="app-description">
            QRを読み取っても、あいことばを知らないと中身は読めません。
          </p>
        </header>
      )}

      {/* タブ */}
      {showTabs && (screen.type === "create" || screen.type === "manual-open") && (
        <nav className="tab-bar" role="tablist">
          <button
            role="tab"
            aria-selected={activeTab === "create"}
            className={`tab-item ${activeTab === "create" ? "tab-active" : ""}`}
            onClick={() => setScreen({ type: "create" })}
          >
            ✏️ 作る
          </button>
          <button
            role="tab"
            aria-selected={activeTab === "open"}
            className={`tab-item ${activeTab === "open" ? "tab-active" : ""}`}
            onClick={() => setScreen({ type: "manual-open" })}
          >
            📨 開く
          </button>
        </nav>
      )}

      {screen.type === "create" && (
        <CreateSecretQR onGenerated={handleGenerated} />
      )}
      {screen.type === "manual-open" && (
        <Suspense
          fallback={
            <div className="screen">
              <div className="card" style={{ textAlign: "center" }}>
                <span className="spinner spinner-dark" /> 読み込み中…
              </div>
            </div>
          }
        >
          <ManualOpen onPayloadReady={handlePayloadReady} />
        </Suspense>
      )}
      {screen.type === "result" && (
        <QRResult
          qrDataUrl={screen.qrDataUrl}
          qrUrl={screen.qrUrl}
          encodedPayload={screen.encodedPayload}
          lengthWarning={screen.lengthWarning}
          onReset={handleGoHome}
          onTestOpen={handleTestOpen}
        />
      )}
      {screen.type === "open" && (
        <OpenSecretQR payload={screen.payload} onGoHome={handleGoHome} />
      )}
      {screen.type === "error" && (
        <div className="screen open-screen">
          <div className="card failure-card" role="alert">
            <div className="failure-header">
              <span className="failure-icon">😵</span>
              <h2 className="failure-title">QRコードを読み取れませんでした</h2>
            </div>
            <p className="failure-description">
              URLの形式が正しくないか、QRコードの内容が壊れている可能性があります。
            </p>
            <p className="failure-hint">
              もう一度QRコードを読み取るか、送り主に確認してみてください。
            </p>
            <div className="button-group">
              <button className="btn btn-primary" onClick={handleGoHome}>
                ひみつQRを作る
              </button>
            </div>
          </div>
        </div>
      )}

      <footer className="app-footer">
        <p>ひみつQR — エンタメ向け秘密メッセージツール</p>
      </footer>
    </div>
  );
}
