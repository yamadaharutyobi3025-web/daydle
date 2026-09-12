/**
 * DAYDLEのポスター系画面（今日の遠回り / CARD MODE）の下半分に敷く、
 * ごく淡い風景の線画。遠い街並み、川（曲がった道）、草を一本線の抽象画で表す。
 * 文字より目立ってはいけないので、常に低い不透明度のcurrentColorで使うこと。
 */
export function Scenery({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 400 130"
      fill="none"
      preserveAspectRatio="none"
      className={`pointer-events-none ${className}`}
      aria-hidden="true"
    >
      {/* 遠い街並みと稜線がひとつながりになった水平線 */}
      <path
        d="M0 74 C 28 70, 46 78, 66 74 L 76 74 L 76 60 L 90 60 L 90 74
           L 126 74 C 154 80, 182 68, 210 73 L 220 73 L 220 58 L 234 58 L 234 73
           C 268 79, 300 71, 332 75 S 372 82, 400 73"
        stroke="currentColor"
        strokeWidth="0.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* 川、あるいは曲がった道。地平線の向こうまで蛇行しながら続く */}
      <path
        d="M186 130 C 174 112, 198 100, 182 84 S 196 68, 190 56"
        stroke="currentColor"
        strokeWidth="0.75"
        strokeLinecap="round"
      />
      {/* 手前の草むら */}
      <g stroke="currentColor" strokeWidth="0.75" strokeLinecap="round">
        <path d="M24 130 L 20 118" />
        <path d="M32 130 L 30 116" />
        <path d="M40 130 L 39 120" />
        <path d="M356 130 L 360 117" />
        <path d="M348 130 L 350 119" />
        <path d="M364 130 L 365 121" />
      </g>
    </svg>
  );
}
