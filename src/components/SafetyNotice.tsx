export function SafetyNotice() {
  return (
    <details className="safety-notice">
      <summary>このアプリについて</summary>
      <div className="safety-notice-content">
        <p>
          このツールはプレゼント、謎解き、SNS遊びなどの
          <strong>エンタメ用途</strong>を想定しています。
        </p>
        <ul>
          <li>医療情報、金融情報、業務機密などの重要情報には使用しないでください。</li>
          <li>ヒントや入力形式はQRを読み取った人なら誰でも見られます。</li>
          <li>あいことばは短すぎると推測されやすくなります。</li>
          <li>本文とあいことばはどこにも保存されません。</li>
        </ul>
      </div>
    </details>
  );
}
