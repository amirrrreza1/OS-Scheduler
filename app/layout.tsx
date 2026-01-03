import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "شبیه‌ساز زمان‌بندی CPU",
  description: "مقایسه الگوریتم‌های زمان‌بندی سیستم‌عامل",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fa" dir="rtl" className={"dark"}>
      <body>{children}</body>
    </html>
  );
}
