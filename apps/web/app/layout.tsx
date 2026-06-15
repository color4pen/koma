import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Koma",
  description: "予約・顧客管理パッケージ",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}
