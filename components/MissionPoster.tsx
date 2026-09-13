import type { Mission } from "@/types/mission";
import { PhoneModeBadge } from "@/components/PhoneModeBadge";
import { Logo } from "@/components/Logo";
import { Scenery } from "@/components/Scenery";
import { PosterSignature } from "@/components/PosterSignature";
import { formatDurationLabel } from "@/lib/durationDisplay";

export function MissionPoster({
  mission,
  dateLabel,
  label = "今日の遠回り",
}: {
  mission: Mission;
  dateLabel: string;
  label?: string;
}) {
  return (
    <div className="flex h-full w-full flex-col">
      <div className="flex w-full items-center justify-between">
        <Logo size="sm" muted />
        <span className="text-xs text-ink-soft">{dateLabel}</span>
      </div>

      <div className="mt-10">
        <p className="text-xs tracking-[0.2em] text-sage-deep">{label}</p>
        <p className="mt-5 font-serif-jp text-[26px] leading-[1.85] text-ink">
          {mission.description}
        </p>
      </div>

      <div className="mt-8 flex flex-wrap items-center gap-2">
        <span className="rounded-full bg-cream-deep/70 px-3 py-1 text-[11px] tracking-wide text-ink-soft">
          {formatDurationLabel(mission.duration, mission.displayDuration)}
        </span>
        <PhoneModeBadge phoneMode={mission.phoneMode} allowedTools={mission.allowedTools} />
      </div>

      {mission.safetyNote && (
        <p className="mt-4 text-xs leading-relaxed text-ink-soft/80">
          ※ {mission.safetyNote}
        </p>
      )}

      <div className="mt-auto flex flex-col items-center gap-6 overflow-hidden pt-14">
        <Scenery className="-mx-6 h-20 w-[calc(100%+3rem)] text-sage/[0.12]" />
        <PosterSignature />
      </div>
    </div>
  );
}
