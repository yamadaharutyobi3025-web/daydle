"use client";

import { usePathname } from "next/navigation";
import { BottomNav } from "@/components/BottomNav";
import { SocialSync } from "@/components/SocialSync";
import { ProfileIconButton } from "@/components/ProfileIconButton";

const immersive = ["/card", "/complete", "/timer", "/journal", "/share", "/post"];
// ここは既にアカウント導線がある（または導線そのものである）画面なので、
// 右上のプロフィールアイコンは重ねて出さない。
const hideProfileIconOn = [...immersive, "/login", "/account", "/search", "/u"];

export function AppChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const hideNav = immersive.some((p) => pathname.startsWith(p));
  const hideProfileIcon = hideProfileIconOn.some((p) => pathname.startsWith(p));

  return (
    <>
      <SocialSync />
      {!hideProfileIcon && <ProfileIconButton />}
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
