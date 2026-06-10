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
          <li>宛名・差出人・ヒント・入力形式は、QRを読み取った人なら開封前でも見られます。</li>
          <li>あいことばは短すぎると推測されやすくなります。</li>
          <li>本文とあいことばはどこにも保存・送信されません。暗号化も開封もすべてお使いの端末の中だけで行われます。</li>
        </ul>
      </div>
    </details>
  );
}
