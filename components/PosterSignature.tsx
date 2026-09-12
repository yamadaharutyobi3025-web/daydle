/**
 * ポスター化する画面（今日の遠回り / CARD MODE）の最下部に置く、ごく小さな署名。
 * スクリーンショットしたときに、それがDAYDLEだとひと目でわかるための最後の一押し。
 */
export function PosterSignature({ className = "" }: { className?: string }) {
  return (
    <span
      className={`pointer-events-none select-none text-[10px] tracking-[0.28em] text-ink-soft/40 ${className}`}
    >
      WASTE YOUR TIME WELL.
    </span>
  );
}
