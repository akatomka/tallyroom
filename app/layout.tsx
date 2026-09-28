import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Tallyroom",
  description: "Client document portal",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <header className="topbar">
          <span className="brand">Tallyroom</span>
        </header>
        <main className="container">{children}</main>
      </body>
    </html>
  );
}
