"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/Button";
import { createClient } from "@/lib/supabase/client";

type FollowStatus = "none" | "pending" | "accepted";

export function FollowButton({
  viewerId,
  targetId,
  targetIsPrivate,
  initialStatus,
}: {
  viewerId: string | null;
  targetId: string;
  targetIsPrivate: boolean;
  initialStatus: FollowStatus;
}) {
  const router = useRouter();
  const [status, setStatus] = useState<FollowStatus>(initialStatus);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  if (viewerId === targetId) return null;

  if (!viewerId) {
    return (
      <Link href="/login">
        <Button variant="ghost">フォローするにはログイン</Button>
      </Link>
    );
  }

  async function handleFollow() {
    setIsSaving(true);
    setErrorMessage("");
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from("follows")
        .insert({ follower_id: viewerId!, followee_id: targetId });
      if (error) {
        console.error("follow failed", error);
        setErrorMessage("フォローに失敗しました。時間をおいて再度お試しください。");
        return;
      }
      // 実際のstatusはDB側のトリガーが対象のis_privateを見て決めるので、
      // それに合わせて楽観的に反映する。
      setStatus(targetIsPrivate ? "pending" : "accepted");
      router.refresh();
    } finally {
      setIsSaving(false);
    }
  }

  async function handleUnfollowOrCancel() {
    setIsSaving(true);
    setErrorMessage("");
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from("follows")
        .delete()
        .eq("follower_id", viewerId!)
        .eq("followee_id", targetId);
      if (error) {
        console.error("unfollow failed", error);
        setErrorMessage("解除に失敗しました。時間をおいて再度お試しください。");
        return;
      }
      setStatus("none");
      router.refresh();
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="flex flex-col items-start gap-1">
      {status === "none" && (
        <Button onClick={handleFollow} disabled={isSaving}>
          {targetIsPrivate ? "フォロー申請" : "フォロー"}
        </Button>
      )}
      {status === "pending" && (
        <Button variant="ghost" onClick={handleUnfollowOrCancel} disabled={isSaving}>
          申請中（取り消す）
        </Button>
      )}
      {status === "accepted" && (
        <Button variant="ghost" onClick={handleUnfollowOrCancel} disabled={isSaving}>
          フォロー中
        </Button>
      )}
      {errorMessage && <p className="text-xs text-red-700/80">{errorMessage}</p>}
    </div>
  );
}
