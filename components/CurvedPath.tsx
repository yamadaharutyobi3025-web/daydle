/**
 * DAYDLEのブランドモチーフ：「まっすぐ進まない線」。
 * まっすぐ進み、少し逸れて、また戻る一本の道を表す。
 */
export function CurvedPath({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 320 80"
      fill="none"
      className={`pointer-events-none ${className}`}
      aria-hidden="true"
    >
      <path
        d="M4 40 C 70 40, 90 8, 140 20 S 210 68, 260 40 S 300 20, 316 40"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}
