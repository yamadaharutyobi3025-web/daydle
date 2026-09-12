"use client";

import Link from "next/link";
import { Logo } from "@/components/Logo";
import { CurvedPath } from "@/components/CurvedPath";
import { PosterSignature } from "@/components/PosterSignature";

export default function CompletePage() {
  return (
    <main className="mx-auto flex min-h-[100dvh] w-full max-w-sm flex-col items-center justify-center px-8 text-center">
      <div className="animate-fade-in flex flex-col items-center">
        <Logo size="sm" muted />
        <p className="mt-14 font-serif-jp text-[24px] leading-[1.9] text-ink">
          今日は、
          <br />
          いつもならしなかったことを
          <br />
          ひとつしました。
        </p>
        <CurvedPath className="mt-12 h-7 w-36 text-sage/80" />
        <PosterSignature className="mt-6" />
      </div>

      <Link
        href="/record"
        className="relative z-10 mt-16 touch-manipulation text-xs text-ink-soft/60"
      >
        <span className="absolute -inset-3" aria-hidden="true" />
        記録を見る
      </Link>
    </main>
  );
}
