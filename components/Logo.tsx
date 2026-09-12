import { CurvedPath } from "@/components/CurvedPath";

const sizes = {
  sm: { text: "text-sm", curveW: "w-8", curveH: "h-2" },
  md: { text: "text-lg", curveW: "w-10", curveH: "h-2.5" },
  lg: { text: "text-3xl", curveW: "w-16", curveH: "h-4" },
} as const;

export function Logo({
  size = "md",
  muted = false,
  mark = true,
}: {
  size?: keyof typeof sizes;
  muted?: boolean;
  /** ロゴの右に、ブランドモチーフの曲線を添えるか */
  mark?: boolean;
}) {
  const s = sizes[size];
  return (
    <span className="inline-flex items-center gap-2.5">
      <span
        className={`${s.text} font-semibold tracking-[0.2em] ${
          muted ? "text-ink-soft" : "text-ink"
        }`}
      >
        DAYDLE
      </span>
      {mark && (
        <CurvedPath className={`${s.curveW} ${s.curveH} text-sage/70`} />
      )}
    </span>
  );
}
