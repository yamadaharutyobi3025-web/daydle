/**
 * 「できた」写真は現在Supabase Storage（journal-photosバケット、
 * lib/journal.ts）が正となっている。ここに残っているのは、アカウント
 * 切り替え時にこの端末に残っている旧バージョンのIndexedDBデータを
 * 消すためのclearAllPhotos()だけ（lib/accountBoundary.ts経由で呼ばれる）。
 */
const DB_NAME = "daydle-photos";
const STORE_NAME = "photos";
const DB_VERSION = 1;

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("IndexedDB is not available"));
      return;
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(STORE_NAME)) {
        req.result.createObjectStore(STORE_NAME);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

/**
 * 保存済みの写真を全件削除する。
 * ログインアカウントが切り替わったとき（lib/accountBoundary.ts）に、
 * 前のアカウントの写真を次のアカウントへ持ち越さないようにするために使う。
 */
export async function clearAllPhotos(): Promise<void> {
  if (typeof indexedDB === "undefined") return;
  const db = await openDB();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).clear();
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}
