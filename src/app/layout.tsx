import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "For My Favorite Workout Partner",
  description: "A romantic Tabata timer built as a gift.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="sv" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
