import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "DAYDLE（デイドル）",
    short_name: "DAYDLE",
    description: "ちゃんと、時間を無駄にしよう。1日1つ、今日の遠回りを届けるサービス。",
    start_url: "/",
    display: "standalone",
    background_color: "#f7f2e8",
    theme_color: "#f7f2e8",
    icons: [
      { src: "/icon-192", sizes: "192x192", type: "image/png" },
      { src: "/icon-512", sizes: "512x512", type: "image/png" },
    ],
  };
}
