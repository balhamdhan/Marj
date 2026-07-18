import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Marj — Operations & Financial Intelligence",
  description: "Unified operations and financial intelligence for Kuwait's SMEs.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
