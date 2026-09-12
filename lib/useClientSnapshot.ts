"use client";

import { useSyncExternalStore } from "react";

const UNLOADED = Symbol("unloaded");

function noopSubscribe(): () => void {
  return () => {};
}

/**
 * localStorageなど、クライアントにしか存在しない値を安全に読み出すためのフック。
 * サーバー描画時・ハイドレーション直後は`unloaded`を返し、
 * ハイドレーションが完了した直後に実際の値へ切り替わる。
 * setStateをuseEffect内で呼ばずに済むため、React 19の
 * react-hooks/set-state-in-effect ルールにも抵触しない。
 */
export function useClientSnapshot<T>(getSnapshot: () => T): T | typeof UNLOADED {
  return useSyncExternalStore(
    noopSubscribe,
    getSnapshot,
    () => UNLOADED as T | typeof UNLOADED
  );
}

useClientSnapshot.UNLOADED = UNLOADED;
export { UNLOADED };
