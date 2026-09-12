"use client";

import { usePathname } from "next/navigation";
import { BottomNav } from "@/components/BottomNav";
import { SocialSync } from "@/components/SocialSync";

const immersive = ["/card", "/complete", "/timer", "/journal", "/share"];

export function AppChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const hideNav = immersive.some((p) => pathname.startsWith(p));

  return (
    <>
      <SocialSync />
      <div
        className={
          hideNav ? "flex-1" : "flex-1 pb-[calc(3.5rem_+_env(safe-area-inset-bottom))]"
        }
      >
        {children}
      </div>
      {!hideNav && <BottomNav />}
    </>
  );
}
