import { evaluateStrength } from "../lib/validation";

interface Props {
  passphrase: string;
  hint: string;
  showLength: boolean;
}

export function StrengthMeter({ passphrase, hint, showLength }: Props) {
  if (!passphrase) return null;

  const result = evaluateStrength(passphrase, hint, showLength);

  const levelClass = {
    low: "strength-low",
    medium: "strength-medium",
    high: "strength-high",
  }[result.level];

  const barWidth = {
    low: "30%",
    medium: "60%",
    high: "100%",
  }[result.level];

  return (
    <div className="strength-meter">
      <div className="strength-bar-track">
        <div
          className={`strength-bar-fill ${levelClass}`}
          style={{ width: barWidth }}
        />
      </div>
      <div className={`strength-label ${levelClass}`}>
        {result.label}
      </div>
      <div className="strength-description">{result.description}</div>
    </div>
  );
}
