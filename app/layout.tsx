import type { Metadata, Viewport } from "next";
import "./globals.css";
import { AppShell } from "@/components/AppShell";

export const metadata: Metadata = {
  title: { default: "CulletIQ", template: "%s · CulletIQ" },
  description:
    "Image-based glass cullet colour estimation and visual screening. A decision-support prototype — not certified quality control.",
};

export const viewport: Viewport = {
  themeColor: "#22272a",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-GB">
      <body>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
