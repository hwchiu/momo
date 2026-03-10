/** Shared pulsing loading indicator used across all chart calculation tabs. */
export function LoadingMessage({ text }: { text: string }) {
  return (
    <div className="loading-msg">
      <span className="loading-star">✦</span>
      {text}
      <span className="loading-star loading-star--delayed">✦</span>
    </div>
  );
}
