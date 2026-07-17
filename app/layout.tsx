import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = { title: "Vonga — Elegance Redefined", description: "Bespoke, made-to-measure fashion from the Vonga atelier in Pretoria. Ready-to-wear couture, tailoring and occasion wear, delivered nationwide." };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
