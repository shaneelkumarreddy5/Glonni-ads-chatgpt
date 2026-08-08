import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Glonni Ads",
  description: "Watch, shop, play, and earn rewards with Glonni Ads.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
