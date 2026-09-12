import type { PhoneMode, AllowedTool } from "@/types/mission";
import { IconOffline, IconConnect, IconCamera, IconMap } from "@/components/icons";

const toolLabel: Record<AllowedTool, string> = {
  camera: "カメラ使用OK",
  maps: "地図使用OK",
  call: "電話使用OK",
  message: "メッセージ使用OK",
};

export function getPhoneModeLabel(
  phoneMode: PhoneMode,
  allowedTools: AllowedTool[]
): string {
  if (phoneMode === "offline") return "OFFLINE";
  if (phoneMode === "connect") return "CONNECT";
  return allowedTools[0] ? toolLabel[allowedTools[0]] : "TOOL";
}

function Icon({
  phoneMode,
  allowedTools,
  className,
}: {
  phoneMode: PhoneMode;
  allowedTools: AllowedTool[];
  className?: string;
}) {
  if (phoneMode === "offline") return <IconOffline className={className} />;
  if (phoneMode === "connect") return <IconConnect className={className} />;
  if (allowedTools.includes("maps")) return <IconMap className={className} />;
  return <IconCamera className={className} />;
}

export function PhoneModeBadge({
  phoneMode,
  allowedTools,
  variant = "tag",
}: {
  phoneMode: PhoneMode;
  allowedTools: AllowedTool[];
  /** "tag" = 淡い背景つきの小さなタグ。"plain" = 背景なしの控えめな添え書き。 */
  variant?: "tag" | "plain";
}) {
  if (variant === "plain") {
    return (
      <span className="inline-flex items-center gap-1.5 text-[11px] tracking-wide text-ink-soft/60">
        <Icon phoneMode={phoneMode} allowedTools={allowedTools} className="h-[11px] w-[11px]" />
        {getPhoneModeLabel(phoneMode, allowedTools)}
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-cream-deep/70 px-3 py-1 text-[11px] tracking-wide text-ink-soft">
      <Icon phoneMode={phoneMode} allowedTools={allowedTools} className="h-3 w-3 text-sage-deep" />
      {getPhoneModeLabel(phoneMode, allowedTools)}
    </span>
  );
}
