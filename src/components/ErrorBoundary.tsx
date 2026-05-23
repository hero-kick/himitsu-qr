import { Component, type ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

/** 予期しない例外で白画面にならないよう、復帰画面を表示する */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: unknown) {
    console.error("App error:", error);
  }

  handleReload = () => {
    // ハッシュ（壊れた #open= 等）を捨ててクリーンな状態で再読み込み
    window.location.href = window.location.pathname;
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="app-container">
          <div className="screen open-screen">
            <div className="card failure-card" role="alert">
              <div className="failure-header">
                <span className="failure-icon">😵</span>
                <h2 className="failure-title">問題が発生しました</h2>
              </div>
              <p className="failure-description">
                予期しないエラーが発生しました。お手数ですが、ページを再読み込みしてください。
              </p>
              <p className="failure-hint">
                それでも直らない場合は、しばらくたってからお試しください。
              </p>
              <div className="button-group">
                <button className="btn btn-primary" onClick={this.handleReload}>
                  再読み込み
                </button>
              </div>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
