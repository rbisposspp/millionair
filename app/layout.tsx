import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Bobby Live ESL",
  description: "A Cloud Run-ready ESL classroom facilitator powered by Gemini.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
