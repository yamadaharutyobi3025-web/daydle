import { describe, it, expect } from "vitest";
import { computeDetourNumber, type JournalEntry } from "@/lib/journal";

function entry(date: string): JournalEntry {
  return {
    id: `id-${date}`,
    user_id: "user-a",
    date,
    mission_id: "walk_001",
    mission_text: "テスト用ミッション",
    reflection: null,
    note: null,
    photo_path: null,
    completed_at: `${date}T00:00:00.000Z`,
    created_at: `${date}T00:00:00.000Z`,
    updated_at: `${date}T00:00:00.000Z`,
  };
}

describe("computeDetourNumber", () => {
  it("対象の日付がentriesに1件もなければ、件数（0）を返す保険動作になる", () => {
    // 実際の呼び出し元（/share/[date]）は、対象日付の記録が既に存在する
    // 場合にしか呼ばないため、この分岐へは通常到達しない防御的な挙動。
    expect(computeDetourNumber([], "2026-01-10")).toBe(0);
  });

  it("日付の古い順に1から数える", () => {
    const entries = [entry("2026-01-10"), entry("2026-01-05"), entry("2026-01-08")];
    expect(computeDetourNumber(entries, "2026-01-05")).toBe(1);
    expect(computeDetourNumber(entries, "2026-01-08")).toBe(2);
    expect(computeDetourNumber(entries, "2026-01-10")).toBe(3);
  });

  it("他ユーザーの記録が混ざっていても、渡されたentries配列だけを見て数える（呼び出し側がRLSで既に本人分のみに絞っている前提）", () => {
    const entries = [entry("2026-01-05"), entry("2026-01-08")];
    // 呼び出し側の日付がentriesに含まれない場合は末尾扱い
    expect(computeDetourNumber(entries, "2026-01-20")).toBe(entries.length);
  });
});
