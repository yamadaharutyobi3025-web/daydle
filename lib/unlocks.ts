/**
 * 長時間ミッションの段階解放。ローカルの完了回数だけで判定し、
 * 課金・アカウント・サーバーとは一切関係しない（将来の有料版とは完全に分離）。
 * EXP・レベル・ポイント・進捗バーは持たない。
 */
export interface UnlockThreshold {
  minutes: number;
  atCount: number;
  message: { main: string; sub: string };
}

export const UNLOCK_THRESHOLDS: UnlockThreshold[] = [
  {
    minutes: 30,
    atCount: 3,
    message: {
      main: "もう少し遠くまで、行けそうです。",
      sub: "30分の遠回りも選べるようになりました。",
    },
  },
  {
    minutes: 60,
    atCount: 7,
    message: {
      main: "今日は、もう少し長く遠回りしてもよさそうです。",
      sub: "60分の遠回りも選べるようになりました。",
    },
  },
];

const BASE_MINUTES = [5, 15];

/** 完了回数から、今選べる時間の一覧を返す（未解放の分数は含まない＝完全非表示）。 */
export function getUnlockedMinutes(completedCount: number): number[] {
  const unlocked = [...BASE_MINUTES];
  for (const t of UNLOCK_THRESHOLDS) {
    if (completedCount >= t.atCount) unlocked.push(t.minutes);
  }
  return unlocked;
}

/** まだ通知していない解放段階のうち、最初の1件を返す（なければnull）。 */
export function getPendingUnlockNotice(
  completedCount: number,
  seenUnlocks: number[]
): UnlockThreshold | null {
  for (const t of UNLOCK_THRESHOLDS) {
    if (completedCount >= t.atCount && !seenUnlocks.includes(t.minutes)) {
      return t;
    }
  }
  return null;
}
