"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/Button";
import { createClient } from "@/lib/supabase/client";
import { compressImage } from "@/lib/imageCompress";

const USERNAME_PATTERN = /^[a-zA-Z0-9_-]{3,20}$/;
const DISPLAY_NAME_MAX = 30;
const BIO_MAX = 160;

/**
 * StorageUnknownError（fetch自体が失敗した。RLS/権限とは無関係）と
 * StorageApiError（サーバーがエラーを返した）を区別し、前者は
 * 「通信エラー」として分かりやすく表示する。詳細は必ずconsoleにも出す。
 * （@supabase/storage-jsは間接依存のため、型は構造的に受け取る）
 */
function describeStorageError(error: { name: string; message: string }): string {
  if (error.name === "StorageUnknownError") {
    return `画像のアップロードに失敗しました（通信エラー: ${error.message}）。電波状況を確認してもう一度お試しください。`;
  }
  return `画像のアップロードに失敗しました: ${error.message}`;
}

type Profile = {
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  is_private: boolean;
};

export function ProfileEditForm({
  userId,
  initialProfile,
}: {
  userId: string;
  initialProfile: Profile;
}) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [username, setUsername] = useState(initialProfile.username);
  const [displayName, setDisplayName] = useState(initialProfile.display_name ?? "");
  const [bio, setBio] = useState(initialProfile.bio ?? "");
  const [isPrivate, setIsPrivate] = useState(initialProfile.is_private);

  const [avatarUrl, setAvatarUrl] = useState(initialProfile.avatar_url);
  const [avatarFile, setAvatarFile] = useState<Blob | null>(null);
  const [avatarPreviewUrl, setAvatarPreviewUrl] = useState<string | null>(null);
  const [isProcessingPhoto, setIsProcessingPhoto] = useState(false);

  const [isSaving, setIsSaving] = useState(false);
  const [usernameError, setUsernameError] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    return () => {
      if (avatarPreviewUrl) URL.revokeObjectURL(avatarPreviewUrl);
    };
  }, [avatarPreviewUrl]);

  async function handlePickAvatar(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    setIsProcessingPhoto(true);
    try {
      const compressed = await compressImage(file);
      setAvatarPreviewUrl((old) => {
        if (old) URL.revokeObjectURL(old);
        return URL.createObjectURL(compressed);
      });
      setAvatarFile(compressed);
    } finally {
      setIsProcessingPhoto(false);
    }
  }

  function handleRemoveAvatar() {
    setAvatarFile(null);
    setAvatarPreviewUrl((old) => {
      if (old) URL.revokeObjectURL(old);
      return null;
    });
    setAvatarUrl(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setUsernameError("");
    setErrorMessage("");

    if (!USERNAME_PATTERN.test(username)) {
      setUsernameError("半角英数字・_・-のみ、3〜20文字で入力してください。");
      return;
    }

    setIsSaving(true);
    try {
      const supabase = createClient();
      const avatarPath = `${userId}/avatar.jpg`;
      let nextAvatarUrl = avatarUrl;

      // 新しい画像を選んだ場合だけアップロードする。公開設定など、
      // 画像と無関係な項目だけを変更した保存では、この分岐に入らない
      // （＝ネットワーク越しの画像アップロードは行わない）。
      if (avatarFile) {
        const { error: uploadError } = await supabase.storage
          .from("avatars")
          .upload(avatarPath, avatarFile, {
            upsert: true,
            contentType: "image/jpeg",
          });
        if (uploadError) {
          console.error("avatar upload failed", uploadError.name, uploadError);
          setErrorMessage(describeStorageError(uploadError));
          return;
        }
        // アップロード済みのファイルを、保存に失敗した場合の再送信で
        // もう一度アップロードしてしまわないよう、ここで確定させる。
        setAvatarFile(null);
        setAvatarPreviewUrl((old) => {
          if (old) URL.revokeObjectURL(old);
          return null;
        });
        const { data } = supabase.storage.from("avatars").getPublicUrl(avatarPath);
        nextAvatarUrl = `${data.publicUrl}?v=${Date.now()}`;
        setAvatarUrl(nextAvatarUrl);
      } else if (avatarUrl === null && initialProfile.avatar_url) {
        // 明示的に削除された場合のみ、保存済みファイルの削除を試みる
        // （失敗しても致命的ではないので結果は無視する）。
        void supabase.storage.from("avatars").remove([avatarPath]);
      }

      const { error: updateError } = await supabase
        .from("profiles")
        .update({
          username,
          display_name: displayName.trim() || null,
          bio: bio.trim() || null,
          avatar_url: nextAvatarUrl,
          is_private: isPrivate,
        })
        .eq("id", userId);

      if (updateError) {
        console.error("profile update failed", updateError.code, updateError);
        if (updateError.code === "23505") {
          setUsernameError("このusernameは既に使われています。");
        } else {
          setErrorMessage(updateError.message);
        }
        return;
      }

      router.push("/account");
      router.refresh();
    } catch (err) {
      console.error("profile save failed", err);
      setErrorMessage(err instanceof Error ? err.message : "保存に失敗しました。");
    } finally {
      setIsSaving(false);
    }
  }

  const previewSrc = avatarPreviewUrl ?? avatarUrl ?? "/icon-192";

  return (
    <form onSubmit={handleSubmit} className="mt-10 flex flex-col gap-6">
      <div className="flex flex-col items-center gap-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={previewSrc}
          alt=""
          className="h-24 w-24 rounded-full object-cover bg-cream-deep/60"
        />
        <div className="flex gap-4 text-xs">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isProcessingPhoto}
            className="touch-manipulation text-ink-soft underline underline-offset-4"
          >
            {isProcessingPhoto ? "処理中…" : "画像を選ぶ"}
          </button>
          {(avatarPreviewUrl || avatarUrl) && (
            <button
              type="button"
              onClick={handleRemoveAvatar}
              className="touch-manipulation text-ink-soft/60 underline underline-offset-4"
            >
              画像を削除
            </button>
          )}
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handlePickAvatar}
          className="hidden"
        />
      </div>

      <div>
        <label className="text-[13px] text-ink-soft">username</label>
        <input
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="username"
          className="mt-1.5 w-full rounded-2xl border border-line/80 bg-cream px-4 py-3 text-[15px] text-ink outline-none focus:border-sage"
        />
        {usernameError && <p className="mt-1 text-xs text-red-700/80">{usernameError}</p>}
      </div>

      <div>
        <label className="text-[13px] text-ink-soft">表示名</label>
        <input
          type="text"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value.slice(0, DISPLAY_NAME_MAX))}
          maxLength={DISPLAY_NAME_MAX}
          placeholder="表示名（任意）"
          className="mt-1.5 w-full rounded-2xl border border-line/80 bg-cream px-4 py-3 text-[15px] text-ink outline-none focus:border-sage"
        />
      </div>

      <div>
        <label className="text-[13px] text-ink-soft">自己紹介</label>
        <textarea
          value={bio}
          onChange={(e) => setBio(e.target.value.slice(0, BIO_MAX))}
          maxLength={BIO_MAX}
          rows={3}
          placeholder="自己紹介（任意）"
          className="mt-1.5 w-full resize-none rounded-2xl bg-cream-deep/40 px-4 py-3 text-sm leading-relaxed text-ink placeholder:text-ink-soft/50 focus:outline-none"
        />
        <p className="mt-1 text-right text-[11px] text-ink-soft/50">
          {bio.length} / {BIO_MAX}
        </p>
      </div>

      <div>
        <p className="text-[13px] text-ink-soft">公開設定</p>
        <div className="mt-1.5 flex gap-2">
          <button
            type="button"
            onClick={() => setIsPrivate(false)}
            className={`relative z-10 touch-manipulation rounded-full px-4 py-2 text-sm transition-colors ${
              !isPrivate ? "bg-sage-soft text-sage-deep" : "bg-cream-deep/50 text-ink-soft"
            }`}
          >
            公開
          </button>
          <button
            type="button"
            onClick={() => setIsPrivate(true)}
            className={`relative z-10 touch-manipulation rounded-full px-4 py-2 text-sm transition-colors ${
              isPrivate ? "bg-sage-soft text-sage-deep" : "bg-cream-deep/50 text-ink-soft"
            }`}
          >
            非公開
          </button>
        </div>
        <p className="mt-2 text-[11px] leading-relaxed text-ink-soft/60">
          非公開にすると、フォローには承認が必要になります（今後の段階で追加予定）。
          公開/非公開に関わらず、username・表示名・画像・自己紹介は他の人から見えます。
        </p>
      </div>

      {errorMessage && <p className="text-xs text-red-700/80">{errorMessage}</p>}

      <Button type="submit" disabled={isSaving} className="w-full">
        {isSaving ? "保存中…" : "保存する"}
      </Button>
    </form>
  );
}
