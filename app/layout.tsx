import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Drawing Checker – Bahnführungselemente Übersicht Korea 1",
  description: "Interactive machine drawing viewer for manroland press components.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
