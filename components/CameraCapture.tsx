"use client";

import { useEffect, useRef, useState } from "react";

type FacingMode = "environment" | "user";

/**
 * DAYDLE内の簡易カメラ。1枚撮影・前後カメラ切替のみに絞っている。
 * 将来「外カメラ＋内カメラの2枚」に拡張する場合も、facingModeごとに
 * このコンポーネントをもう一度呼び出せる構造にしてある。
 */
export function CameraCapture({
  onCapture,
  onCancel,
}: {
  onCapture: (blob: Blob) => void;
  onCancel: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [facingMode, setFacingMode] = useState<FacingMode>("environment");
  const [capturedUrl, setCapturedUrl] = useState<string | null>(null);
  const [capturedBlob, setCapturedBlob] = useState<Blob | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (capturedUrl) return;
    let cancelled = false;

    async function start() {
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch {
        if (!cancelled) setError("カメラを使用できませんでした。");
      }
    }

    start();
    return () => {
      cancelled = true;
    };
  }, [facingMode, capturedUrl]);

  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  function handleCapture() {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0);
    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        streamRef.current?.getTracks().forEach((track) => track.stop());
        setCapturedBlob(blob);
        setCapturedUrl(URL.createObjectURL(blob));
      },
      "image/jpeg",
      0.92
    );
  }

  function handleRetake() {
    if (capturedUrl) URL.revokeObjectURL(capturedUrl);
    setCapturedUrl(null);
    setCapturedBlob(null);
  }

  function handleUse() {
    if (capturedBlob) onCapture(capturedBlob);
  }

  function handleFlip() {
    setFacingMode((m) => (m === "environment" ? "user" : "environment"));
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-ink">
      {error ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-6 px-6 text-center">
          <p className="text-sm text-cream/80">{error}</p>
          <button
            type="button"
            onClick={onCancel}
            className="touch-manipulation text-sm text-cream underline underline-offset-4"
          >
            閉じる
          </button>
        </div>
      ) : capturedUrl ? (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={capturedUrl} alt="撮影した写真" className="flex-1 object-cover" />
          <div
            className="flex items-center justify-center gap-8 bg-ink py-8"
            style={{ paddingBottom: "calc(2rem + env(safe-area-inset-bottom))" }}
          >
            <button
              type="button"
              onClick={handleRetake}
              className="touch-manipulation px-3 py-3 text-sm text-cream/70"
            >
              撮り直す
            </button>
            <button
              type="button"
              onClick={handleUse}
              className="touch-manipulation rounded-2xl bg-cream px-6 py-3.5 text-[15px] text-ink"
            >
              この写真を使う
            </button>
          </div>
        </>
      ) : (
        <>
          <div className="relative flex-1 overflow-hidden">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="h-full w-full object-cover"
            />
          </div>
          <div
            className="flex flex-col items-center gap-5 bg-ink py-8"
            style={{ paddingBottom: "calc(2rem + env(safe-area-inset-bottom))" }}
          >
            <button
              type="button"
              onClick={handleCapture}
              aria-label="撮影"
              className="touch-manipulation h-16 w-16 rounded-full border-4 border-cream"
            />
            <div className="flex items-center gap-8 text-xs text-cream/60">
              <button type="button" onClick={onCancel} className="touch-manipulation px-2 py-2">
                キャンセル
              </button>
              <button type="button" onClick={handleFlip} className="touch-manipulation px-2 py-2">
                ↻ カメラ切替
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
