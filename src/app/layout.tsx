import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Cascade Tuner: internal-first shift release for dental groups",
  description:
    "Independent PM prototype: tune how long a dental group holds open shifts for its own staff before releasing them to a staffing marketplace and vendors.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
