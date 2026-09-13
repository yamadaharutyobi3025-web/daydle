/**
 * 「みんな」タブ専用。新しい順に並んだ投稿の中で、同じ投稿者の投稿が
 * 2件以上連続しそうな箇所があれば、近くに別の投稿者の投稿があるときだけ
 * それを間に挟む。ランキングやおすすめのようなスコアリングは行わず、
 * 位置の入れ替えだけの単純な処理にとどめる。
 *
 * 「フォロー中」タブでは使わない（純粋な新しい順のまま）。
 */
const LOOKAHEAD = 5;

export function interleaveByUser<T extends { user_id: string }>(posts: T[]): T[] {
  const result = [...posts];

  for (let i = 1; i < result.length; i++) {
    if (result[i].user_id !== result[i - 1].user_id) continue;

    // 直前と同じ投稿者。近く（LOOKAHEAD件以内）に別の投稿者がいれば、
    // その投稿をここへ繰り上げる。見つからなければ無理に並び替えない。
    const limit = Math.min(result.length - 1, i + LOOKAHEAD);
    let swapIndex = -1;
    for (let j = i + 1; j <= limit; j++) {
      if (result[j].user_id !== result[i - 1].user_id) {
        swapIndex = j;
        break;
      }
    }

    if (swapIndex !== -1) {
      const [item] = result.splice(swapIndex, 1);
      result.splice(i, 0, item);
    }
  }

  return result;
}
