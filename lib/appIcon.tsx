import type { ReactElement } from "react";

/**
 * favicon / apple-icon / manifest用アイコンで共通利用するマーク。
 * ブランドモチーフである「少し曲がってまた戻る線」を、セージグリーンの背景に描く。
 */
export function AppIconMark({ size }: { size: number }): ReactElement {
  const letterSize = Math.round(size * 0.46);
  const strokeWidth = Math.max(2, Math.round(size * 0.02));

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#5f7756",
        position: "relative",
      }}
    >
      <div
        style={{
          display: "flex",
          fontSize: letterSize,
          fontWeight: 600,
          color: "#f7f2e8",
          fontFamily: "serif",
        }}
      >
        D
      </div>
      <svg
        width={size}
        height={Math.round(size * 0.18)}
        viewBox="0 0 100 20"
        style={{ position: "absolute", bottom: Math.round(size * 0.14), left: 0 }}
      >
        <path
          d="M2 10 C 26 10, 30 2, 50 10 S 74 18, 98 10"
          stroke="#f7f2e8"
          strokeWidth={strokeWidth}
          fill="none"
          strokeLinecap="round"
        />
      </svg>
    </div>
  );
}
