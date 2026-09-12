"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/Button";
import { createClient } from "@/lib/supabase/client";

export function FollowRequestActions({
  followerId,
  followeeId,
}: {
  followerId: string;
  followeeId: string;
}) {
  const router = useRouter();
  const [isSaving, setIsSaving] = useState(false);
  const [done, setDone] = useState(false);

  async function handleApprove() {
    setIsSaving(true);
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from("follows")
        .update({ status: "accepted" })
        .eq("follower_id", followerId)
        .eq("followee_id", followeeId);
      if (error) {
        console.error("approve failed", error);
        return;
      }
      setDone(true);
      router.refresh();
    } finally {
      setIsSaving(false);
    }
  }

  async function handleReject() {
    setIsSaving(true);
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from("follows")
        .delete()
        .eq("follower_id", followerId)
        .eq("followee_id", followeeId);
      if (error) {
        console.error("reject failed", error);
        return;
      }
      setDone(true);
      router.refresh();
    } finally {
      setIsSaving(false);
    }
  }

  if (done) return null;

  return (
    <div className="flex gap-2">
      <Button variant="soft" onClick={handleApprove} disabled={isSaving}>
        承認
      </Button>
      <Button variant="ghost" onClick={handleReject} disabled={isSaving}>
        却下
      </Button>
    </div>
  );
}
