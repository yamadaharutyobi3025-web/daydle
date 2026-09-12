import type { Metadata, Viewport } from "next";
import { Shippori_Mincho } from "next/font/google";
import { AppChrome } from "@/components/AppChrome";
import "./globals.css";

const shippori = Shippori_Mincho({
  variable: "--font-shippori-mincho",
  weight: ["400", "600"],
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "DAYDLE（デイドル）",
  description: "ちゃんと、時間を無駄にしよう。1日1つ、今日の遠回りを届けるサービス。",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "DAYDLE",
  },
};

export const viewport: Viewport = {
  themeColor: "#f7f2e8",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ja" className={`${shippori.variable} h-full`}>
      <body className="bg-grain min-h-full flex flex-col bg-cream text-ink">
        <AppChrome>{children}</AppChrome>
      </body>
    </html>
  );
}
