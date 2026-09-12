/**
 * タイマー終了時の控えめなフィードバック（音・振動・通知）。
 * どれも「使えれば使う」任意機能。使えない環境では静かに何もしない。
 */

let audioCtx: AudioContext | null = null;

/** ユーザー操作（「やる」を押した瞬間など）の中で呼び、後で音を鳴らせるようにしておく。
 * iOS Safariは、ユーザー操作に紐づかないAudioContextの再生を許可しないため。 */
export function primeAudio(): void {
  if (typeof window === "undefined") return;
  try {
    if (!audioCtx) {
      const Ctx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext })
          .webkitAudioContext;
      if (Ctx) audioCtx = new Ctx();
    }
    void audioCtx?.resume();
  } catch {
    // 音が使えなくても致命的ではない
  }
}

/** ごく短く、静かな2音のチャイム。派手なアラーム音は使わない。 */
export function playChime(): void {
  if (!audioCtx) return;
  try {
    const ctx = audioCtx;
    const now = ctx.currentTime;
    [0, 0.22].forEach((offset, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = i === 0 ? 660 : 880;
      gain.gain.setValueAtTime(0, now + offset);
      gain.gain.linearRampToValueAtTime(0.07, now + offset + 0.03);
      gain.gain.linearRampToValueAtTime(0, now + offset + 0.35);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + offset);
      osc.stop(now + offset + 0.4);
    });
  } catch {
    // noop
  }
}

/** 対応端末（主にAndroid）でだけ、ごく短く振動する。iOS Safariは非対応。 */
export function vibrateSoftly(): void {
  if (typeof navigator === "undefined") return;
  if ("vibrate" in navigator) {
    try {
      navigator.vibrate([80, 60, 80]);
    } catch {
      // noop
    }
  }
}

export function isNotificationSupported(): boolean {
  return typeof window !== "undefined" && "Notification" in window;
}

export function getNotificationPermission(): NotificationPermission | null {
  if (!isNotificationSupported()) return null;
  return Notification.permission;
}

/** ユーザー操作の中でのみ呼ぶこと（ブラウザの許可ダイアログを開く）。 */
export async function requestNotificationPermission(): Promise<NotificationPermission | null> {
  if (!isNotificationSupported()) return null;
  try {
    return await Notification.requestPermission();
  } catch {
    return null;
  }
}

export function showTimerNotification(body: string): void {
  if (!isNotificationSupported()) return;
  if (Notification.permission !== "granted") return;
  try {
    new Notification("DAYDLE", { body });
  } catch {
    // noop
  }
}
