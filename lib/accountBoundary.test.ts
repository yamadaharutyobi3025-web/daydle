import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  ANONYMOUS_MARKER,
  ownerMarkerFor,
  shouldClearOnOwnerChange,
  getStoredOwnerMarker,
  setStoredOwnerMarker,
  applyAccountBoundaryGuard,
} from "@/lib/accountBoundary";

describe("ownerMarkerFor", () => {
  it("未ログイン(null)はANONYMOUS_MARKERになる", () => {
    expect(ownerMarkerFor(null)).toBe(ANONYMOUS_MARKER);
  });

  it("ログイン中はそのuser_idがそのままmarkerになる", () => {
    expect(ownerMarkerFor("user-a")).toBe("user-a");
  });
});

describe("shouldClearOnOwnerChange", () => {
  it("初回（storedMarkerがnull）は消さない：導入前からの既存ローカルデータを壊さないため", () => {
    expect(shouldClearOnOwnerChange(null, ANONYMOUS_MARKER)).toBe(false);
    expect(shouldClearOnOwnerChange(null, "user-a")).toBe(false);
  });

  it("同じmarkerが続く場合は消さない", () => {
    expect(shouldClearOnOwnerChange(ANONYMOUS_MARKER, ANONYMOUS_MARKER)).toBe(false);
    expect(shouldClearOnOwnerChange("user-a", "user-a")).toBe(false);
  });

  it("匿名 -> 初回ログインは消さない（既存の匿名データをそのアカウントが引き継ぐ）", () => {
    expect(shouldClearOnOwnerChange(ANONYMOUS_MARKER, "user-a")).toBe(false);
  });

  it("アカウントA -> アカウントBへの直接切り替えは消す（ログアウトを経由しないケース、/dev-login等）", () => {
    expect(shouldClearOnOwnerChange("user-a", "user-b")).toBe(true);
  });

  it("アカウントA -> ログアウト(匿名)は消す：次に使う人にAのデータを引き継がせない", () => {
    expect(shouldClearOnOwnerChange("user-a", ANONYMOUS_MARKER)).toBe(true);
  });
});

describe("getStoredOwnerMarker / setStoredOwnerMarker", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("未保存の状態ではnullを返す", () => {
    expect(getStoredOwnerMarker()).toBeNull();
  });

  it("保存した値を読み戻せる", () => {
    setStoredOwnerMarker("user-a");
    expect(getStoredOwnerMarker()).toBe("user-a");
  });
});

function makeClearers() {
  return {
    clearState: vi.fn(),
    clearContext: vi.fn(),
    clearPhotos: vi.fn().mockResolvedValue(undefined),
  };
}

describe("applyAccountBoundaryGuard（A/B/Cアカウント切り替えの統合シナリオ）", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("初回起動（匿名）：何も消さず、markerだけ記録する", async () => {
    const clearers = makeClearers();
    await applyAccountBoundaryGuard(null, clearers);

    expect(clearers.clearState).not.toHaveBeenCalled();
    expect(clearers.clearContext).not.toHaveBeenCalled();
    expect(clearers.clearPhotos).not.toHaveBeenCalled();
    expect(getStoredOwnerMarker()).toBe(ANONYMOUS_MARKER);
  });

  it("匿名 -> Aが初めてログイン：既存のローカル履歴を引き継ぐため消さない", async () => {
    const clearers = makeClearers();
    await applyAccountBoundaryGuard(null, clearers); // 初回起動（匿名）
    await applyAccountBoundaryGuard("user-a", clearers); // Aがログイン

    expect(clearers.clearState).not.toHaveBeenCalled();
    expect(getStoredOwnerMarker()).toBe("user-a");
  });

  it("Aがリロード・別タブでアクセス：同じアカウントのままなら消さない", async () => {
    const clearers = makeClearers();
    await applyAccountBoundaryGuard("user-a", clearers);
    clearers.clearState.mockClear();

    // 別タブ・リロードを模した2回目の呼び出し（同じuser_id）
    await applyAccountBoundaryGuard("user-a", clearers);

    expect(clearers.clearState).not.toHaveBeenCalled();
    expect(getStoredOwnerMarker()).toBe("user-a");
  });

  it("Aがログアウト：ローカルの個人データを全消去し、記録が0件になる状態にする", async () => {
    const clearers = makeClearers();
    await applyAccountBoundaryGuard("user-a", clearers);
    clearers.clearState.mockClear();
    clearers.clearContext.mockClear();
    clearers.clearPhotos.mockClear();

    await applyAccountBoundaryGuard(null, clearers); // ログアウト

    expect(clearers.clearState).toHaveBeenCalledTimes(1);
    expect(clearers.clearContext).toHaveBeenCalledTimes(1);
    expect(clearers.clearPhotos).toHaveBeenCalledTimes(1);
    expect(getStoredOwnerMarker()).toBe(ANONYMOUS_MARKER);
  });

  it("Aが記録Aを作った状態からBへ直接切り替え（/dev-login等でログアウトを経由しない）：Bには見えないよう全消去する", async () => {
    const clearers = makeClearers();
    await applyAccountBoundaryGuard("user-a", clearers); // Aとしてログイン中（記録Aが存在する想定）
    clearers.clearState.mockClear();

    await applyAccountBoundaryGuard("user-b", clearers); // ログアウトを挟まずBへ切り替え

    expect(clearers.clearState).toHaveBeenCalledTimes(1);
    expect(clearers.clearContext).toHaveBeenCalledTimes(1);
    expect(clearers.clearPhotos).toHaveBeenCalledTimes(1);
    expect(getStoredOwnerMarker()).toBe("user-b");
  });

  it("Bが記録Bを作った後、Aに戻る：Aには見えないよう全消去する", async () => {
    const clearers = makeClearers();
    await applyAccountBoundaryGuard("user-a", clearers);
    await applyAccountBoundaryGuard("user-b", clearers); // A -> B（この時点でAのデータは消去済み）
    clearers.clearState.mockClear();
    clearers.clearContext.mockClear();
    clearers.clearPhotos.mockClear();

    await applyAccountBoundaryGuard("user-a", clearers); // B -> A

    expect(clearers.clearState).toHaveBeenCalledTimes(1);
    expect(clearers.clearContext).toHaveBeenCalledTimes(1);
    expect(clearers.clearPhotos).toHaveBeenCalledTimes(1);
    expect(getStoredOwnerMarker()).toBe("user-a");
  });

  it("Cが未ログインで開く（Bが直前に使っていた端末）：ログアウトを経由していればCは何も見えない状態になっている", async () => {
    const clearers = makeClearers();
    await applyAccountBoundaryGuard("user-b", clearers);
    await applyAccountBoundaryGuard(null, clearers); // Bがログアウト（この時点でBのデータは消去済み）
    clearers.clearState.mockClear();

    await applyAccountBoundaryGuard(null, clearers); // Cが未ログインのままアクセス

    expect(clearers.clearState).not.toHaveBeenCalled(); // 既に空なので追加の消去は不要
    expect(getStoredOwnerMarker()).toBe(ANONYMOUS_MARKER);
  });
});
