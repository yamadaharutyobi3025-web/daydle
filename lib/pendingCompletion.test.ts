import { describe, it, expect, beforeEach } from "vitest";
import {
  getPendingCompletion,
  setPendingCompletion,
  clearPendingCompletion,
} from "@/lib/pendingCompletion";

describe("pendingCompletion（未ログインで「できた」を押したときの復帰用の目印）", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("未保存の状態ではnullを返す", () => {
    expect(getPendingCompletion()).toBeNull();
  });

  it("保存した値をそのまま読み戻せる", () => {
    setPendingCompletion({ date: "2026-01-10", missionId: "walk_001" });
    expect(getPendingCompletion()).toEqual({ date: "2026-01-10", missionId: "walk_001" });
  });

  it("clearすると消える", () => {
    setPendingCompletion({ date: "2026-01-10", missionId: "walk_001" });
    clearPendingCompletion();
    expect(getPendingCompletion()).toBeNull();
  });

  it("壊れたJSONが入っていてもクラッシュせずnullを返す", () => {
    window.localStorage.setItem("daydle_pending_complete_v1", "{not json");
    expect(getPendingCompletion()).toBeNull();
  });
});
