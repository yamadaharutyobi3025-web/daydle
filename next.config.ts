import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // iPhoneなど同じWi-Fi上の別デバイスから "http://<MacのIP>:3001" で
  // 開発サーバーへアクセスした際、Next.jsが開発用アセット/HMR通信を
  // クロスオリジンとしてブロックすることがある（ホットリロードが効かず、
  // 古いビルドのまま固まって見える／一部の遷移が失敗する）。
  // ここではNextの許可パターン記法（ドットで区切った各セグメントを
  // 個別にワイルドカードできる）に沿って、家庭用Wi-Fiでよく使われる
  // プライベートIPレンジの末尾をワイルドカード指定している。
  allowedDevOrigins: ["192.168.*.*", "10.*.*.*", "172.16.*.*"],

  // 開発中に画面右下（等）に出るNext.jsのDev Tools「N」アイコンを非表示にする。
  // ビルド/実行時エラーの表示自体は引き続き行われる。
  devIndicators: false,
};

export default nextConfig;
