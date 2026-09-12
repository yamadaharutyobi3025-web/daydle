import { formatJapaneseDate } from "@/lib/date";

/**
 * SNS共有用のDAYDLE CARDを、ブラウザ内のCanvasだけで生成する。
 * サーバーには何も送信しない（写真もIndexedDBから直接読む）。
 * 初期版は9:16（Instagram Storiesサイズ）のみ対応。
 */
const WIDTH = 1080;
const HEIGHT = 1920;
const MARGIN_X = 96;

const COLORS = {
  cream: "#f7f2e8",
  creamDeep: "#eee4d2",
  ink: "#36322b",
  inkSoft: "#6b6459",
  sageDeep: "#5f7756",
};

const SANS_FONT =
  'ui-sans-serif, system-ui, -apple-system, "Hiragino Kaku Gothic ProN", "Hiragino Sans", sans-serif';

export interface ShareCardInput {
  missionDescription: string;
  photoBlob: Blob | null;
  note: string | null;
  durationMinutes: number;
  phoneModeLabel: string;
  dateKey: string;
  detourNumber: number;
}

async function getSerifFont(): Promise<string> {
  if (typeof document === "undefined") return "serif";
  try {
    await document.fonts.ready;
  } catch {
    // フォントの待機に失敗しても、フォールバックフォントで描画を続ける
  }
  const raw = getComputedStyle(document.documentElement)
    .getPropertyValue("--font-shippori-mincho")
    .trim();
  return raw ? `${raw}, serif` : "serif";
}

function roundedRectPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.arcTo(x + w, y, x + w, y + r, r);
  ctx.lineTo(x + w, y + h - r);
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
  ctx.lineTo(x + r, y + h);
  ctx.arcTo(x, y + h, x, y + h - r, r);
  ctx.lineTo(x, y + r);
  ctx.arcTo(x, y, x + r, y, r);
  ctx.closePath();
}

/** 日本語には空白がないため、1文字ずつ測って折り返す。 */
function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number
): string[] {
  const lines: string[] = [];
  let current = "";
  for (const ch of text) {
    const next = current + ch;
    if (current && ctx.measureText(next).width > maxWidth) {
      lines.push(current);
      current = ch;
    } else {
      current = next;
    }
  }
  if (current) lines.push(current);
  return lines;
}

function drawCoverImage(
  ctx: CanvasRenderingContext2D,
  bitmap: ImageBitmap,
  x: number,
  y: number,
  w: number,
  h: number
) {
  const scale = Math.max(w / bitmap.width, h / bitmap.height);
  const sw = w / scale;
  const sh = h / scale;
  const sx = (bitmap.width - sw) / 2;
  const sy = (bitmap.height - sh) / 2;
  ctx.drawImage(bitmap, sx, sy, sw, sh, x, y, w, h);
}

/** 写真がない場合に、ヒーロー領域へ描く控えめな曲線モチーフ。 */
function drawCurve(ctx: CanvasRenderingContext2D, cx: number, cy: number, w: number) {
  const h = w * 0.22;
  const x0 = cx - w / 2;
  ctx.strokeStyle = "rgba(95, 119, 86, 0.35)";
  ctx.lineWidth = 5;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(x0, cy);
  ctx.bezierCurveTo(x0 + w * 0.22, cy, x0 + w * 0.28, cy - h, x0 + w * 0.46, cy - h * 0.4);
  ctx.bezierCurveTo(x0 + w * 0.62, cy + h * 0.2, x0 + w * 0.72, cy + h, x0 + w * 0.84, cy - h * 0.2);
  ctx.bezierCurveTo(x0 + w * 0.9, cy - h * 0.5, x0 + w * 0.95, cy - h * 0.3, x0 + w, cy);
  ctx.stroke();
}

export async function generateShareCard(input: ShareCardInput): Promise<Blob> {
  const canvas = document.createElement("canvas");
  canvas.width = WIDTH;
  canvas.height = HEIGHT;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D is not supported");

  const serifFont = await getSerifFont();
  const contentW = WIDTH - MARGIN_X * 2;

  ctx.fillStyle = COLORS.cream;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  // ヘッダー：DAYDLEロゴ + 日付
  ctx.textBaseline = "alphabetic";
  ctx.textAlign = "left";
  ctx.fillStyle = COLORS.ink;
  ctx.font = `700 32px ${SANS_FONT}`;
  ctx.fillText("D A Y D L E", MARGIN_X, 158);

  ctx.textAlign = "right";
  ctx.fillStyle = COLORS.inkSoft;
  ctx.font = `26px ${SANS_FONT}`;
  ctx.fillText(formatJapaneseDate(input.dateKey), WIDTH - MARGIN_X, 156);

  // ヒーロー領域：写真、なければ曲線モチーフ
  const heroY = 220;
  const heroH = 1040;
  roundedRectPath(ctx, MARGIN_X, heroY, contentW, heroH, 40);

  const bitmap = input.photoBlob ? await createImageBitmap(input.photoBlob) : null;
  if (bitmap) {
    ctx.save();
    ctx.clip();
    drawCoverImage(ctx, bitmap, MARGIN_X, heroY, contentW, heroH);
    ctx.restore();
    bitmap.close();
  } else {
    ctx.fillStyle = COLORS.creamDeep;
    ctx.fill();
    drawCurve(ctx, WIDTH / 2, heroY + heroH - 160, contentW * 0.55);
  }

  let cursorY = heroY + heroH + 100;

  // ラベル＋ミッション本文
  ctx.textAlign = "center";
  ctx.fillStyle = COLORS.sageDeep;
  ctx.font = `28px ${SANS_FONT}`;
  ctx.fillText("今日の遠回り", WIDTH / 2, cursorY);
  cursorY += 64;

  ctx.fillStyle = COLORS.ink;
  ctx.font = `44px ${serifFont}`;
  const missionLines = wrapText(ctx, input.missionDescription, contentW - 40).slice(0, 4);
  for (const line of missionLines) {
    ctx.fillText(line, WIDTH / 2, cursorY);
    cursorY += 68;
  }
  cursorY += 24;

  // ひとこと（あれば）
  if (input.note) {
    ctx.fillStyle = COLORS.inkSoft;
    ctx.font = `30px ${SANS_FONT}`;
    const noteLines = wrapText(ctx, `― ${input.note}`, contentW - 120).slice(0, 3);
    for (const line of noteLines) {
      ctx.fillText(line, WIDTH / 2, cursorY);
      cursorY += 44;
    }
  }

  // フッター：実行時間・PHONE MODE・DETOUR番号・タグライン（下端に固定）
  ctx.fillStyle = COLORS.inkSoft;
  ctx.font = `26px ${SANS_FONT}`;
  ctx.fillText(
    `${input.durationMinutes} MIN   ${input.phoneModeLabel}`,
    WIDTH / 2,
    HEIGHT - 220
  );

  ctx.fillStyle = COLORS.sageDeep;
  ctx.font = `600 26px ${SANS_FONT}`;
  ctx.fillText(`DETOUR #${String(input.detourNumber).padStart(2, "0")}`, WIDTH / 2, HEIGHT - 150);

  ctx.fillStyle = COLORS.inkSoft;
  ctx.font = `22px ${SANS_FONT}`;
  ctx.fillText("WASTE YOUR TIME WELL.", WIDTH / 2, HEIGHT - 90);

  return await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Failed to create image"))),
      "image/jpeg",
      0.92
    );
  });
}
